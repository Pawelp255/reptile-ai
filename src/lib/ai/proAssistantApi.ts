import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { resolveSupabaseUrl } from '@/integrations/supabase/env';

const FUNCTIONS_PATH = '/functions/v1/ai-assistant';

export type AssistantAnimalPayload = {
  id: string;
  name: string;
  species: string;
};

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
 * @returns `'success'` if the assistant returned a usable body; `'failed'` to trigger fallback.
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
    /** Default true → NDJSON stream from edge (OpenAI streaming). */
    stream?: boolean;
  },
  onChunk: (chunk: string) => void,
): Promise<'success' | 'failed'> {
  if (!isSupabaseConfigured || !supabase) return 'failed';

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return 'failed';

  const baseUrl = resolveSupabaseUrl().replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!baseUrl || !key) return 'failed';

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
        stream: params.stream !== false,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('[ai-assistant] Edge function error', response.status, detail.slice(0, 300));
      return 'failed';
    }

    const ct = response.headers.get('content-type') ?? '';

    if (ct.includes('ndjson')) {
      await readNdjsonTokenStream(response, onChunk);
      return 'success';
    }

    if (ct.includes('application/json')) {
      const parsed = (await response.json()) as { content?: string };
      const text = typeof parsed.content === 'string' ? parsed.content : '';
      if (text) onChunk(text);
      return 'success';
    }

    await readNdjsonTokenStream(response, onChunk);
    return 'success';
  } catch (e) {
    console.warn('[ai-assistant] Request failed', e);
    return 'failed';
  }
}
