import type { Metadata } from 'next';
import { KioskPanel } from '@/app/kiosk/kiosk-panel';

export const metadata: Metadata = { title: 'Check-in' };

export default function KioskPage() {
  return <KioskPanel />;
}
