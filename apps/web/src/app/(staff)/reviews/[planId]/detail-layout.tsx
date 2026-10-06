import type { ReactNode } from 'react';
import { MemberContextCard } from '@/app/(staff)/reviews/[planId]/member-context-card';
import { PlanMusclePreview } from '@/app/(staff)/reviews/[planId]/plan-muscle-preview';
import { ReviewHistory } from '@/app/(staff)/reviews/[planId]/review-history';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DetailLayoutProps {
  heading: ReactNode;
  navigation?: ReactNode;
  context: ReactNode;
  alerts?: ReactNode;
  preview: ReactNode;
  editor: ReactNode;
  history: ReactNode;
}

// The work is in the wide column, three fifths of the page: what needs a look, the muscle balance the plan
// adds up to, then the exercises to change. The two fifths beside it are what the trainer judges them against
// (what the AI knew) and what other trainers already did. On phones the order is context, alerts, muscles,
// exercises, history, so what the AI knew sits above the exercises.
function DetailLayoutRoot({ heading, navigation, context, alerts, preview, editor, history }: DetailLayoutProps) {
  return (
    <PageContainer>
      {heading}
      {navigation}
      {/* Two independent columns from lg, so neither column's height pushes the other's items around. Below lg the
          side wrapper dissolves (contents) and `order` interleaves its two cards around the main column. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-2 lg:flex-col lg:gap-6">
          <div className="order-1 min-w-0 lg:order-none">{context}</div>
          <div className="order-3 min-w-0 lg:order-none">{history}</div>
        </div>
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-first lg:flex-3">
          {alerts}
          {preview}
          {editor}
        </div>
      </div>
    </PageContainer>
  );
}

function DetailLayoutSkeleton() {
  return (
    <DetailLayoutRoot
      heading={<PageHeading.Skeleton back={{ href: '/reviews', label: 'Back to queue' }} />}
      navigation={
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      }
      context={<MemberContextCard.Skeleton />}
      editor={
        <Card>
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
            <CardDescription>Changes publish to the member as soon as you save.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Skeleton className="h-16 w-full" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardFooter>
        </Card>
      }
      preview={<PlanMusclePreview.Skeleton />}
      history={<ReviewHistory.Skeleton />}
    />
  );
}

export const DetailLayout = Object.assign(DetailLayoutRoot, { Skeleton: DetailLayoutSkeleton });
