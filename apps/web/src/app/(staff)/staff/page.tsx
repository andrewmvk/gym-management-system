'use client';

import { DemandSection } from '@/app/(staff)/staff/demand-section';
import { OverviewBoard } from '@/app/(staff)/staff/overview-board';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Overview';
const DESCRIPTION =
  'Plans publish on their own. Here is what needs a trainer, what trainers touched this week, and what today’s plans ask of the equipment.';

function StaffHomeSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <OverviewBoard.Skeleton />
      <DemandSection.Skeleton />
    </PageContainer>
  );
}

export default function StaffHomePage() {
  return (
    <GuardedContent skeleton={<StaffHomeSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <OverviewBoard />
        <DemandSection />
      </PageContainer>
    </GuardedContent>
  );
}
