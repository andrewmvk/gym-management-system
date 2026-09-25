'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

function MemberHomeSkeleton() {
  return (
    <PageContainer width="narrow">
      <PageHeading.Skeleton />
    </PageContainer>
  );
}

export default function MemberHomePage() {
  return (
    <GuardedContent skeleton={<MemberHomeSkeleton />}>
      <PageContainer width="narrow">
        <PageHeading title="Welcome back" description="Your training plan and check-ins will show up here." />
      </PageContainer>
    </GuardedContent>
  );
}
