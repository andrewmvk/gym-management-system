'use client';

import { MembersTable } from '@/app/(staff)/members/members-table';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { useI18n } from '@/lib/i18n/i18n-provider';

function MembersHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Members')}
      description={t(
        'Membership status and plan for everyone who has signed up. Both are mocked, with no billing behind them.',
      )}
    />
  );
}

function MembersSkeleton() {
  return (
    <PageContainer>
      <MembersHeading />
      <MembersTable.Skeleton />
    </PageContainer>
  );
}

export default function MembersPage() {
  return (
    <GuardedContent skeleton={<MembersSkeleton />}>
      <PageContainer>
        <MembersHeading />
        <MembersTable />
      </PageContainer>
    </GuardedContent>
  );
}
