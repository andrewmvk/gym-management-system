import { LOCALE_COOKIE, type Locale, parseLocale } from '@cadence/shared/schemas/locale';
import { cookies } from 'next/headers';
import { createTranslate, createTranslateNodes } from '@/lib/i18n/translate';

export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: createTranslate(locale), tn: createTranslateNodes(locale) };
}
