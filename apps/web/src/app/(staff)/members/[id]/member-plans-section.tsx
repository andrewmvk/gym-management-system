import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { MemberSection } from '@/app/(staff)/members/[id]/member-section';
import { PlanStatusBadge } from '@/components/plan-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPlanDate } from '@/lib/format';

interface MemberPlan {
  id: string;
  planDate: string;
  status: 'ai_published' | 'trainer_edited';
  exerciseCount: number;
  completedCount: number;
  noteCount: number;
}

const TITLE = 'Plans';
const DESCRIPTION = 'The last 60 days and any plan dated later, newest first. Each opens its review.';
const SKELETON_ROWS = 4;

function MemberPlansSectionSkeleton() {
  return (
    <MemberSection title={TITLE} description={DESCRIPTION}>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <div key={index} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="ml-auto h-6 w-24" />
        </div>
      ))}
    </MemberSection>
  );
}

function MemberPlansSectionRoot({ plans }: { plans: readonly MemberPlan[] }) {
  if (plans.length === 0) {
    return (
      <MemberSection title={TITLE} description={DESCRIPTION}>
        <p className="px-5 py-4 text-muted-foreground sm:px-6">This member has no plans in that period.</p>
      </MemberSection>
    );
  }

  return (
    <MemberSection title={TITLE} description={DESCRIPTION}>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id} className="relative border-b last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-muted/60 sm:px-6">
              <Link
                href={`/reviews/${plan.id}`}
                className="min-w-32 rounded-sm font-semibold outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset"
              >
                {formatPlanDate(plan.planDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </Link>
              <PlanStatusBadge status={plan.status} hasNote={plan.noteCount > 0} />
              <span className="ml-auto flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Done <span className="numerals text-lg font-semibold text-foreground">{plan.completedCount}</span> of{' '}
                  <span className="numerals text-lg font-semibold text-foreground">{plan.exerciseCount}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="numerals text-lg font-semibold text-foreground">{plan.noteCount}</span>{' '}
                  {plan.noteCount === 1 ? 'note' : 'notes'}
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </MemberSection>
  );
}

export const MemberPlansSection = Object.assign(MemberPlansSectionRoot, { Skeleton: MemberPlansSectionSkeleton });
