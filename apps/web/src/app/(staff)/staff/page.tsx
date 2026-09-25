'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

function StaffHomeSkeleton() {
  return (
    <PageContainer width="wide">
      <PageHeading.Skeleton />
    </PageContainer>
  );
}

export default function StaffHomePage() {
  return (
    <GuardedContent skeleton={<StaffHomeSkeleton />}>
      <PageContainer width="wide">
        <PageHeading
          title="Staff area"
          description="Plan reviews, the catalog and gym settings will show up here."
        />
      </PageContainer>
    </GuardedContent>
  );
}
