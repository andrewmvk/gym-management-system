'use client';

import { CheckInLog } from '@/app/(staff)/checkins/check-in-log';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Check-ins';
const DESCRIPTION =
  'The latest check-ins and whether the turnstile opened. A check-in is always recorded, even when the turnstile does not respond.';

function CheckInsSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <CheckInLog.Skeleton />
    </PageContainer>
  );
}

export default function CheckInsPage() {
  return (
    <GuardedContent skeleton={<CheckInsSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <CheckInLog />
      </PageContainer>
    </GuardedContent>
  );
}
