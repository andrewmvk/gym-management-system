'use client';

import type { ComponentProps, ReactNode } from 'react';
import { PlanHistory } from '@/app/(member)/plan/plan-history';
import { TodayPlan } from '@/app/(member)/plan/today-plan';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf, useUrlState } from '@/hooks/use-url-state';

const TITLE = 'My plan';
const DESCRIPTION = "Today's training, and every plan you've had before.";

const PLAN_TABS = ['today', 'history'] as const;
type PlanTab = (typeof PLAN_TABS)[number];

function PlanTabs({
  today,
  history,
  ...tabsProps
}: { today: ReactNode; history: ReactNode } & Pick<ComponentProps<typeof Tabs>, 'value' | 'onValueChange'>) {
  return (
    <Tabs defaultValue="today" {...tabsProps}>
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

function PlanContent() {
  const [tab, setTab] = useUrlState<PlanTab>('tab', 'today', oneOf(PLAN_TABS));

  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <PlanTabs
        value={tab}
        onValueChange={(value) => setTab(value as PlanTab)}
        today={<TodayPlan />}
        history={<PlanHistory />}
      />
    </PageContainer>
  );
}

export default function PlanPage() {
  return (
    <GuardedContent skeleton={<PlanSkeleton />}>
      <PlanContent />
    </GuardedContent>
  );
}
