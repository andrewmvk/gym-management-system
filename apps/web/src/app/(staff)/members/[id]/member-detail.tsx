'use client';

import { MemberDetailBody, MemberDetailSkeleton } from '@/app/(staff)/members/[id]/member-detail-body';
import { GuardedContent } from '@/components/guarded-content';

export function MemberDetail({ userId }: { userId: string }) {
  return (
    <GuardedContent skeleton={<MemberDetailSkeleton />}>
      <MemberDetailBody userId={userId} />
    </GuardedContent>
  );
}
