'use client';

import { PolicyManagement } from '@/app/(staff)/policies/policy-management';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function PoliciesHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Policies')}
      description={t('What each account can do. Grants change existing accounts only; none creates one.')}
    />
  );
}

function PoliciesSkeleton() {
  return (
    <PageContainer>
      <PoliciesHeading />
      <PolicyManagement.Skeleton />
    </PageContainer>
  );
}

export default function PoliciesPage() {
  return (
    <GuardedContent skeleton={<PoliciesSkeleton />}>
      <PageContainer>
        <PoliciesHeading />
        <PolicyManagement />
      </PageContainer>
    </GuardedContent>
  );
}
