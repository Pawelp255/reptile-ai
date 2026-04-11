// OpenAI Responses API Client with streaming support

import type { ModelId } from './models';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIError {
  type: 'invalid_key' | 'rate_limit' | 'server_error' | 'network' | 'unknown';
  message: string;
}

export interface OpenAIResponse {
  success: boolean;
  content?: string;
  error?: OpenAIError;
}

interface OpenAIErrorPayload {
  error?: {
    message?: string;
  };
}

interface ResponseOutputContent {
  type?: string;
  text?: string;
}

interface ResponseOutputItem {
  type?: string;
  content?: ResponseOutputContent[];
}

interface ResponsesPayload {
  output?: ResponseOutputItem[];
}

interface StreamEventPayload {
  type?: string;
  delta?: string;
  message?: string;
}

// Map HTTP status to error type
function mapErrorStatus(status: number, errorData: OpenAIErrorPayload): OpenAIError {
  if (status === 401) {
    return { type: 'invalid_key', message: 'Invalid API key. Please check your OpenAI API key in Settings.' };
  }
  if (status === 429) {
    return { type: 'rate_limit', message: 'Rate limit exceeded. Please wait a moment and try again.' };
  }
  if (status >= 500) {
    return { type: 'server_error', message: `OpenAI server error (${status}). Please try again later.` };
  }
  return { type: 'unknown', message: errorData?.error?.message || `Request failed with status ${status}` };
}

// Convert ChatMessage[] to Responses API input format
function buildInput(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return messages.map(m => ({ role: m.role, content: m.content }));
}

// Estimate token count (rough: ~4 chars per token)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Non-streaming Responses API call
export async function sendResponse(
  apiKey: string,
  model: ModelId,
  messages: ChatMessage[],
): Promise<OpenAIResponse> {
  if (!apiKey?.trim()) {
    return { success: false, error: { type: 'invalid_key', message: 'API key is required.' } };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildInput(messages),
        max_output_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: mapErrorStatus(response.status, errorData) };
    }

    const data = await response.json() as ResponsesPayload;
    // Responses API returns output array with message items
    const outputText = data.output
      ?.filter((item) => item.type === 'message')
      ?.flatMap((item) => item.content ?? [])
      ?.filter((c) => c.type === 'output_text')
      ?.map((c) => c.text ?? '')
      ?.join('') || '';

    if (!outputText) {
      return { success: false, error: { type: 'unknown', message: 'No response content received.' } };
    }

    return { success: true, content: outputText };
  } catch (error) {
    return {
      success: false,
      error: { type: 'network', message: error instanceof Error ? error.message : 'Network error.' },
    };
  }
}

// Streaming Responses API call
export async function sendStreamingResponse(
  apiKey: string,
  model: ModelId,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: OpenAIError) => void,
): Promise<void> {
  if (!apiKey?.trim()) {
    onError({ type: 'invalid_key', message: 'API key is required.' });
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildInput(messages),
        max_output_tokens: 2000,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      onError(mapErrorStatus(response.status, errorData));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError({ type: 'unknown', message: 'No response body.' });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const event = JSON.parse(jsonStr) as StreamEventPayload;
          // Handle response.output_text.delta events
          if (event.type === 'response.output_text.delta' && event.delta) {
            onChunk(event.delta);
          }
          // Handle response.completed 
          if (event.type === 'response.completed') {
            onDone();
            return;
          }
          // Handle errors in stream
          if (event.type === 'error') {
            onError({ type: 'unknown', message: event.message || 'Stream error' });
            return;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    onDone();
  } catch (error) {
    onError({
      type: 'network',
      message: error instanceof Error ? error.message : 'Network error.',
    });
  }
}

// Validate API key with a minimal request
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [{ role: 'user', content: 'Hi' }],
        max_output_tokens: 1,
      }),
    });
    return response.ok || response.status === 429;
  } catch {
    return false;
  }
}
