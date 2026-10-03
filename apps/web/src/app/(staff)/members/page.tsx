'use client';

import { MembersTable } from '@/app/(staff)/members/members-table';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Members';
const DESCRIPTION =
  'Membership status and plan for everyone who has signed up. Both are mocked, with no billing behind them.';

function MembersSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <MembersTable.Skeleton />
    </PageContainer>
  );
}

export default function MembersPage() {
  return (
    <GuardedContent skeleton={<MembersSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <MembersTable />
      </PageContainer>
    </GuardedContent>
  );
}
