/**
 * POST /functions/v1/ai-assistant
 *
 * Body: { message: string, context?: string, animals?: Array<{ id, name?, species? }>, stream?: boolean }
 *
 * Supabase secrets (never sent to frontend):
 * - OPENAI_API_KEY — required after Pro gate passes.
 * - PRO_TEST_USER_IDS — optional comma-separated auth user UUIDs for staging QA when profiles.is_pro is false (see TODO below).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { REPTILE_CARE_SYSTEM_PROMPT } from "../_shared/reptilePrompt.ts";

const MODEL = "gpt-4o-mini";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONTEXT_MAX_CHARS = 24_000;
const ANIMALS_JSON_MAX_CHARS = 12_000;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function authenticateRequest(req: Request): Promise<
  { ok: true; userId: string; admin: SupabaseClient } | { ok: false; response: Response }
> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { ok: false, response: json(401, { error: "Missing or invalid Authorization header" }) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, response: json(500, { error: "Server configuration error" }) };
  }

  const jwt = auth.slice("Bearer ".length).trim();
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await admin.auth.getUser(jwt);
  if (error || !user) {
    return { ok: false, response: json(401, { error: "Invalid session" }) };
  }
  return { ok: true, userId: user.id, admin };
}

/**
 * Server-side Pro gate (do not trust the client or VITE_* env).
 *
 * 1) If public.profiles.is_pro is true for this user → allow.
 * 2) Else if PRO_TEST_USER_IDS contains this user's UUID → allow (temporary until billing sets is_pro).
 * 3) Else → 403 "Pro subscription required".
 *
 * TODO(billing): When subscription webhooks (Stripe/RevenueCat/etc.) are wired, write `profiles.is_pro`
 * from the backend and tighten or remove PRO_TEST_USER_IDS allowlist in production.
 */
async function assertProEntitlement(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const { data, error } = await admin.from("profiles").select("is_pro").eq("user_id", userId).maybeSingle();

  if (error) {
    console.warn(
      "[ai-assistant] profiles.is_pro lookup failed — apply migration 20260505120000_profiles_is_pro.sql?",
      error.message,
    );
  } else if (data?.is_pro === true) {
    return { ok: true };
  }

  const raw = Deno.env.get("PRO_TEST_USER_IDS")?.trim() ?? "";
  const allowlisted = raw.length > 0 &&
    new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)).has(userId);
  if (allowlisted) {
    return { ok: true };
  }

  return { ok: false, response: json(403, { error: "Pro subscription required" }) };
}

function buildUserContent(
  message: string,
  context?: string,
  animals?: unknown,
): string {
  const trimmedContext = typeof context === "string"
    ? context.slice(0, CONTEXT_MAX_CHARS)
    : "";

  let animalsLine = "";
  if (animals !== undefined && animals !== null) {
    try {
      const serialized = typeof animals === "string" ? animals : JSON.stringify(animals);
      animalsLine = serialized.slice(0, ANIMALS_JSON_MAX_CHARS);
    } catch {
      animalsLine = "";
    }
  }

  const parts: string[] = [`User question:\n${message}`];
  if (trimmedContext) {
    parts.push(`Additional context exported from the Reptilita app:\n${trimmedContext}`);
  }
  if (animalsLine) {
    parts.push(`Animals referenced / collection snapshot (subset, JSON):\n${animalsLine}`);
  }

  return parts.join("\n\n");
}

function transformOpenAiSseToNdjson(upstreamBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let carry = "";

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          const lines = carry.split(/\r?\n/);
          carry = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.replace(/^data:\s*/, "").trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const piece = json.choices?.[0]?.delta?.content;
              if (piece) {
                controller.enqueue(new TextEncoder().encode(JSON.stringify({ c: piece }) + "\n"));
              }
            } catch {
              // ignore incomplete JSON lines from OpenAI buffers
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }

      controller.close();
    },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) return auth.response;

  const proGate = await assertProEntitlement(auth.admin, auth.userId);
  if (!proGate.ok) return proGate.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return json(400, { error: "message is required" });
  }

  const stream = Boolean(body.stream);
  const context = typeof body.context === "string" ? body.context : undefined;
  const animals = body.animals;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey?.trim()) {
    return json(503, { error: "Assistant is not configured (missing OPENAI_API_KEY secret)" });
  }

  const userContent = buildUserContent(message, context, animals);
  const messages = [
    { role: "system" as const, content: REPTILE_CARE_SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream,
      temperature: 0.6,
      max_tokens: 2000,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => upstream.statusText);
    console.error("[ai-assistant] OpenAI error", upstream.status, errText.slice(0, 500));
    return json(502, { error: "Assistant request failed", detail: upstream.status });
  }

  if (stream && upstream.body) {
    const outBody = transformOpenAiSseToNdjson(upstream.body);
    return new Response(outBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  }

  const data = await upstream.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return json(200, { content: text, model: MODEL });
}

Deno.serve(handler);
