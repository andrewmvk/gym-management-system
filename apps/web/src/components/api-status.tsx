'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';

function ApiStatusSkeleton() {
  return <Skeleton className="h-5 w-28" aria-label="Checking the API" />;
}

function ApiStatusRoot() {
  const trpc = useTRPC();
  const health = useQuery(trpc.system.health.queryOptions());

  if (health.isPending) return <ApiStatusSkeleton />;

  if (health.isError) {
    return <p className="text-sm text-destructive">The API is unreachable. Is the backend running?</p>;
  }

  return <p className="text-sm text-muted-foreground">API status: {health.data.status}</p>;
}

export const ApiStatus = Object.assign(ApiStatusRoot, { Skeleton: ApiStatusSkeleton });
