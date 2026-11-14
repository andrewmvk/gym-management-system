'use client';

import { ReviewsQueue } from '@/app/(staff)/reviews/reviews-queue';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function ReviewsHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Plan reviews')}
      description={t("Every member's plan is already live. Any trainer can comment on it or edit it here.")}
    />
  );
}

function ReviewsSkeleton() {
  return (
    <PageContainer>
      <ReviewsHeading />
      <ReviewsQueue.Skeleton />
    </PageContainer>
  );
}

export default function ReviewsPage() {
  return (
    <GuardedContent skeleton={<ReviewsSkeleton />}>
      <PageContainer>
        <ReviewsHeading />
        <ReviewsQueue />
      </PageContainer>
    </GuardedContent>
  );
}
