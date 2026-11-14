import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Plan') };
}

export default function PlanLayout({ children }: { children: ReactNode }) {
  return children;
}
