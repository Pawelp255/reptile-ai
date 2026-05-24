/**
 * Pro assistant delivery: prefers Supabase Edge (`ai-assistant`) with app-owned OpenAI key,
 * falls back to a local chunked mock preview if the network or function fails.
 */

import {
  streamAiAssistantEdge,
  type AssistantAnimalPayload,
  type AssistantConversationHistoryItem,
  type AssistantVisionImagePayload,
} from '@/lib/ai/proAssistantApi';

async function delay(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function streamTextIncremental(
  text: string,
  onChunk: (chunk: string) => void,
  charStep = 14,
  delayMs = 26,
): Promise<void> {
  for (let i = 0; i < text.length; i += charStep) {
    onChunk(text.slice(i, Math.min(text.length, i + charStep)));
    await delay(delayMs);
  }
}

function buildMockAssistantBody(params: {
  userMessage: string;
  contextSummary?: string;
  animalName?: string | null;
  appContext?: Record<string, unknown>;
  hadVisionAttachment?: boolean;
  fallbackReason?: string;
}): string {
  const topic = params.userMessage.trim().slice(0, 220);
  const header = params.animalName
    ? `Here is a preview answer for ${params.animalName} while the assistant service reconnects:\n\n`
    : `Here is a preview answer while the assistant service reconnects:\n\n`;

  let body =
    `Cloud AI is unavailable. This is a local preview only.\n\n` +
    header +
    `You asked:\n"${topic}${params.userMessage.length > topic.length ? '…' : ''}"\n\n` +
    `— Double-check temps, humidity, and hides against a species-specific care sheet.\n` +
    `— Log feedings, weights, and sheds so trends are easy to spot in Reptilita.\n` +
    `— This reply is simulated offline because the cloud assistant was unavailable.\n\n` +
    `For emergencies, contact a reptile-experienced veterinarian right away.\n`;

  if (params.fallbackReason?.trim()) {
    body += `\nDetected fallback reason: ${params.fallbackReason.trim()}\n`;
  }

  if (params.contextSummary?.trim()) {
    const extra = params.animalName ? ` Context for ${params.animalName}.` : '';
    body += `\n(When online, your journals and tasks will help tailor cloud replies.${extra})`;
  }

  const meta = params.appContext?.meta as
    | {
        animalCount?: number;
        tasksDueToday?: number;
        tasksOverdue?: number;
        journalRecent14d?: number;
        imageUrlsAvailable?: number;
        imagesLocalOnly?: number;
      }
    | undefined;
  if (meta && typeof meta.animalCount === 'number') {
    body += `\n\n[Offline preview] Would sync context: ${meta.animalCount} animals`;
    if (typeof meta.tasksDueToday === 'number') body += ` · today ${meta.tasksDueToday}`;
    if (typeof meta.tasksOverdue === 'number') body += ` · overdue ${meta.tasksOverdue}`;
    if (typeof meta.journalRecent14d === 'number') body += ` · journal(14d) ${meta.journalRecent14d}`;
    if (typeof meta.imageUrlsAvailable === 'number' && typeof meta.imagesLocalOnly === 'number') {
      body += ` · images URL ${meta.imageUrlsAvailable} / local-only ${meta.imagesLocalOnly}`;
    }
    body += '.';
  }

  if (params.hadVisionAttachment) {
    body +=
      '\n\n[Offline preview] Photo analysis needs the cloud assistant; attach the same image again when you are online.';
  }

  return body;
}

export type ProAssistantStreamParams = {
  userMessage: string;
  contextSummary?: string;
  animalName?: string | null;
  animals?: AssistantAnimalPayload[];
  appContext?: Record<string, unknown>;
  conversationHistory?: AssistantConversationHistoryItem[];
  /** Single compressed attachment for this send only */
  image?: AssistantVisionImagePayload;
  /** When true (Pro), call Edge Function before mock fallback. */
  preferEdgeApi?: boolean;
  /** Dev diagnostics when cloud path falls back to local preview. */
  onFallbackInfo?: (info: { reason?: string; statusCode?: number; errorBody?: string }) => void;
};

/**
 * Streams to onChunk progressively, then invokes onDone or onError.
 */
export async function streamProAssistantReply(
  params: ProAssistantStreamParams,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): Promise<void> {
  let fallbackReason: string | undefined;
  if (params.preferEdgeApi) {
    const edged = await streamAiAssistantEdge(
      {
        message: params.userMessage,
        context: params.contextSummary,
        animals: params.animals,
        appContext: params.appContext,
        conversationHistory: params.conversationHistory,
        image: params.image,
        stream: true,
      },
      onChunk,
    );
    if (edged.kind === 'success') {
      onDone();
      return;
    }
    if (edged.kind === 'fatal') {
      onError(new Error(edged.message));
      return;
    }
    fallbackReason = edged.reason;
    params.onFallbackInfo?.({
      reason: edged.reason,
      statusCode: edged.statusCode,
      errorBody: edged.errorBody,
    });
    console.warn('[ai-assistant] Using local preview (edge unavailable).');
  }

  try {
    const full = buildMockAssistantBody({
      userMessage: params.userMessage,
      contextSummary: params.contextSummary,
      animalName: params.animalName,
      appContext: params.appContext,
      hadVisionAttachment: Boolean(params.image),
      fallbackReason,
    });
    await streamTextIncremental(full, onChunk);
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}
