'use client';

import { OnboardingView } from '@/app/(member)/onboarding/onboarding-view';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Health profile';
const DESCRIPTION = 'Your health and goals. Every training plan is built from this, plus what you tell your coach.';

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
