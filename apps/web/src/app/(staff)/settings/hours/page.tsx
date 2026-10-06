'use client';

import { OpeningHoursForm } from '@/app/(staff)/settings/hours/opening-hours-form';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Opening hours';
const DESCRIPTION = 'When the gym is open each day of the week. A closed day has no hours at all.';

function OpeningHoursPageSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <OpeningHoursForm.Skeleton />
    </PageContainer>
  );
}

export default function OpeningHoursPage() {
  return (
    <GuardedContent skeleton={<OpeningHoursPageSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <OpeningHoursForm />
      </PageContainer>
    </GuardedContent>
  );
}
