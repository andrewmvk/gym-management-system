import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StepPanelProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'negative' | 'pending';
  children?: ReactNode;
  className?: string;
}

const ICON_TONE = {
  default: 'bg-accent text-accent-foreground',
  negative: 'bg-destructive text-destructive-foreground',
  pending: 'border-2 border-dashed border-foreground/35 text-foreground',
} as const;

export function StepPanel({ title, description, icon: Icon, tone = 'default', children, className }: StepPanelProps) {
  return (
    <section className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-2">
        {Icon && (
          <span className={cn('mb-2 flex size-11 items-center justify-center rounded-md', ICON_TONE[tone])}>
            <Icon className="size-5" />
          </span>
        )}
        <h1 className="font-display text-2xl leading-none font-extrabold text-balance uppercase sm:text-3xl">
          {title}
        </h1>
        {description && <p className="text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
