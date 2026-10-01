'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, ExternalLinkIcon, FileCheck2Icon, LockIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { AptitudeResultBadge } from '@/components/aptitude-result-badge';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { API_URL } from '@/lib/env';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 8;

type ReviewFilter = 'open' | 'reviewed' | 'all';

function CertificateRowSkeleton() {
  return (
    <li className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:px-6">
      <Skeleton className="size-28 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </li>
  );
}

function CertificateQueueSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full sm:w-96" />
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 3 }, (_, index) => (
          <CertificateRowSkeleton key={index} />
        ))}
      </ul>
    </div>
  );
}

function CertificateQueueRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const canReview = ability.can('manage', 'MedicalCertificate');
  const [filter, setFilter] = useState<ReviewFilter>('open');

  const queueQuery = useQuery({ ...trpc.certificates.listQueue.queryOptions(), enabled: canReview });

  const review = useMutation(
    trpc.certificates.review.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.certificates.listQueue.queryKey() }),
      onError: (error) => toast.error(error.data?.code === 'BAD_REQUEST' ? error.message : "We couldn't save that decision. Try again."),
    }),
  );

  const entries = queueQuery.data ?? [];
  const openCount = entries.filter((entry) => entry.adminReviewedAt === null).length;
  const filtered = entries.filter((entry) =>
    filter === 'all' ? true : filter === 'open' ? entry.adminReviewedAt === null : entry.adminReviewedAt !== null,
  );
  const pagination = usePagination(filtered, PAGE_SIZE);

  if (!canReview) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title="No access"
          description="Your account doesn't include certificate review. Ask an admin if you need it."
        />
      </div>
    );
  }

  if (queueQuery.isPending) {
    return (
      <Deferred>
        <CertificateQueueSkeleton />
      </Deferred>
    );
  }

  if (queueQuery.isError) {
    return (
      <QueryError title="We couldn't load the queue" onRetry={() => queueQuery.refetch()} isRetrying={queueQuery.isRefetching} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedFilter
        label="Filter certificates"
        value={filter}
        onChange={(value) => {
          setFilter(value);
          pagination.setPage(1);
        }}
        options={[
          { value: 'open', label: 'To review', count: openCount },
          { value: 'reviewed', label: 'Reviewed', count: entries.length - openCount },
          { value: 'all', label: 'All', count: entries.length },
        ]}
        className="w-full sm:w-auto sm:self-start"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={FileCheck2Icon}
            title={filter === 'open' ? 'All caught up' : 'Nothing here'}
            description={filter === 'open' ? 'Every certificate has an admin decision.' : 'No certificates match this filter.'}
          />
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {pagination.pageItems.map((entry) => {
            const isReviewed = entry.adminReviewedAt !== null;
            const isPending = review.isPending && review.variables?.certificateId === entry.id;
            const fileUrl = `${API_URL}/files/${entry.filePath}`;
            return (
              <li key={entry.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:px-6">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative size-28 shrink-0 overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl} alt={`Certificate from ${entry.applicantName}`} className="size-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ExternalLinkIcon className="size-5" />
                    <span className="sr-only">Open full size</span>
                  </span>
                </a>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <p className="font-semibold">{entry.applicantName}</p>
                    <p className="truncate text-sm text-muted-foreground">{entry.applicantEmail}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AptitudeResultBadge source="AI" result={entry.aiResult} />
                    {isReviewed &&
                      (entry.adminOverrideResult ? (
                        <AptitudeResultBadge source="Admin" result={entry.adminOverrideResult} />
                      ) : (
                        <Badge variant="secondary">
                          <CheckIcon data-icon="inline-start" />
                          Admin: confirmed AI
                        </Badge>
                      ))}
                  </div>
                  {entry.aiNotes && <p className="max-w-prose text-sm text-pretty text-muted-foreground">{entry.aiNotes}</p>}
                  {!isReviewed && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={entry.aiResult === 'pending_retry' || isPending}
                        onClick={() => review.mutate({ certificateId: entry.id, result: 'confirm' })}
                        title={entry.aiResult === 'pending_retry' ? "The AI couldn't evaluate this one, so there's nothing to confirm." : undefined}
                      >
                        Confirm AI
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={isPending}
                        onClick={() => review.mutate({ certificateId: entry.id, result: 'cleared' })}
                      >
                        <CheckIcon data-icon="inline-start" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => review.mutate({ certificateId: entry.id, result: 'not_cleared' })}
                      >
                        <XIcon data-icon="inline-start" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.setPage}
        noun="certificates"
      />
    </div>
  );
}

export const CertificateQueue = Object.assign(CertificateQueueRoot, { Skeleton: CertificateQueueSkeleton });
