'use client';

import { RotateCwIcon, WifiOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

interface QueryErrorProps {
  title: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

// A failed load is a technical state, never an answer: it says so and always offers a retry.
export function QueryError({ title, onRetry, isRetrying, className }: QueryErrorProps) {
  const { t } = useI18n();

  return (
    <div
      role="alert"
      className={cn(
        'flex animate-in flex-col items-center gap-3 rounded-lg border-2 border-dashed border-destructive/50 px-4 py-10 text-center duration-300 fade-in-0',
        className,
      )}
    >
      <WifiOffIcon className="size-6 text-destructive" />
      <p className="font-display text-xl font-bold tracking-wide uppercase">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t('Something went wrong on our side or with the connection. Nothing was changed.')}
      </p>
      <Button variant="outline" className="mt-1" disabled={isRetrying} onClick={onRetry}>
        <RotateCwIcon data-icon="inline-start" />
        {isRetrying ? t('Retrying...') : t('Try again')}
      </Button>
    </div>
  );
}
