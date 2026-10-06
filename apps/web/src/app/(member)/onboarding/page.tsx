'use client';

import { OnboardingView } from '@/app/(member)/onboarding/onboarding-view';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Health profile';
const DESCRIPTION =
  'Your health and goals, and what your coach remembers from your chats. Every training plan is built from both.';

function OnboardingSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <OnboardingView.Skeleton />
    </PageContainer>
  );
}

export default function OnboardingPage() {
  return (
    <GuardedContent skeleton={<OnboardingSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <OnboardingView />
      </PageContainer>
    </GuardedContent>
  );
}
