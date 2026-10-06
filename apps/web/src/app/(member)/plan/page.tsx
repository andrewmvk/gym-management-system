'use client';

import type { ReactNode } from 'react';
import { DayPlan } from '@/app/(member)/plan/day-plan';
import { DayStrip } from '@/app/(member)/plan/day-strip';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useUrlState } from '@/hooks/use-url-state';
import { toIsoDate } from '@/lib/calendar-date';

const TITLE = 'My plan';
const DESCRIPTION = "Today's training, the days you've done and the ones coming up.";

const isIsoDate = (raw: string): raw is string => /^\d{4}-\d{2}-\d{2}$/.test(raw);

function PlanHeader({ strip }: { strip: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0">
        <PageHeading title={TITLE} description={DESCRIPTION} />
      </div>
      {strip}
    </div>
  );
}

function PlanSkeleton() {
  return (
    <PageContainer>
      <PlanHeader strip={<DayStrip.Skeleton />} />
      <DayPlan.Skeleton />
    </PageContainer>
  );
}

function PlanContent() {
  const todayIso = toIsoDate(new Date());
  const [date, setDate] = useUrlState('date', todayIso, isIsoDate);

  return (
    <PageContainer>
      <PlanHeader strip={<DayStrip selected={date} todayIso={todayIso} onSelect={setDate} />} />
      <DayPlan date={date} todayIso={todayIso} />
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
