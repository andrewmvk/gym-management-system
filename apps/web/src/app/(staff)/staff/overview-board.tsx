'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardCheckIcon, MessageSquareIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { OverviewRow } from '@/app/(staff)/staff/overview-row';
import { TurnstileStatus } from '@/app/(staff)/staff/turnstile-status';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

const LIST_CLASS = 'divide-y overflow-hidden rounded-lg border bg-card';

interface ReviewReasons {
  blocked: readonly { name: string; equipmentDown: readonly string[] }[];
  risks: readonly { name: string }[];
}

// Why a plan is listed: the equipment that is down, the safety warning the member accepted, or both.
function describeReasons({ t, tx }: I18n, { blocked, risks }: ReviewReasons) {
  const reasons: string[] = [];
  if (blocked.length > 0) {
    reasons.push(
      blocked
        .map((exercise) =>
          exercise.equipmentDown.length > 0
            ? t('{exercise} ({equipment})', {
                exercise: tx(exercise.name),
                equipment: exercise.equipmentDown.map((piece) => tx(piece)).join(', '),
              })
            : tx(exercise.name),
        )
        .join(', '),
    );
  }
  if (risks.length > 0) {
    const exercises = risks.map((risk) => tx(risk.name)).join(', ');
    reasons.push(t('safety warning accepted on {exercises}', { exercises }));
  }
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
  const i18n = useI18n();
  const { t, tn, formatDateTime, formatPlanDate } = i18n;
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
        title={t("We couldn't load the overview")}
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const { needsReview, trainerActivity } = query.data;
  const first = needsReview[0];
  const latest = trainerActivity.latest;
  const nextText = (plan: NonNullable<typeof first>) =>
    t('Next: {member}, {date}, {reasons}.', {
      member: plan.memberName,
      date: formatPlanDate(plan.planDate),
      reasons: describeReasons(i18n, plan),
    });

  return (
    <ul className={LIST_CLASS}>
      <OverviewRow
        href="/reviews?status=must_review"
        icon={ClipboardCheckIcon}
        title={t('Must review')}
        count={needsReview.length}
        detail={
          first
            ? `${nextText(first)}${needsReview.length > 1 ? ` ${t('{count} more.', { count: needsReview.length - 1 })}` : ''}`
            : t(
                'Every upcoming plan can be done with the equipment that is running, and no accepted safety warning is waiting for a trainer.',
              )
        }
      />
      <OverviewRow
        href="/reviews?status=trainer_edited"
        icon={MessageSquareIcon}
        title={t('Trainer edits and notes')}
        count={trainerActivity.planCount}
        detail={
          latest ? (
            <>
              {t('Plans edited or noted in the last {days} days.', { days: trainerActivity.windowDays })}{' '}
              {tn(
                latest.isEdit
                  ? "Latest: {author} edited {member}'s plan for {date}, {time}"
                  : "Latest: {author} noted {member}'s plan for {date}, {time}",
                {
                  author: latest.authorName,
                  member: latest.memberName,
                  date: formatPlanDate(latest.planDate),
                  time: <span className="numerals text-base">{formatDateTime(latest.createdAt)}</span>,
                },
              )}
            </>
          ) : (
            t('No trainer has edited or left a note on a plan in the last {days} days.', {
              days: trainerActivity.windowDays,
            })
          )
        }
      />
      <TurnstileStatus />
    </ul>
  );
}

export const OverviewBoard = Object.assign(OverviewBoardRoot, { Skeleton: OverviewBoardSkeleton });
