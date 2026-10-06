'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardCheckIcon, MessageSquareIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { OverviewRow } from '@/app/(staff)/staff/overview-row';
import { TurnstileStatus } from '@/app/(staff)/staff/turnstile-status';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { formatDateTime, formatPlanDate } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';

const LIST_CLASS = 'divide-y overflow-hidden rounded-lg border bg-card';

interface ReviewReasons {
  blocked: readonly { name: string; equipmentDown: readonly string[] }[];
  risks: readonly { name: string }[];
}

// Why a plan is listed: the equipment that is down, the safety warning the member accepted, or both.
function describeReasons({ blocked, risks }: ReviewReasons) {
  const reasons: string[] = [];
  if (blocked.length > 0) {
    reasons.push(
      blocked
        .map((exercise) =>
          exercise.equipmentDown.length > 0 ? `${exercise.name} (${exercise.equipmentDown.join(', ')})` : exercise.name,
        )
        .join(', '),
    );
  }
  if (risks.length > 0) reasons.push(`safety warning accepted on ${risks.map((risk) => risk.name).join(', ')}`);
  return reasons.join('; ');
}

function OverviewBoardSkeleton() {
  const ability = useAppAbility();
  return (
    <ul className={LIST_CLASS}>
      <OverviewRow.Skeleton />
      <OverviewRow.Skeleton />
      {ability.can('read', 'CheckIn') && <OverviewRow.Skeleton />}
    </ul>
  );
}

// Lines that each open the page that owns them: plans that must be reviewed, plans a trainer touched
// recently, and (admin) failed turnstile check-ins.
function OverviewBoardRoot() {
  const trpc = useTRPC();
  const query = useQuery(trpc.reviews.overview.queryOptions());

  if (query.isPending) {
    return (
      <Deferred>
        <OverviewBoardSkeleton />
      </Deferred>
    );
  }

  if (!query.data) {
    return (
      <QueryError
        title="We couldn't load the overview"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const { needsReview, trainerActivity } = query.data;
  const first = needsReview[0];
  const latest = trainerActivity.latest;

  return (
    <ul className={LIST_CLASS}>
      <OverviewRow
        href="/reviews?status=must_review"
        icon={ClipboardCheckIcon}
        title="Must review"
        count={needsReview.length}
        detail={
          first
            ? `Next: ${first.memberName}, ${formatPlanDate(first.planDate)}, ${describeReasons(first)}.${needsReview.length > 1 ? ` ${needsReview.length - 1} more.` : ''}`
            : 'Every upcoming plan can be done with the equipment that is running, and no accepted safety warning is waiting for a trainer.'
        }
      />
      <OverviewRow
        href="/reviews?status=trainer_edited"
        icon={MessageSquareIcon}
        title="Trainer edits and notes"
        count={trainerActivity.planCount}
        detail={
          latest ? (
            <>
              Plans edited or noted in the last {trainerActivity.windowDays} days. Latest: {latest.authorName}{' '}
              {latest.isEdit ? 'edited' : 'noted'} {latest.memberName}&apos;s plan for {formatPlanDate(latest.planDate)}
              , <span className="numerals text-base">{formatDateTime(latest.createdAt)}</span>
            </>
          ) : (
            `No trainer has edited or left a note on a plan in the last ${trainerActivity.windowDays} days.`
          )
        }
      />
      <TurnstileStatus />
    </ul>
  );
}

export const OverviewBoard = Object.assign(OverviewBoardRoot, { Skeleton: OverviewBoardSkeleton });
