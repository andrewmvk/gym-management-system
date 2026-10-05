const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const AI_REQUEST_TIMEOUT_MS = 30_000;

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
}

export interface CompletionRequest {
  system: string;
  user: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// cause is a short, non-sensitive label (timeout, network_error, http_429, ...) that only reaches the logs.
export type CompletionResult = { ok: true; content: string } | { ok: false; cause: string };

export type StreamEnd = { ok: true } | { ok: false; cause: string };

interface StreamChunkBody {
  choices?: { delta?: { content?: unknown } }[];
  error?: unknown;
}

interface ChatCompletionBody {
  choices?: { message?: { content?: unknown } }[];
}

export async function requestCompletion(
  config: OpenRouterConfig,
  request: CompletionRequest,
): Promise<CompletionResult> {
  const doFetch = config.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await doFetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, cause: `http_${response.status}` };

    const body = (await response.json()) as ChatCompletionBody;
    const content = body.choices?.[0]?.message?.content;
    return typeof content === 'string' ? { ok: true, content } : { ok: false, cause: 'empty_response' };
  } catch {
    return { ok: false, cause: controller.signal.aborted ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

// Yields the text of each streamed chunk and returns how the stream ended. The timeout is an idle one: it
// restarts with every chunk, so a long answer that keeps arriving is never cut off.
export async function* streamCompletion(
  config: OpenRouterConfig,
  messages: readonly ConversationMessage[],
): AsyncGenerator<string, StreamEnd> {
  const doFetch = config.fetch ?? fetch;
  const controller = new AbortController();
  let timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  const restartTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  };

  try {
    const response = await doFetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: 'json_object' },
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, cause: `http_${response.status}` };
    if (!response.body) return { ok: false, cause: 'empty_response' };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let hasContent = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      restartTimeout();
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice('data:'.length).trim();
        if (payload === '[DONE]') return hasContent ? { ok: true } : { ok: false, cause: 'empty_response' };

        let body: StreamChunkBody;
        try {
          body = JSON.parse(payload) as StreamChunkBody;
        } catch {
          continue;
        }
        if (body.error) return { ok: false, cause: 'stream_error' };
        const text = body.choices?.[0]?.delta?.content;
        if (typeof text === 'string' && text.length > 0) {
          hasContent = true;
          yield text;
        }
      }
    }
    return hasContent ? { ok: true } : { ok: false, cause: 'empty_response' };
  } catch {
    return { ok: false, cause: controller.signal.aborted ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}
