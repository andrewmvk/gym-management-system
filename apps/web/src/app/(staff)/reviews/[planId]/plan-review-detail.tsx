'use client';

import { DetailLayout } from '@/app/(staff)/reviews/[planId]/detail-layout';
import { PlanReviewBody } from '@/app/(staff)/reviews/[planId]/plan-review-body';
import { GuardedContent } from '@/components/guarded-content';

// Keyed by plan so moving to a neighbouring plan starts from that plan's own exercises, never the previous draft.
export function PlanReviewDetail({ planId }: { planId: string }) {
  return (
    <GuardedContent skeleton={<DetailLayout.Skeleton />}>
      <PlanReviewBody key={planId} planId={planId} />
    </GuardedContent>
  );
}
