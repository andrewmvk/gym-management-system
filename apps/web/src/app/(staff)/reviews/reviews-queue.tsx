'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon, ClipboardListIcon, SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import {
  filterQueue,
  matchesStatus,
  matchesWhen,
  queueSearch,
  resolveWhen,
  STATUS_FILTERS,
  type StatusFilter,
  WHEN_FILTERS,
  WHEN_LABELS,
  WHEN_PARAMS,
  type WhenFilter,
  type WhenParam,
} from '@/app/(staff)/reviews/queue-filter';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { Pagination } from '@/components/pagination';
import { PlanStatusBadge } from '@/components/plan-status-badge';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { toIsoDate } from '@/lib/calendar-date';
import { useI18n } from '@/lib/i18n/i18n-provider';
import type { LabelKey } from '@/lib/i18n/translate';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 10;

const WHEN_SCOPE_PHRASES: Record<WhenFilter, LabelKey | ''> = {
  upcoming: 'dated today or later',
  past: 'dated before today',
  all: '',
};

function QueueHead() {
  const { t } = useI18n();
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{t('Member')}</TableHead>
        <TableHead className="hidden sm:table-cell">{t('Plan date')}</TableHead>
        <TableHead>{t('review::Status')}</TableHead>
        <TableHead className="hidden lg:table-cell">{t('Last note')}</TableHead>
        <TableHead className="w-10">
          <span className="sr-only">{t('review::Open')}</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ReviewsQueueSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <Skeleton className="h-10 w-full lg:w-72" />
        <FilterBar.Trailing>
          <Skeleton className="h-10.5 w-full lg:w-72" />
          <Skeleton className="h-10.5 w-full lg:w-96" />
        </FilterBar.Trailing>
      </FilterBar>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <QueueHead />
          <TableBody>
            {Array.from({ length: 6 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-1 h-4 w-20 sm:hidden" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-28" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-56" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ReviewsQueueRoot() {
  const { t, tn, formatPlanDate } = useI18n();
  const trpc = useTRPC();
  const queueQuery = useQuery(trpc.reviews.queue.queryOptions());
  const [search, setSearch] = useUrlState<string>('q', '');
  const [status, setStatus] = useUrlState<StatusFilter>('status', 'all', oneOf(STATUS_FILTERS));
  const [whenParam, setWhenParam] = useUrlState<WhenParam>('when', 'auto', oneOf(WHEN_PARAMS));
  const when = resolveWhen(whenParam, status);
  const today = toIsoDate(new Date());

  const entries = queueQuery.data ?? [];
  const filtered = filterQueue(entries, { status, when, term: search, today });
  const pagination = usePagination(filtered, PAGE_SIZE);
  const detailSearch = queueSearch({ status, q: search, when: whenParam });

  if (queueQuery.isPending) {
    return (
      <Deferred>
        <ReviewsQueueSkeleton />
      </Deferred>
    );
  }

  if (queueQuery.isError) {
    return (
      <QueryError
        title={t("We couldn't load the queue")}
        onRetry={() => queueQuery.refetch()}
        isRetrying={queueQuery.isRefetching}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={ClipboardListIcon}
          title={t('No plans yet')}
          description={t("Plans show up here as soon as members generate them. There's nothing waiting on you.")}
        />
      </div>
    );
  }

  const inScope = entries.filter((entry) => matchesWhen(entry, when, today));
  const countOf = (value: StatusFilter) => inScope.filter((entry) => matchesStatus(entry, value)).length;
  const scopePhrase = WHEN_SCOPE_PHRASES[when];
  const scope = scopePhrase ? ` ${t(scopePhrase)}` : '';

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            pagination.setPage(1);
          }}
          placeholder={t('Search by member')}
          className="w-full lg:w-72"
        />
        <FilterBar.Trailing>
          <SegmentedFilter
            label={t('Filter by plan date')}
            value={when}
            onChange={(value) => {
              setWhenParam(value);
              pagination.setPage(1);
            }}
            options={WHEN_FILTERS.map((value) => ({ value, label: t(WHEN_LABELS[value]) }))}
            className="w-full lg:w-auto"
          />
          <SegmentedFilter
            label={t('Filter by status')}
            value={status}
            onChange={(value) => {
              setStatus(value);
              pagination.setPage(1);
            }}
            options={[
              { value: 'all', label: t('review::All'), count: countOf('all') },
              { value: 'must_review', label: t('Must review'), count: countOf('must_review') },
              { value: 'ai_published', label: t('AI'), count: countOf('ai_published') },
              { value: 'trainer_edited', label: t('Trainer'), count: countOf('trainer_edited') },
            ]}
            className="w-full lg:w-auto"
          />
        </FilterBar.Trailing>
      </FilterBar>
      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={SearchXIcon}
            title={t('No matches')}
            description={
              search.trim()
                ? t('No plan{scope} matches that name and status. Try another name, status or date range.', { scope })
                : status === 'must_review'
                  ? t(
                      'No plan{scope} holds an exercise that cannot be done right now or a safety warning the member accepted.',
                      {
                        scope,
                      },
                    )
                  : status === 'trainer_edited'
                    ? t('No trainer has edited or left a note on a plan{scope}.', { scope })
                    : t('No plan{scope} is in the queue for this status.', { scope })
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <QueueHead />
            <TableBody>
              {pagination.pageItems.map((entry) => (
                <TableRow key={entry.id} className="relative">
                  <TableCell>
                    <Link
                      href={`/reviews/${entry.id}${detailSearch}`}
                      className="font-semibold outline-none after:absolute after:inset-0 hover:underline"
                    >
                      {entry.memberName}
                    </Link>
                    <p className="text-muted-foreground sm:hidden">{formatPlanDate(entry.planDate)}</p>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    {formatPlanDate(entry.planDate)}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <PlanStatusBadge status={entry.status} hasNote={entry.noteCount > 0} />
                      {entry.unavailableCount > 0 && (
                        <Badge variant="tape">
                          {tn('Must review {count}', {
                            count: <span className="numerals text-sm">{entry.unavailableCount}</span>,
                          })}
                        </Badge>
                      )}
                      {entry.riskCount > 0 && <Badge variant="tape">{t('Safety warning accepted')}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-80 truncate text-muted-foreground lg:table-cell">
                    {entry.lastNote ?? <span className="italic">{t('No notes yet')}</span>}
                  </TableCell>
                  <TableCell>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.setPage}
        noun={t('plans')}
      />
    </div>
  );
}

export const ReviewsQueue = Object.assign(ReviewsQueueRoot, { Skeleton: ReviewsQueueSkeleton });
