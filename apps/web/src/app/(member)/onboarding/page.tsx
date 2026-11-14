'use client';

import { OnboardingView } from '@/app/(member)/onboarding/onboarding-view';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function OnboardingHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Health profile')}
      description={t(
        'Your health and goals, and what your coach remembers from your chats. Every training plan is built from both.',
      )}
    />
  );
}

function OnboardingSkeleton() {
  return (
    <PageContainer>
      <OnboardingHeading />
      <OnboardingView.Skeleton />
    </PageContainer>
  );
}

export default function OnboardingPage() {
  return (
    <GuardedContent skeleton={<OnboardingSkeleton />}>
      <PageContainer>
        <OnboardingHeading />
        <OnboardingView />
      </PageContainer>
    </GuardedContent>
  );
}
