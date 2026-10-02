import { z } from 'zod';

export const TURNSTILE_METHODS = ['GET', 'POST', 'PUT'] as const;
export type TurnstileMethod = (typeof TURNSTILE_METHODS)[number];

export const TURNSTILE_PLACEHOLDERS = ['memberId', 'timestamp'] as const;
export type TurnstilePlaceholder = (typeof TURNSTILE_PLACEHOLDERS)[number];

export const TURNSTILE_MAX_HEADERS = 10;
export const TURNSTILE_MAX_BODY_LENGTH = 4000;

// Secret header values and query-string values are shown as this mask plus their last four characters.
export const SECRET_MASK = '••••';

const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export const TurnstileHeaderSchema = z.object({
  name: z.string().trim().min(1, 'Name the header').regex(HEADER_NAME_PATTERN, 'Not a valid header name'),
  value: z.string().trim().min(1, 'Give the header a value'),
  secret: z.boolean(),
});
export type TurnstileHeader = z.infer<typeof TurnstileHeaderSchema>;

const HttpUrlSchema = z
  .url('Enter a valid URL')
  .refine((value) => /^https?:\/\//i.test(value), 'The URL must start with http:// or https://');

function unknownPlaceholders(body: string) {
  return [...body.matchAll(PLACEHOLDER_PATTERN)]
    .map((match) => match[1]!)
    .filter((name) => !(TURNSTILE_PLACEHOLDERS as readonly string[]).includes(name));
}

export const UpdateTurnstileConfigInputSchema = z
  .object({
    method: z.enum(TURNSTILE_METHODS),
    url: z.string().trim().pipe(HttpUrlSchema),
    headers: z.array(TurnstileHeaderSchema).max(TURNSTILE_MAX_HEADERS, `Use at most ${TURNSTILE_MAX_HEADERS} headers`),
    bodyTemplate: z
      .string()
      .max(TURNSTILE_MAX_BODY_LENGTH, `Keep the body under ${TURNSTILE_MAX_BODY_LENGTH} characters`),
  })
  .superRefine((input, ctx) => {
    const names = input.headers.map((header) => header.name.toLowerCase());
    names.forEach((name, index) => {
      if (names.indexOf(name) !== index) {
        ctx.addIssue({ code: 'custom', path: ['headers', index, 'name'], message: 'This header is already set' });
      }
    });
    if (input.bodyTemplate.trim() !== '' && input.method === 'GET') {
      ctx.addIssue({ code: 'custom', path: ['bodyTemplate'], message: 'A GET request cannot have a body' });
    }
    const unknown = unknownPlaceholders(input.bodyTemplate);
    if (unknown.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['bodyTemplate'],
        message: `Unknown placeholder ${unknown.map((name) => `{{${name}}}`).join(', ')}. Use ${TURNSTILE_PLACEHOLDERS.map((name) => `{{${name}}}`).join(' or ')}`,
      });
    }
  });
export type UpdateTurnstileConfigInput = z.input<typeof UpdateTurnstileConfigInputSchema>;

export const CheckInInputSchema = z.object({ memberId: z.uuid() });
