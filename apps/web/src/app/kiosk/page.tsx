import { ScanFaceIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { Brand } from '@/components/brand';

export const metadata: Metadata = { title: 'Check-in' };

export default function KioskPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <Brand className="scale-150" />
      <span className="flex size-40 items-center justify-center rounded-full border-2 border-dashed border-kit-muted/60 text-kit-muted">
        <ScanFaceIcon className="size-16" />
      </span>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none font-extrabold uppercase sm:text-7xl">Check-in panel</h1>
        <p className="text-lg text-kit-muted">Face check-in is not available yet.</p>
      </div>
    </main>
  );
}
