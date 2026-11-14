'use client';

import { MemberMetrics } from '@/app/(member)/metrics/member-metrics';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function MetricsHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('My metrics')}
      description={t('How often you train and what you get through, for any stretch of time.')}
    />
  );
}

function MetricsSkeleton() {
  return (
    <PageContainer>
      <MetricsHeading />
      <MemberMetrics.Skeleton />
    </PageContainer>
  );
}

export default function MetricsPage() {
  return (
    <GuardedContent skeleton={<MetricsSkeleton />}>
      <PageContainer>
        <MetricsHeading />
        <MemberMetrics />
      </PageContainer>
    </GuardedContent>
  );
}
