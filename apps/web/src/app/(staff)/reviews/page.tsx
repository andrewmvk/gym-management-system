'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { ReviewsQueue } from './reviews-queue';

function ReviewsSkeleton() {
  return (
    <PageContainer width="wide">
      <PageHeading.Skeleton />
      <ReviewsQueue.Skeleton />
    </PageContainer>
  );
}

export default function ReviewsPage() {
  return (
    <GuardedContent skeleton={<ReviewsSkeleton />}>
      <PageContainer width="wide">
        <PageHeading title="Plan reviews" description="Any trainer can review or edit any member's plan." />
        <ReviewsQueue />
      </PageContainer>
    </GuardedContent>
  );
}
