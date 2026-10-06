import { MemberSection } from '@/app/(staff)/members/[id]/member-section';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, toIsoDate } from '@/lib/calendar-date';
import { formatPlanDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const DAYS = 30;
const TITLE = 'Check-ins';

function MemberCheckInsSectionSkeleton() {
  return (
    <MemberSection title={TITLE} description={<Skeleton className="mt-1 h-5 w-64 max-w-full" />}>
      <div className="px-5 py-5 sm:px-6">
        <Skeleton className="h-8 w-full" />
      </div>
    </MemberSection>
  );
}

// One slanted segment per calendar day, oldest to newest, in the lean of the week strip: solid for a day with a
// check-in, gray without one. Each segment names its date and the fact, so the strip reads without colour.
function MemberCheckInsSectionRoot({ checkInDates }: { checkInDates: readonly string[] }) {
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, index) => toIsoDate(addDays(today, index - (DAYS - 1))));
  const attended = new Set(checkInDates);
  const count = days.filter((day) => attended.has(day)).length;
  const last = checkInDates[0];

  return (
    <MemberSection
      title={TITLE}
      description={
        <>
          <span className="numerals text-base font-semibold text-foreground">{count}</span>{' '}
          {count === 1 ? 'day' : 'days'} with a check-in in the last{' '}
          <span className="numerals text-base font-semibold text-foreground">{DAYS}</span> days
          {last && <>, the latest on {formatPlanDate(last)}</>}.
        </>
      }
    >
      <ul aria-label="Check-ins in the last 30 days" className="flex gap-1 px-5 py-5 sm:px-6">
        {days.map((day) => {
          const isChecked = attended.has(day);
          return (
            <li
              key={day}
              aria-label={`${formatPlanDate(day)}: ${isChecked ? 'checked in' : 'no check-in'}`}
              className={cn('h-8 min-w-0 flex-1 -skew-x-12 rounded-xs', isChecked ? 'bg-primary' : 'bg-muted')}
            />
          );
        })}
      </ul>
    </MemberSection>
  );
}

export const MemberCheckInsSection = Object.assign(MemberCheckInsSectionRoot, {
  Skeleton: MemberCheckInsSectionSkeleton,
});
