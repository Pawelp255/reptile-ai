/**
 * Pro assistant delivery: prefers Supabase Edge (`ai-assistant`) with app-owned OpenAI key,
 * falls back to a local chunked mock preview if the network or function fails.
 */

import { streamAiAssistantEdge, type AssistantAnimalPayload } from '@/lib/ai/proAssistantApi';

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
}): string {
  const topic = params.userMessage.trim().slice(0, 220);
  const header = params.animalName
    ? `Here is a preview answer for ${params.animalName} while the assistant service reconnects:\n\n`
    : `Here is a preview answer while the assistant service reconnects:\n\n`;

  let body =
    header +
    `You asked:\n"${topic}${params.userMessage.length > topic.length ? '…' : ''}"\n\n` +
    `— Double-check temps, humidity, and hides against a species-specific care sheet.\n` +
    `— Log feedings, weights, and sheds so trends are easy to spot in Reptilita.\n` +
    `— This reply is simulated offline because the cloud assistant was unavailable.\n\n` +
    `For emergencies, contact a reptile-experienced veterinarian right away.\n`;

  if (params.contextSummary?.trim()) {
    const extra = params.animalName ? ` Context for ${params.animalName}.` : '';
    body += `\n(When online, your journals and tasks will help tailor cloud replies.${extra})`;
  }

  return body;
}

export type ProAssistantStreamParams = {
  userMessage: string;
  contextSummary?: string;
  animalName?: string | null;
  animals?: AssistantAnimalPayload[];
  /** When true (Pro), call Edge Function before mock fallback. */
  preferEdgeApi?: boolean;
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
  if (params.preferEdgeApi) {
    const edged = await streamAiAssistantEdge(
      {
        message: params.userMessage,
        context: params.contextSummary,
        animals: params.animals,
        stream: true,
      },
      onChunk,
    );
    if (edged === 'success') {
      onDone();
      return;
    }
    console.warn('[ai-assistant] Using local preview (edge unavailable).');
  }

  try {
    const full = buildMockAssistantBody(params);
    await streamTextIncremental(full, onChunk);
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}
