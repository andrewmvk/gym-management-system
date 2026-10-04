'use client';

import { useQuery } from '@tanstack/react-query';
import { DoorOpenIcon, LockIcon, SearchXIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppAbility } from '@/abilities';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { formatDateTime } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 15;
const REFRESH_INTERVAL_MS = 60_000;
const SKELETON_ROWS = 8;

const RESULT_FILTERS = ['all', 'failed'] as const;
type ResultFilter = (typeof RESULT_FILTERS)[number];

const FAILURE_REASONS = {
  not_configured: 'Turnstile not configured',
  timeout: 'Timed out',
  http_error: 'Turnstile answered with an error',
  network_error: 'Could not reach the turnstile',
  unknown: 'Unknown',
} as const;

function CheckInHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Member</TableHead>
        <TableHead>Time</TableHead>
        <TableHead>Turnstile</TableHead>
        <TableHead className="hidden sm:table-cell">Reason</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:px-6">{children}</div>;
}

function CheckInLogSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Toolbar>
        <Skeleton className="h-10 w-full sm:w-72" />
      </Toolbar>
      <Table>
        <CheckInHead />
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-5 w-36" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-28" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-5 w-48" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CheckInLogRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canRead = ability.can('read', 'CheckIn');
  const query = useQuery({
    ...trpc.checkins.listRecent.queryOptions({ limit: 100 }),
    enabled: canRead,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const [result, setResult] = useUrlState<ResultFilter>('result', 'all', oneOf(RESULT_FILTERS));

  const checkIns = query.data ?? [];
  const failedCount = checkIns.filter((entry) => entry.turnstileStatus === 'failed').length;
  const filtered = result === 'failed' ? checkIns.filter((entry) => entry.turnstileStatus === 'failed') : checkIns;
  const pagination = usePagination(filtered, PAGE_SIZE);

  if (!canRead) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title="No access"
          description="Your account doesn't include the check-in log. Ask an admin if you need it."
        />
      </div>
    );
  }

  if (query.isPending) {
    return (
      <Deferred>
        <CheckInLogSkeleton />
      </Deferred>
    );
  }

  if (!query.data) {
    return (
      <QueryError
        title="We couldn't load the check-ins"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  if (checkIns.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={DoorOpenIcon}
          title="No check-ins yet"
          description="Check-ins show up here as members arrive at the kiosk."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Toolbar>
          <SegmentedFilter
            label="Filter by turnstile result"
            value={result}
            onChange={(value) => {
              setResult(value);
              pagination.setPage(1);
            }}
            options={[
              { value: 'all', label: 'All', count: checkIns.length },
              { value: 'failed', label: 'Did not open', count: failedCount },
            ]}
          />
        </Toolbar>
        {filtered.length === 0 ? (
          <EmptyState
            icon={SearchXIcon}
            title="Every recent check-in opened the turnstile"
            description="Check-ins where the turnstile did not open would be listed here."
          />
        ) : (
          <Table>
            <CheckInHead />
            <TableBody>
              {pagination.pageItems.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold">{entry.memberName}</TableCell>
                  <TableCell>
                    <span className="numerals text-base">{formatDateTime(entry.checkedInAt)}</span>
                  </TableCell>
                  <TableCell>
                    {entry.turnstileStatus === 'success' ? (
                      <Badge variant="live">Opened</Badge>
                    ) : (
                      <Badge variant="retry">Did not open</Badge>
                    )}
                    {entry.failureReason && (
                      <p className="mt-1 text-sm text-pretty text-muted-foreground sm:hidden">
                        {FAILURE_REASONS[entry.failureReason]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {entry.failureReason ? FAILURE_REASONS[entry.failureReason] : ''}
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
        noun="check-ins"
      />
    </div>
  );
}

export const CheckInLog = Object.assign(CheckInLogRoot, { Skeleton: CheckInLogSkeleton });
