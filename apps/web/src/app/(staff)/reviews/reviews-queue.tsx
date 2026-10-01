'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon, ClipboardListIcon, SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { PlanStatusBadge } from '@/components/plan-status-badge';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPlanDate } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'ai_published' | 'trainer_edited';

function QueueHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Member</TableHead>
        <TableHead className="hidden sm:table-cell">Plan date</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden lg:table-cell">Last note</TableHead>
        <TableHead className="w-10">
          <span className="sr-only">Open</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">{children}</div>;
}

function ReviewsQueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Toolbar>
        <Skeleton className="h-10 w-full sm:w-72" />
        <Skeleton className="h-10 w-full sm:w-80" />
      </Toolbar>
      <Table>
        <QueueHead />
        <TableBody>
          {Array.from({ length: 6 }, (_, index) => (
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
  );
}

function ReviewsQueueRoot() {
  const trpc = useTRPC();
  const queueQuery = useQuery(trpc.reviews.queue.queryOptions());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const entries = queueQuery.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = entries.filter(
    (entry) => (status === 'all' || entry.status === status) && (!term || entry.memberName.toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, PAGE_SIZE);

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
        title="We couldn't load the queue"
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
          title="No plans yet"
          description="Plans show up here as soon as members generate them. There's nothing waiting on you."
        />
      </div>
    );
  }

  const countOf = (value: StatusFilter) => (value === 'all' ? entries.length : entries.filter((e) => e.status === value).length);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            placeholder="Search by member"
            className="sm:w-72"
          />
          <SegmentedFilter
            label="Filter by status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              pagination.setPage(1);
            }}
            options={[
              { value: 'all', label: 'All', count: countOf('all') },
              { value: 'ai_published', label: 'AI', count: countOf('ai_published') },
              { value: 'trainer_edited', label: 'Edited', count: countOf('trainer_edited') },
            ]}
          />
        </Toolbar>
        {filtered.length === 0 ? (
          <EmptyState icon={SearchXIcon} title="No matches" description="Try another name or status." />
        ) : (
          <Table>
            <QueueHead />
            <TableBody>
              {pagination.pageItems.map((entry) => (
                <TableRow key={entry.id} className="relative">
                  <TableCell>
                    <Link
                      href={`/reviews/${entry.id}`}
                      className="font-semibold outline-none after:absolute after:inset-0 hover:underline"
                    >
                      {entry.memberName}
                    </Link>
                    <p className="text-muted-foreground sm:hidden">{formatPlanDate(entry.planDate)}</p>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatPlanDate(entry.planDate)}</TableCell>
                  <TableCell>
                    <PlanStatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell className="hidden max-w-80 truncate text-muted-foreground lg:table-cell">
                    {entry.lastNote ?? <span className="italic">No notes yet</span>}
                  </TableCell>
                  <TableCell>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.setPage}
        noun="plans"
      />
    </div>
  );
}

export const ReviewsQueue = Object.assign(ReviewsQueueRoot, { Skeleton: ReviewsQueueSkeleton });
