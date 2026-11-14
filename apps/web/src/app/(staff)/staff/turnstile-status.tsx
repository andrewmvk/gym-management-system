'use client';

import { useQuery } from '@tanstack/react-query';
import { DoorOpenIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { OverviewRow } from '@/app/(staff)/staff/overview-row';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

const REFRESH_INTERVAL_MS = 60_000;

// Admin only: a failed turnstile call never blocks a check-in, so this is where an admin sees the doors misbehaving.
function TurnstileStatusRoot() {
  const { t } = useI18n();
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
          title={t("We couldn't load the turnstile status")}
          onRetry={() => query.refetch()}
          isRetrying={query.isRefetching}
        />
      </li>
    );
  }

  const { failedToday, totalToday, isConfigured } = query.data;
  const canConfigure = ability.can('manage', 'TurnstileConfig');

  let detail = t(
    totalToday === 1
      ? '{failed} of {total} check-in today did not open the turnstile.'
      : '{failed} of {total} check-ins today did not open the turnstile.',
    { failed: failedToday, total: totalToday },
  );
  if (totalToday === 0) detail = t('No check-ins yet today.');
  else if (failedToday === 0) {
    detail = t(
      totalToday === 1
        ? 'All {total} check-in today opened the turnstile.'
        : 'All {total} check-ins today opened the turnstile.',
      { total: totalToday },
    );
  }
  if (!isConfigured) detail = t('Not configured: every check-in will show as failed.');

  return (
    <OverviewRow
      href={!isConfigured && canConfigure ? '/settings/turnstile' : '/checkins?result=failed'}
      icon={DoorOpenIcon}
      title={t('Turnstile')}
      count={failedToday}
      detail={detail}
    />
  );
}

export const TurnstileStatus = Object.assign(TurnstileStatusRoot, { Skeleton: OverviewRow.Skeleton });
