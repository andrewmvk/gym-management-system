'use client';

import { OpeningHoursForm } from '@/app/(staff)/settings/hours/opening-hours-form';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function OpeningHoursHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Opening hours')}
      description={t('When the gym is open each day of the week. A closed day has no hours at all.')}
    />
  );
}

function OpeningHoursPageSkeleton() {
  return (
    <PageContainer>
      <OpeningHoursHeading />
      <OpeningHoursForm.Skeleton />
    </PageContainer>
  );
}

export default function OpeningHoursPage() {
  return (
    <GuardedContent skeleton={<OpeningHoursPageSkeleton />}>
      <PageContainer>
        <OpeningHoursHeading />
        <OpeningHoursForm />
      </PageContainer>
    </GuardedContent>
  );
}
