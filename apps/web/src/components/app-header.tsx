'use client';

import { useQuery } from '@tanstack/react-query';
import { LogoutButton } from '@/components/logout-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';

export function AppHeader({ area }: { area: string }) {
  const trpc = useTRPC();
  const me = useQuery(trpc.auth.me.queryOptions());

  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-semibold">Cadence</span>
        <span className="truncate text-sm text-muted-foreground">{area}</span>
      </div>
      <div className="flex items-center gap-3">
        {me.isPending && <Skeleton className="hidden h-5 w-24 sm:block" />}
        {me.data && <span className="hidden text-sm text-muted-foreground sm:inline">{me.data.user.name}</span>}
        {me.data !== null && <LogoutButton />}
      </div>
    </header>
  );
}
