'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileCheck2Icon,
  ImageOffIcon,
  LockIcon,
  RotateCwIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { AptitudeResultBadge } from '@/components/aptitude-result-badge';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SegmentedFilter } from '@/components/segmented-filter';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { API_URL } from '@/lib/env';
import { serverMessage } from '@/lib/error-message';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 8;

const REVIEW_FILTERS = ['open', 'reviewed', 'all'] as const;
type ReviewFilter = (typeof REVIEW_FILTERS)[number];

function formatMoment(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-48" />
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
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
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);

  const queueQuery = useQuery({ ...trpc.certificates.listQueue.queryOptions(), enabled: canReview });

  const review = useMutation(
    trpc.certificates.review.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({ queryKey: trpc.certificates.listQueue.queryKey() });
        const name = queueQuery.data?.find((entry) => entry.id === variables.certificateId)?.applicantName;
        const who = name ?? 'The applicant';
        setRejecting(null);
        toast.success(
          variables.result === 'cleared'
            ? `${who} was cleared and can finish signing up.`
            : `${who} was rejected. That email can no longer sign up.`,
        );
      },
      onError: (error) => {
        setRejecting(null);
        toast.error(serverMessage(error, "We couldn't save that decision. Try again."));
      },
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
            const isUninspected = entry.aiResult === 'pending_retry';
            return (
              <li key={entry.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:px-6">
                <CertificatePreview fileUrl={fileUrl} applicantName={entry.applicantName} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div>
                    <p className="font-semibold">{entry.applicantName}</p>
                    <p className="truncate text-sm text-muted-foreground">{entry.applicantEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded <span className="numerals text-base">{formatMoment(entry.uploadedAt)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isUninspected ? (
                      <Badge variant="retry">
                        <RotateCwIcon data-icon="inline-start" />
                        AI could not inspect the file
                      </Badge>
                    ) : (
                      <AptitudeResultBadge source="AI" result={entry.aiResult} />
                    )}
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
                  {isReviewed && (
                    <p className="text-sm text-muted-foreground">
                      Decided by{' '}
                      <span className="font-semibold text-foreground">{entry.reviewedByName ?? 'an admin'}</span>
                      {entry.adminReviewedAt && (
                        <>
                          {' '}
                          on <span className="numerals text-base">{formatMoment(entry.adminReviewedAt)}</span>
                        </>
                      )}
                      .
                    </p>
                  )}
                  {isUninspected ? (
                    !isReviewed && (
                      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                        The AI made no determination on this file, so there is nothing to confirm. Look at the
                        certificate and clear or reject it yourself.
                      </p>
                    )
                  ) : (
                    <p className="max-w-prose text-sm text-pretty text-muted-foreground">{entry.aiNotes}</p>
                  )}
                  {entry.questionnaireResult && (
                    <details className="group max-w-prose text-sm">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45 [&::-webkit-details-marker]:hidden">
                        <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" aria-hidden />
                        Why a certificate was needed
                      </summary>
                      <div className="mt-2 flex flex-col gap-2 pl-5">
                        <AptitudeResultBadge source="AI" result={entry.questionnaireResult} />
                        {entry.questionnaireNotes && (
                          <p className="text-pretty text-muted-foreground">{entry.questionnaireNotes}</p>
                        )}
                      </div>
                    </details>
                  )}
                  {!isReviewed && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={isPending}
                        aria-label={`Clear ${entry.applicantName}`}
                        onClick={() => review.mutate({ certificateId: entry.id, result: 'cleared' })}
                      >
                        <CheckIcon data-icon="inline-start" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        aria-label={`Reject ${entry.applicantName}`}
                        onClick={() => setRejecting({ id: entry.id, name: entry.applicantName })}
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

      <AlertDialog open={rejecting !== null} onOpenChange={(open) => !open && !review.isPending && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {rejecting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejecting?.name} is permanently refused. Their email can no longer sign up, and nothing on this page can
              undo it. Reject only if the certificate does not clear them to train.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={review.isPending}
              onClick={() => rejecting && review.mutate({ certificateId: rejecting.id, result: 'not_cleared' })}
            >
              {review.isPending ? 'Rejecting...' : `Reject ${rejecting?.name ?? ''}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const CertificateQueue = Object.assign(CertificateQueueRoot, { Skeleton: CertificateQueueSkeleton });
