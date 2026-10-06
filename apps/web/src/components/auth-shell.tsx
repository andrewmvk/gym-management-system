import Link from 'next/link';
import type { ReactNode } from 'react';
import { Brand } from '@/components/brand';

interface AuthShellProps {
  tagline: string;
  subline: string;
  footer: ReactNode;
  children: ReactNode;
}

// Nobody on these pages has access to the app yet, so there is no app header: just the brand and the task.
export function AuthShell({ tagline, subline, footer, children }: AuthShellProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg overflow-clip rounded-lg border bg-card shadow-showcase">
        <div className="kit-corner flex flex-col gap-5 bg-kit px-5 pt-5 pr-24 pb-6 text-kit-foreground sm:px-8 sm:pr-28">
          <Link href="/" className="w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Brand />
          </Link>
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-4xl leading-none font-extrabold text-balance uppercase sm:text-5xl">
              {tagline}
            </p>
            <p className="text-sm text-pretty text-kit-muted">{subline}</p>
          </div>
        </div>
        <div className="p-5 sm:p-8">{children}</div>
      </div>
      <p className="text-sm text-muted-foreground">{footer}</p>
    </main>
  );
}
