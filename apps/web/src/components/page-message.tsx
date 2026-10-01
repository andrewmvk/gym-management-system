import type { ReactNode } from 'react';

export function PageMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="max-w-md font-display text-3xl leading-none font-extrabold text-balance uppercase">{title}</p>
      {children}
    </main>
  );
}
