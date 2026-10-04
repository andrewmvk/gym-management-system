'use client';

import { useQuery } from '@tanstack/react-query';
import { Deferred } from '@/components/deferred';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function ApiStatusSkeleton() {
  return <Skeleton className="h-5 w-28" aria-label="Checking the API" />;
}

function ApiStatusRoot() {
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
      {health.isError ? "We can't reach Cadence right now. Try again in a moment." : `API ${health.data.status}`}
    </p>
  );
}

export const ApiStatus = Object.assign(ApiStatusRoot, { Skeleton: ApiStatusSkeleton });
