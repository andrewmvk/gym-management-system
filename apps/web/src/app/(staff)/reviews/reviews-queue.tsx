'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';

function ReviewsQueueSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan review queue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-2 border-b pb-3 last:border-b-0">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReviewsQueueRoot() {
  const trpc = useTRPC();
  const queueQuery = useQuery(trpc.reviews.queue.queryOptions());

  if (queueQuery.isPending) return <ReviewsQueueSkeleton />;

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
        <CardTitle>Plan review queue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {queueQuery.data.length === 0 && <p className="text-sm text-muted-foreground">No plans yet.</p>}
        {queueQuery.data.map((entry) => (
          <Link
            key={entry.id}
            href={`/reviews/${entry.id}`}
            className="flex items-center justify-between gap-2 rounded-lg border-b p-2 pb-3 last:border-b-0 hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">{entry.memberName}</p>
              <p className="text-sm text-muted-foreground">{entry.planDate}</p>
              {entry.lastNote && <p className="text-sm text-muted-foreground">Last note: {entry.lastNote}</p>}
            </div>
            <Badge variant={entry.status === 'trainer_edited' ? 'secondary' : 'outline'}>{entry.status}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export const ReviewsQueue = Object.assign(ReviewsQueueRoot, { Skeleton: ReviewsQueueSkeleton });
