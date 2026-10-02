'use client';

import { TurnstileSettings } from '@/app/(staff)/settings/turnstile/turnstile-settings';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Turnstile';
const DESCRIPTION = 'The request sent to the turnstile API on every check-in.';

function TurnstileSettingsPageSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <TurnstileSettings.Skeleton />
    </PageContainer>
  );
}

export default function TurnstileSettingsPage() {
  return (
    <GuardedContent skeleton={<TurnstileSettingsPageSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <TurnstileSettings />
      </PageContainer>
    </GuardedContent>
  );
}
