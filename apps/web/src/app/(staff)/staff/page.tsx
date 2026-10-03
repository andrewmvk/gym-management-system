'use client';

import { OverviewBoard } from '@/app/(staff)/staff/overview-board';
import { PoolSection } from '@/app/(staff)/staff/pool-section';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Overview';
const DESCRIPTION =
  'Plans publish on their own. Here is what needs a trainer today, what trainers already touched, and what the plans cover together.';

function StaffHomeSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <OverviewBoard.Skeleton />
      <PoolSection.Skeleton />
    </PageContainer>
  );
}

export default function StaffHomePage() {
  return (
    <GuardedContent skeleton={<StaffHomeSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <OverviewBoard />
        <PoolSection />
      </PageContainer>
    </GuardedContent>
  );
}
