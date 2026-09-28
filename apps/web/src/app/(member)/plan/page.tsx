'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { PlanHistory } from './plan-history';
import { TodayPlan } from './today-plan';

function PlanSkeleton() {
  return (
    <PageContainer>
      <PageHeading.Skeleton />
      <TodayPlan.Skeleton />
    </PageContainer>
  );
}

export default function PlanPage() {
  return (
    <GuardedContent skeleton={<PlanSkeleton />}>
      <PageContainer>
        <PageHeading title="Your plan" description="Today's training plan, and your history by date." />
        <TodayPlan />
        <PlanHistory />
      </PageContainer>
    </GuardedContent>
  );
}
