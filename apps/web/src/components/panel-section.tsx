import type { ReactNode } from 'react';

export function PanelSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
