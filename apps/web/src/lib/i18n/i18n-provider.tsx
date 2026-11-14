'use client';

import type { Weekday } from '@cadence/shared/schemas/gym';
import { LOCALE_COOKIE, type Locale } from '@cadence/shared/schemas/locale';
import type { MuscleGroupId, MuscleId } from '@cadence/shared/schemas/muscles';
import type { ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatDate, formatDateTime, formatNumber, formatPlanDate, formatTime } from '@/lib/format';
import { factTypeLabel, groupLabel, muscleLabel, weekdayLabel } from '@/lib/i18n/labels';
import { createTranslate, createTranslateNodes, createTranslateText, htmlLang } from '@/lib/i18n/translate';

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function buildI18n(locale: Locale, setLocale: (next: Locale) => void) {
  return {
    locale,
    setLocale,
    t: createTranslate(locale),
    tx: createTranslateText(locale),
    tn: createTranslateNodes(locale),
    muscleLabel: (muscle: MuscleId) => muscleLabel(locale, muscle),
    groupLabel: (group: MuscleGroupId) => groupLabel(locale, group),
    factTypeLabel: (eventType: ProfileEventType) => factTypeLabel(locale, eventType),
    weekdayLabel: (day: Weekday) => weekdayLabel(locale, day),
    formatPlanDate: (isoDate: string, options?: Intl.DateTimeFormatOptions) => formatPlanDate(locale, isoDate, options),
    formatDateTime: (value: string | Date) => formatDateTime(locale, value),
    formatDate: (value: Date, options: Intl.DateTimeFormatOptions) => formatDate(locale, value, options),
    formatTime: (value: string | Date) => formatTime(locale, value),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
  };
}

export type I18n = ReturnType<typeof buildI18n>;

const I18nContext = createContext<I18n | null>(null);

// The server renders the first paint in the cookie's language, so there is no flash of the other one. A change
// writes the cookie, switches the client text at once and refreshes the server-rendered parts (page titles).
export function I18nProvider({ locale: serverLocale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(serverLocale);

  useEffect(() => setLocaleState(serverLocale), [serverLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing from older iOS Safari, and the server must read this cookie on the next request.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
      document.documentElement.lang = htmlLang(next);
      setLocaleState(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => buildI18n(locale, setLocale), [locale, setLocale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
