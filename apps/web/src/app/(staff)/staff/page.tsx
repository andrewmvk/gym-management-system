'use client';

import { DemandSection } from '@/app/(staff)/staff/demand-section';
import { OverviewBoard } from '@/app/(staff)/staff/overview-board';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function StaffHomeHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Overview')}
      description={t(
        'Plans publish on their own. Here is what needs a trainer, what trainers touched this week, and what today’s plans ask of the equipment.',
      )}
    />
  );
}

function StaffHomeSkeleton() {
  return (
    <PageContainer>
      <StaffHomeHeading />
      <OverviewBoard.Skeleton />
      <DemandSection.Skeleton />
    </PageContainer>
  );
}

export default function StaffHomePage() {
  return (
    <GuardedContent skeleton={<StaffHomeSkeleton />}>
      <PageContainer>
        <StaffHomeHeading />
        <OverviewBoard />
        <DemandSection />
      </PageContainer>
    </GuardedContent>
  );
}
