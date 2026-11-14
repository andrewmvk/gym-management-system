'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { filterQueue } from '@/app/(staff)/reviews/queue-filter';
import { useQueueFilters } from '@/app/(staff)/reviews/use-queue-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toIsoDate } from '@/lib/calendar-date';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

function PlanNeighborsSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

// Moves through the review queue in the order and with the filters the queue itself shows. A plan that is not in
// that list any more (its status changed, or the link came from elsewhere) simply has no neighbours.
function PlanNeighborsRoot({ planId }: { planId: string }) {
  const { t, formatPlanDate } = useI18n();
  const trpc = useTRPC();
  const queueQuery = useQuery(trpc.reviews.queue.queryOptions());
  const { status, term, when, search } = useQueueFilters();

  if (queueQuery.isPending) return <PlanNeighborsSkeleton />;
  if (queueQuery.isError) return null;

  const list = filterQueue(queueQuery.data, { status, when, term, today: toIsoDate(new Date()) });
  const index = list.findIndex((entry) => entry.id === planId);
  if (index === -1) return null;

  const previous = list[index - 1];
  const next = list[index + 1];
  const position = t('Plan {position} of {total} in the queue', { position: index + 1, total: list.length });

  return (
    <nav aria-label={t('Plans in the queue')} className="flex items-center justify-between gap-3">
      {previous ? (
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/reviews/${previous.id}${search}`}
            aria-label={t('Previous plan: {name}, {date}', {
              name: previous.memberName,
              date: formatPlanDate(previous.planDate),
            })}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            {t('Previous')}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeftIcon data-icon="inline-start" />
          {t('Previous')}
        </Button>
      )}
      <p className="numerals text-center text-base text-muted-foreground">{position}</p>
      {next ? (
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/reviews/${next.id}${search}`}
            aria-label={t('Next plan: {name}, {date}', {
              name: next.memberName,
              date: formatPlanDate(next.planDate),
            })}
          >
            {t('Next')}
            <ChevronRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {t('Next')}
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      )}
    </nav>
  );
}

export const PlanNeighbors = Object.assign(PlanNeighborsRoot, { Skeleton: PlanNeighborsSkeleton });
