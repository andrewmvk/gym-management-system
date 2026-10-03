'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, ExternalLinkIcon, FileCheck2Icon, ImageOffIcon, LockIcon, XIcon } from 'lucide-react';
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
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { API_URL } from '@/lib/env';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 8;

const REVIEW_FILTERS = ['open', 'reviewed', 'all'] as const;
type ReviewFilter = (typeof REVIEW_FILTERS)[number];

function formatUploadedAt(uploadedAt: Date | string) {
  return new Date(uploadedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// An uploaded file can be missing from storage; say so instead of showing a broken image.
function CertificatePreview({ fileUrl, applicantName }: { fileUrl: string; applicantName: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex size-28 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted p-2 text-center text-muted-foreground">
        <ImageOffIcon className="size-5" aria-hidden />
        <p className="text-xs text-balance">File not found</p>
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative size-28 shrink-0 overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl}
        alt={`Certificate from ${applicantName}`}
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <ExternalLinkIcon className="size-5" />
        <span className="sr-only">Open full size</span>
      </span>
    </a>
  );
}

function CertificateRowSkeleton() {
  return (
    <li className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:px-6">
      <Skeleton className="size-28 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-44" />
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
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
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
  const [filter, setFilter] = useUrlState<ReviewFilter>('filter', 'open', oneOf(REVIEW_FILTERS));

  const queueQuery = useQuery({ ...trpc.certificates.listQueue.queryOptions(), enabled: canReview });

  const review = useMutation(
    trpc.certificates.review.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.certificates.listQueue.queryKey() }),
      onError: (error) =>
        toast.error(error.data?.code === 'BAD_REQUEST' ? error.message : "We couldn't save that decision. Try again."),
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
      <QueryError
        title="We couldn't load the queue"
        onRetry={() => queueQuery.refetch()}
        isRetrying={queueQuery.isRefetching}
      />
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
            description={
              filter === 'open' ? 'Every certificate has an admin decision.' : 'No certificates match this filter.'
            }
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
                <CertificatePreview fileUrl={fileUrl} applicantName={entry.applicantName} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <p className="font-semibold">{entry.applicantName}</p>
                    <p className="truncate text-sm text-muted-foreground">{entry.applicantEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded <span className="numerals">{formatUploadedAt(entry.uploadedAt)}</span>
                    </p>
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
                  {entry.aiNotes && (
                    <p className="max-w-prose text-sm text-pretty text-muted-foreground">{entry.aiNotes}</p>
                  )}
                  {!isReviewed && entry.aiResult === 'pending_retry' && (
                    <p className="text-sm text-muted-foreground">
                      The AI couldn't evaluate this one, so there's nothing to confirm. Clear or reject it yourself.
                    </p>
                  )}
                  {!isReviewed && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={entry.aiResult === 'pending_retry' || isPending}
                        onClick={() => review.mutate({ certificateId: entry.id, result: 'confirm' })}
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
