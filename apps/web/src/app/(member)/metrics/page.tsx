'use client';

import { MemberMetrics } from '@/app/(member)/metrics/member-metrics';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'My metrics';
const DESCRIPTION = 'How often you train and what you get through, for any stretch of time.';

function MetricsSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <MemberMetrics.Skeleton />
    </PageContainer>
  );
}

export default function MetricsPage() {
  return (
    <GuardedContent skeleton={<MetricsSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <MemberMetrics />
      </PageContainer>
    </GuardedContent>
  );
}
