'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { OnboardingView } from './onboarding-view';

function OnboardingSkeleton() {
  return (
    <PageContainer>
      <PageHeading.Skeleton />
    </PageContainer>
  );
}

export default function OnboardingPage() {
  return (
    <GuardedContent skeleton={<OnboardingSkeleton />}>
      <PageContainer>
        <PageHeading
          title="Onboarding"
          description="Tell us about your health and goals so we can build your training plan."
        />
        <OnboardingView />
      </PageContainer>
    </GuardedContent>
  );
}
