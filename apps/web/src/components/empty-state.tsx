import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-md border-2 border-dashed border-foreground/25 text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <p className="font-display text-xl font-bold tracking-wide uppercase">{title}</p>
      {description && <p className="max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
