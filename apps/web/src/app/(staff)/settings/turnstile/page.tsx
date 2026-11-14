'use client';

import { TurnstileSettings } from '@/app/(staff)/settings/turnstile/turnstile-settings';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function TurnstileSettingsHeading() {
  const { t } = useI18n();
  return (
    <PageHeading title={t('Turnstile')} description={t('The request sent to the turnstile API on every check-in.')} />
  );
}

function TurnstileSettingsPageSkeleton() {
  return (
    <PageContainer>
      <TurnstileSettingsHeading />
      <TurnstileSettings.Skeleton />
    </PageContainer>
  );
}

export default function TurnstileSettingsPage() {
  return (
    <GuardedContent skeleton={<TurnstileSettingsPageSkeleton />}>
      <PageContainer>
        <TurnstileSettingsHeading />
        <TurnstileSettings />
      </PageContainer>
    </GuardedContent>
  );
}
