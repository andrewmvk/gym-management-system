'use client';

import { useQuery } from '@tanstack/react-query';
import { DoorOpenIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { OverviewRow } from '@/app/(staff)/staff/overview-row';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { useTRPC } from '@/lib/trpc';

const REFRESH_INTERVAL_MS = 60_000;

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

// Admin only: a failed turnstile call never blocks a check-in, so this is where an admin sees the doors misbehaving.
function TurnstileStatusRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canRead = ability.can('read', 'CheckIn');
  const query = useQuery({
    ...trpc.checkins.turnstileSummary.queryOptions(),
    enabled: canRead,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  if (!canRead) return null;

  if (query.isPending) {
    return (
      <Deferred>
        <OverviewRow.Skeleton />
      </Deferred>
    );
  }

  if (!query.data) {
    return (
      <li className="p-5 sm:p-6">
        <QueryError
          title="We couldn't load the turnstile status"
          onRetry={() => query.refetch()}
          isRetrying={query.isRefetching}
        />
      </li>
    );
  }

  const { failedToday, totalToday, isConfigured } = query.data;
  const canConfigure = ability.can('manage', 'TurnstileConfig');

  let detail = `${failedToday} of ${totalToday} ${plural(totalToday, 'check-in', 'check-ins')} today did not open the turnstile.`;
  if (totalToday === 0) detail = 'No check-ins yet today.';
  else if (failedToday === 0)
    detail = `All ${totalToday} ${plural(totalToday, 'check-in', 'check-ins')} today opened the turnstile.`;
  if (!isConfigured) detail = 'Not configured: every check-in will show as failed.';

  return (
    <OverviewRow
      href={!isConfigured && canConfigure ? '/settings/turnstile' : '/checkins?result=failed'}
      icon={DoorOpenIcon}
      title="Turnstile"
      count={failedToday}
      detail={detail}
    />
  );
}

export const TurnstileStatus = Object.assign(TurnstileStatusRoot, { Skeleton: OverviewRow.Skeleton });
