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

export type CompletionResult = { ok: true; content: string } | { ok: false };

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
    if (!response.ok) return { ok: false };

    const body = (await response.json()) as ChatCompletionBody;
    const content = body.choices?.[0]?.message?.content;
    return typeof content === 'string' ? { ok: true, content } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}
