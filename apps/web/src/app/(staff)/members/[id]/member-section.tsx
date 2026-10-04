import type { ReactNode } from 'react';

interface MemberSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function MemberSection({ title, description, children }: MemberSectionProps) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
        {description && <div className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</div>}
      </div>
      {children}
    </section>
  );
}
