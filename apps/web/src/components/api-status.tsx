'use client';

import { useQuery } from '@tanstack/react-query';
import { Deferred } from '@/components/deferred';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function ApiStatusSkeleton() {
  const { t } = useI18n();
  return <Skeleton className="h-5 w-28" aria-label={t('Checking the API')} />;
}

function ApiStatusRoot() {
  const { t } = useI18n();
  const trpc = useTRPC();
  const health = useQuery(trpc.system.health.queryOptions());

  if (health.isPending) {
    return (
      <Deferred>
        <ApiStatusSkeleton />
      </Deferred>
    );
  }

  const isUp = !health.isError;
  return (
    <p className={cn('inline-flex items-center gap-2 text-sm', isUp ? 'text-muted-foreground' : 'text-destructive')}>
      <span
        aria-hidden
        className={cn('size-2 rounded-full', isUp ? 'bg-success' : 'border border-dashed border-destructive')}
      />
      {health.isError
        ? t("We can't reach Cadence right now. Try again in a moment.")
        : t('API {status}', { status: health.data.status })}
    </p>
  );
}

export const ApiStatus = Object.assign(ApiStatusRoot, { Skeleton: ApiStatusSkeleton });
