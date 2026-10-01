import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function KitBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header data-app-header className="sticky top-0 z-40 h-(--header-height) bg-kit text-kit-foreground">
      <div className={cn('mx-auto flex h-full w-full max-w-6xl items-center gap-2 px-4 sm:px-6', className)}>
        {children}
      </div>
    </header>
  );
}
