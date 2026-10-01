'use client';

import type { ReactNode } from 'react';
import { PlanHistory } from '@/app/(member)/plan/plan-history';
import { TodayPlan } from '@/app/(member)/plan/today-plan';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TITLE = 'My plan';
const DESCRIPTION = "Today's training, and every plan you've had before.";

function PlanTabs({ today, history }: { today: ReactNode; history: ReactNode }) {
  return (
    <Tabs defaultValue="today">
      <TabsList>
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="today">{today}</TabsContent>
      <TabsContent value="history">{history}</TabsContent>
    </Tabs>
  );
}

function PlanSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <PlanTabs today={<TodayPlan.Skeleton />} history={null} />
    </PageContainer>
  );
}

export default function PlanPage() {
  return (
    <GuardedContent skeleton={<PlanSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <PlanTabs today={<TodayPlan />} history={<PlanHistory />} />
      </PageContainer>
    </GuardedContent>
  );
}
