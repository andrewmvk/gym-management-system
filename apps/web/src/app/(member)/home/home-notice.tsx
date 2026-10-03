'use client';

import { useQuery } from '@tanstack/react-query';
import { NeedsReviewNotice } from '@/app/(member)/plan/needs-review-notice';
import { useTRPC } from '@/lib/trpc';

// Sits right under the hero, and only while today's plan holds an exercise that cannot be done.
export function HomeNotice() {
  const trpc = useTRPC();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());
  const plan = todayQuery.data;

  if (!plan?.needsReview) return null;

  return (
    <NeedsReviewNotice
      exercises={plan.exercises}
      planStatus={plan.status}
      hasCompleted={plan.exercises.some((exercise) => exercise.completed)}
      className="rounded-lg"
    />
  );
}
