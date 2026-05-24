import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { resolveSupabaseUrl } from '@/integrations/supabase/env';

const FUNCTIONS_PATH = '/functions/v1/ai-assistant';

export type AssistantAnimalPayload = {
  id: string;
  name: string;
  species: string;
};

export type AssistantVisionImagePayload = {
  mimeType: string;
  /** Base64 only, no data: prefix */
  base64Data: string;
};

export type AiAssistantEdgeOutcome =
  | { kind: 'success' }
  /** Network / 5xx / unparsed errors — caller may fall back to mock */
  | { kind: 'recoverable'; reason?: string; statusCode?: number; errorBody?: string }
  /** Client/validation errors (e.g. image too large) — do not mock over */
  | { kind: 'fatal'; message: string };

async function readNdjsonTokenStream(response: Response, onChunk: (s: string) => void): Promise<void> {
  const body = response.body;
  if (!body) throw new Error('Empty response body');

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        try {
          const { c } = JSON.parse(t) as { c?: string };
          if (c) onChunk(c);
        } catch {
          /* ignore malformed fragments */
        }
      }
    }
    if (buffer.trim()) {
      try {
        const { c } = JSON.parse(buffer.trim()) as { c?: string };
        if (c) onChunk(c);
      } catch {
        /* trailing partial line */
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Calls Supabase Edge Function `ai-assistant`. OpenAI credentials stay on the server.
 */
export type AssistantConversationHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export async function streamAiAssistantEdge(
  params: {
    message: string;
    context?: string;
    animals?: AssistantAnimalPayload[];
    /** Structured snapshot (animals, tasks, journal, breeding). Server-truncated. */
    appContext?: Record<string, unknown>;
    /** Prior turns (this device only). Server-capped; latest message carries full snapshot. */
    conversationHistory?: AssistantConversationHistoryItem[];
    /** Single user-selected image for this message only (compressed client-side). */
    image?: AssistantVisionImagePayload;
    /** Default true → NDJSON stream from edge (OpenAI streaming). */
    stream?: boolean;
  },
  onChunk: (chunk: string) => void,
): Promise<AiAssistantEdgeOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { kind: 'recoverable', reason: 'Supabase is not configured in this build.' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { kind: 'recoverable', reason: 'No active signed-in session token.' };

  const baseUrl = resolveSupabaseUrl().replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!baseUrl || !key) {
    return { kind: 'recoverable', reason: 'Missing Supabase base URL or publishable key.' };
  }

  try {
    const response = await fetch(`${baseUrl}${FUNCTIONS_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: params.message,
        context: params.context,
        animals: params.animals,
        appContext: params.appContext,
        conversationHistory: params.conversationHistory,
        image: params.image,
        stream: params.stream !== false,
      }),
    });

    const detail = await response.text().catch(() => '');
    if (!response.ok) {
      let parsedError = '';
      try {
        const j = JSON.parse(detail) as { error?: string };
        if (typeof j.error === 'string' && j.error.trim()) parsedError = j.error.trim();
      } catch {
        /* not JSON */
      }
      const bodySnippet = detail.slice(0, 800).trim();
      if ([401, 403, 413, 500].includes(response.status)) {
        console.error('[ai-assistant] Edge function HTTP error', {
          status: response.status,
          body: bodySnippet || '(empty body)',
        });
      } else {
        console.warn('[ai-assistant] Edge function error', response.status, bodySnippet);
      }

      if (response.status === 400 || response.status === 413 || response.status === 422) {
        return {
          kind: 'fatal',
          message: parsedError || `Request was rejected (${response.status}).`,
        };
      }
      const reasonDetail = parsedError || bodySnippet || 'No error body.';
      return {
        kind: 'recoverable',
        reason: `Edge request failed with HTTP ${response.status}: ${reasonDetail}`,
        statusCode: response.status,
        errorBody: bodySnippet || undefined,
      };
    }

    const ct = response.headers.get('content-type') ?? '';

    if (ct.includes('ndjson')) {
      await readNdjsonTokenStream(response, onChunk);
      return { kind: 'success' };
    }

    if (ct.includes('application/json')) {
      const parsed = (await response.json()) as { content?: string };
      const text = typeof parsed.content === 'string' ? parsed.content : '';
      if (text) onChunk(text);
      return { kind: 'success' };
    }

    await readNdjsonTokenStream(response, onChunk);
    return { kind: 'success' };
  } catch (e) {
    console.warn('[ai-assistant] Request failed', e);
    return { kind: 'recoverable', reason: e instanceof Error ? e.message : 'Network request failed.' };
  }
}
