'use client';

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

function PlanSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <div className="flex flex-col gap-4">
        <DayStrip.Skeleton />
        <DayPlan.Skeleton />
      </div>
    </PageContainer>
  );
}

function PlanContent() {
  const todayIso = toIsoDate(new Date());
  const [date, setDate] = useUrlState('date', todayIso, isIsoDate);

  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <div className="flex flex-col gap-4">
        <DayStrip selected={date} todayIso={todayIso} onSelect={setDate} />
        <DayPlan date={date} todayIso={todayIso} />
      </div>
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
