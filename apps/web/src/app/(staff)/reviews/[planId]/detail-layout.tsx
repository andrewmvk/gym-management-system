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
  editor: ReactNode;
  preview: ReactNode;
  history: ReactNode;
}

// On phones the order is context, exercises, muscles, history, so what the AI knew sits above the exercises.
// From lg the exercises take the two-column side and the other three stack in the third.
function DetailLayoutRoot({ heading, navigation, context, editor, preview, history }: DetailLayoutProps) {
  return (
    <PageContainer>
      {heading}
      {navigation}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-start-3 lg:row-start-1">{context}</div>
        <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-span-3 lg:row-start-1">{editor}</div>
        <div className="min-w-0 lg:col-start-3 lg:row-start-2">{preview}</div>
        <div className="min-w-0 lg:col-start-3 lg:row-start-3">{history}</div>
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
