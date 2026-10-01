'use client';

import { ReviewsQueue } from '@/app/(staff)/reviews/reviews-queue';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Plan reviews';
const DESCRIPTION = "Every member's plan is already live. Any trainer can comment on it or edit it here.";

function ReviewsSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <ReviewsQueue.Skeleton />
    </PageContainer>
  );
}

export default function ReviewsPage() {
  return (
    <GuardedContent skeleton={<ReviewsSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <ReviewsQueue />
      </PageContainer>
    </GuardedContent>
  );
}
