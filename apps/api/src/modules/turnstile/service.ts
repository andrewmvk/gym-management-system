import type { TurnstileConfig } from '@api/db/schema';
import { logger } from '@api/lib/logger';
import * as repository from '@api/modules/turnstile/repository';
import {
  SECRET_MASK,
  type TurnstileHeader,
  type TurnstileMethod,
  type TurnstilePlaceholder,
} from '@cadence/shared/schemas/turnstile';

export const TURNSTILE_TIMEOUT_MS = 5000;

const MAX_BODY_CHARS = 2000;
const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g;
const QUERY_VALUE_PATTERN = /([?&][^=&#]*=)([^&#]*)/g;

export type TurnstileFailureReason = 'not_configured' | 'http_error' | 'timeout' | 'network_error';

export interface TurnstileCallResponse {
  httpStatus: number;
  body: unknown;
}

export type UnlockResult =
  | { status: 'success'; response: TurnstileCallResponse }
  | { status: 'failed'; response: TurnstileCallResponse | null; error: TurnstileFailureReason };

export interface UnlockOptions {
  timeoutMs?: number;
}

export function maskSecret(value: string) {
  return `${SECRET_MASK}${value.length > 4 ? value.slice(-4) : ''}`;
}

// The URL may carry a key in its query string, so only the query values are masked: the host and path stay editable.
export function maskUrl(url: string) {
  return url.replace(QUERY_VALUE_PATTERN, (_match, prefix: string, value: string) =>
    value === '' ? prefix : `${prefix}${maskSecret(value)}`,
  );
}

function queryValues(url: string) {
  return new Map([...url.matchAll(QUERY_VALUE_PATTERN)].map((match) => [match[1]!, match[2]!]));
}

// A masked value sent back unchanged means "keep what is stored"; anything else replaces it.
function restoreMaskedQueryValues(submittedUrl: string, storedUrl: string) {
  const stored = queryValues(storedUrl);
  return submittedUrl.replace(QUERY_VALUE_PATTERN, (match, prefix: string, value: string) => {
    const storedValue = stored.get(prefix);
    return storedValue !== undefined && storedValue !== '' && value === maskSecret(storedValue)
      ? `${prefix}${storedValue}`
      : match;
  });
}

function restoreMaskedHeaders(submitted: TurnstileHeader[], stored: TurnstileHeader[]) {
  return submitted.map((header) => {
    const current = stored.find((item) => item.name.toLowerCase() === header.name.toLowerCase());
    return header.secret && current?.secret && header.value === maskSecret(current.value)
      ? { ...header, value: current.value }
      : header;
  });
}

export function isConfigured(config: Pick<TurnstileConfig, 'url'>) {
  return config.url !== '';
}

function buildBody(method: TurnstileMethod, template: string, values: Record<TurnstilePlaceholder, string>) {
  if (method === 'GET' || template.trim() === '') return undefined;
  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) => values[name as TurnstilePlaceholder] ?? match);
}

async function readBody(response: Response): Promise<unknown> {
  const text = (await response.text().catch(() => '')).slice(0, MAX_BODY_CHARS);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// A turnstile failure is data, never an exception: the caller always records the check-in (RN-09).
export async function unlockTurnstile(
  { memberId }: { memberId: string },
  { timeoutMs = TURNSTILE_TIMEOUT_MS }: UnlockOptions = {},
): Promise<UnlockResult> {
  let config: TurnstileConfig;
  try {
    config = await repository.getOrCreateConfig();
  } catch (error) {
    logger.warn({ err: error }, 'turnstile config could not be read');
    return { status: 'failed', response: null, error: 'not_configured' };
  }
  if (!isConfigured(config)) return { status: 'failed', response: null, error: 'not_configured' };

  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: Object.fromEntries(config.headers.map((header) => [header.name, header.value])),
      body: buildBody(config.method, config.bodyTemplate, { memberId, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const result = { httpStatus: response.status, body: await readBody(response) };
    if (!response.ok) {
      logger.warn({ memberId, httpStatus: response.status }, 'turnstile call failed');
      return { status: 'failed', response: result, error: 'http_error' };
    }
    return { status: 'success', response: result };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    logger.warn({ memberId, reason: isTimeout ? 'timeout' : 'network_error' }, 'turnstile call failed');
    return { status: 'failed', response: null, error: isTimeout ? 'timeout' : 'network_error' };
  }
}

// Sends the saved request for real, so it opens the turnstile, but records no check-in.
export function testConnection(userId: string, options?: UnlockOptions) {
  return unlockTurnstile({ memberId: userId }, options);
}

export async function getConfig() {
  const config = await repository.getOrCreateConfig();
  return {
    method: config.method,
    url: maskUrl(config.url),
    headers: config.headers.map((header) => (header.secret ? { ...header, value: maskSecret(header.value) } : header)),
    bodyTemplate: config.bodyTemplate,
    isConfigured: isConfigured(config),
    updatedAt: config.updatedAt,
  };
}

export async function updateConfig(input: {
  method: TurnstileMethod;
  url: string;
  headers: TurnstileHeader[];
  bodyTemplate: string;
  updatedByUserId: string;
}) {
  const current = await repository.getOrCreateConfig();
  await repository.updateConfig({
    ...input,
    url: restoreMaskedQueryValues(input.url, current.url),
    headers: restoreMaskedHeaders(input.headers, current.headers),
  });
  return getConfig();
}
