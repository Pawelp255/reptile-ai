/**
 * POST /functions/v1/delete-account
 *
 * Permanently deletes the authenticated user's account and app-owned cloud data.
 * Requires Authorization: Bearer <user access token>.
 *
 * Body (optional): { "confirmEmail": "user@example.com" } — must match the signed-in user's email.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const REPTILE_PHOTO_BUCKET = "reptile-photos";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function authenticateRequest(req: Request): Promise<
  { ok: true; userId: string; email: string | undefined; admin: SupabaseClient } | { ok: false; response: Response }
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

  return { ok: true, userId: user.id, email: user.email, admin };
}

/** Recursively collect every object path under `{userId}/` in the private photo bucket. */
async function collectStoragePaths(
  admin: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage.from(REPTILE_PHOTO_BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Could not enumerate uploaded photos: ${error.message}`);
    if (!data?.length) break;

    for (const entry of data) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        paths.push(entryPath);
        continue;
      }
      paths.push(...await collectStoragePaths(admin, entryPath));
    }

    if (data.length < pageSize) break;
  }

  return paths;
}

async function deleteUserStorage(admin: SupabaseClient, userId: string): Promise<void> {
  const paths = await collectStoragePaths(admin, userId);
  if (!paths.length) return;

  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await admin.storage.from(REPTILE_PHOTO_BUCKET).remove(chunk);
    if (error) throw new Error(`Could not delete uploaded photos: ${error.message}`);
  }
}

async function deleteRows(admin: SupabaseClient, table: string, userId: string): Promise<void> {
  const { error } = await admin.from(table).delete().eq("user_id", userId);
  if (error) throw new Error(`Could not delete ${table}: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = await authenticateRequest(req);
  if (!auth.ok) return auth.response;

  let confirmEmail: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object" && typeof (body as { confirmEmail?: unknown }).confirmEmail === "string") {
      confirmEmail = (body as { confirmEmail: string }).confirmEmail.trim().toLowerCase();
    }
  } catch {
    /* empty body is fine */
  }

  const accountEmail = auth.email?.trim().toLowerCase();
  if (!accountEmail) {
    return json(400, { error: "Account email is required to confirm deletion." });
  }
  if (!confirmEmail || confirmEmail !== accountEmail) {
    return json(400, { error: "Email confirmation does not match this account." });
  }

  const { userId, admin } = auth;

  try {
    await deleteUserStorage(admin, userId);

    // Explicit cleanup ensures every app-owned table is removed before auth deletion.
    for (const table of [
      "public_share_records",
      "reptile_care_events",
      "reptile_care_tasks",
      "reptiles",
      "profiles",
    ]) {
      await deleteRows(admin, table, userId);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json(500, { error: "Could not delete account. Please try again or contact support." });
    }

    return json(200, { ok: true });
  } catch {
    return json(500, { error: "Account deletion failed. Please try again." });
  }
});
