import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Turnstile') };
}

export default function TurnstileSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
