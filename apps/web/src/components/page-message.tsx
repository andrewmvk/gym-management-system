import type { ReactNode } from 'react';

export function PageMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-lg font-medium">{title}</p>
      {children}
    </main>
  );
}
