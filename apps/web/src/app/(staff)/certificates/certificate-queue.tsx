'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { API_URL } from '@/lib/env';
import { useTRPC } from '@/lib/trpc';

const AI_RESULT_VARIANT: Record<'cleared' | 'not_cleared' | 'pending_retry', 'default' | 'destructive' | 'outline'> = {
  cleared: 'default',
  not_cleared: 'destructive',
  pending_retry: 'outline',
};

function CertificateQueueSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificate review queue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b pb-4 last:border-b-0">
            <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CertificateQueueRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const canReview = ability.can('manage', 'MedicalCertificate');

  const queueQuery = useQuery({ ...trpc.certificates.listQueue.queryOptions(), enabled: canReview });

  const review = useMutation(
    trpc.certificates.review.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.certificates.listQueue.queryKey() }),
      onError: (error) => toast.error(error.data?.code === 'BAD_REQUEST' ? error.message : "We couldn't save that decision. Try again."),
    }),
  );

  if (!canReview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You don&apos;t have access to certificate review.</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (queueQuery.isPending) return <CertificateQueueSkeleton />;

  if (queueQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>We couldn&apos;t load the queue.</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => queueQuery.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificate review queue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {queueQuery.data.length === 0 && <p className="text-sm text-muted-foreground">No certificates yet.</p>}
        {queueQuery.data.map((entry) => {
          const reviewed = entry.adminReviewedAt !== null;
          const isPending = review.isPending && review.variables?.certificateId === entry.id;
          return (
            <div key={entry.id} className="flex flex-col gap-3 border-b pb-4 last:border-b-0 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}/files/${entry.filePath}`}
                alt={`Certificate from ${entry.applicantName}`}
                className="h-32 w-32 shrink-0 rounded-md border object-cover"
              />
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-medium">{entry.applicantName}</p>
                <p className="text-sm text-muted-foreground">{entry.applicantEmail}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={AI_RESULT_VARIANT[entry.aiResult]}>AI: {entry.aiResult}</Badge>
                  {reviewed && (
                    <Badge variant="secondary">Reviewed: {entry.adminOverrideResult}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{entry.aiNotes}</p>
                {!reviewed && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={entry.aiResult === 'pending_retry' || isPending}
                      onClick={() => review.mutate({ certificateId: entry.id, result: 'confirm' })}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => review.mutate({ certificateId: entry.id, result: 'cleared' })}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => review.mutate({ certificateId: entry.id, result: 'not_cleared' })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export const CertificateQueue = Object.assign(CertificateQueueRoot, { Skeleton: CertificateQueueSkeleton });
