import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Every page uses the same width as the header, so moving between pages never changes the frame.
export function PageContainer({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main className={cn('mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-8 pb-24 sm:px-6 sm:pt-10', className)}>
      {children}
    </main>
  );
}
