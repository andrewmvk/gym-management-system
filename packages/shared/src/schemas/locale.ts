import { z } from 'zod';

export const LOCALES = ['pt', 'en'] as const;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

export const DEFAULT_LOCALE: Locale = 'pt';

// Not httpOnly: the browser sets it when the person picks a language, and both the web server (to render the
// first paint in that language) and the API (to make the coach answer in it) read it from the request.
export const LOCALE_COOKIE = 'cadence-locale';

export function parseLocale(value: unknown): Locale {
  const parsed = LocaleSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_LOCALE;
}
