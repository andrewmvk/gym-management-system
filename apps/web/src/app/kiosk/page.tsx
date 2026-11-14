import type { Metadata } from 'next';
import { KioskPanel } from '@/app/kiosk/kiosk-panel';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Check-in') };
}

export default function KioskPage() {
  return <KioskPanel />;
}
