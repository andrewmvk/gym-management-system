'use client';

import { PolicyManagement } from '@/app/(staff)/policies/policy-management';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Policies';
const DESCRIPTION = 'What each account can do. Grants change existing accounts only; none creates one.';

function PoliciesSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <PolicyManagement.Skeleton />
    </PageContainer>
  );
}

export default function PoliciesPage() {
  return (
    <GuardedContent skeleton={<PoliciesSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <PolicyManagement />
      </PageContainer>
    </GuardedContent>
  );
}
