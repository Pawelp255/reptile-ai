/**
 * Local-only Pro AI chat persistence (this device). Not synced to cloud.
 */

import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { AIMessage } from '@/types';

export const PRO_AI_CHAT_MAX_STORED_MESSAGES = 20;
/** Bounded payload for Edge: message count cap (each side trimmed separately on server). */
export const PRO_AI_CHAT_MAX_SENT_MESSAGES = 12;
export const PRO_AI_CHAT_MAX_MESSAGE_CHARS = 2000;

export type AssistantConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

function storageKey(userId: string): string {
  return `reptilita-pro-ai-chat-v1:${userId}`;
}

async function resolveUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id?.trim() || null;
}

function trimStoredMessages(messages: AIMessage[]): AIMessage[] {
  if (messages.length <= PRO_AI_CHAT_MAX_STORED_MESSAGES) return messages;
  return messages.slice(-PRO_AI_CHAT_MAX_STORED_MESSAGES);
}

/** Never persist inline image data if something leaked into content. */
function sanitizeContentForStorage(content: string): string {
  return content.replace(/data:image\/[a-z0-9+.-]+;base64,[a-z0-9+/=\s]+/gi, '[image removed]');
}

/**
 * Persist Pro assistant messages. Drops empty assistant placeholders.
 */
export async function saveProAiChatMessages(messages: AIMessage[]): Promise<void> {
  const userId = await resolveUserId();
  if (!userId || typeof localStorage === 'undefined') return;

  const cleaned = messages.filter(
    (m) => m.role === 'user' || (m.role === 'assistant' && m.content.trim().length > 0),
  );
  const trimmed = trimStoredMessages(cleaned).map((m) => ({
    ...m,
    content: sanitizeContentForStorage(m.content),
  }));
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), messages: trimmed }),
    );
  } catch {
    /* quota / private mode */
  }
}

export async function loadProAiChatMessages(): Promise<AIMessage[]> {
  const userId = await resolveUserId();
  if (!userId || typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { messages?: AIMessage[] };
    if (!Array.isArray(parsed.messages)) return [];
    return parsed.messages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          typeof m.id === 'string',
      )
      .map((m) => ({
        ...m,
        timestamp: typeof m.timestamp === 'string' ? m.timestamp : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export async function clearProAiChatStorage(): Promise<void> {
  const userId = await resolveUserId();
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

/**
 * Build prior turns for Edge from completed messages (excludes in-flight empty assistant).
 */
export function buildConversationHistoryForEdge(priorMessages: AIMessage[]): AssistantConversationTurn[] {
  const complete = priorMessages.filter(
    (m) => m.content.trim().length > 0 && (m.role === 'user' || m.role === 'assistant'),
  );
  const slice = complete.slice(-PRO_AI_CHAT_MAX_SENT_MESSAGES);
  const out: AssistantConversationTurn[] = [];
  let totalChars = 0;
  const maxTotalChars = 8000;

  for (const m of slice) {
    const content = m.content.trim().slice(0, PRO_AI_CHAT_MAX_MESSAGE_CHARS);
    if (!content) continue;
    if (totalChars + content.length > maxTotalChars) break;
    out.push({ role: m.role, content });
    totalChars += content.length;
  }
  return out;
}
