'use client';

import { CheckInLog } from '@/app/(staff)/checkins/check-in-log';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function CheckInsHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Check-ins')}
      description={t(
        'The latest check-ins and whether the turnstile opened. A check-in is always recorded, even when the turnstile does not respond.',
      )}
    />
  );
}

function CheckInsSkeleton() {
  return (
    <PageContainer>
      <CheckInsHeading />
      <CheckInLog.Skeleton />
    </PageContainer>
  );
}

export default function CheckInsPage() {
  return (
    <GuardedContent skeleton={<CheckInsSkeleton />}>
      <PageContainer>
        <CheckInsHeading />
        <CheckInLog />
      </PageContainer>
    </GuardedContent>
  );
}
