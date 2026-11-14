'use client';

import { MemberSection } from '@/app/(staff)/members/[id]/member-section';
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, toIsoDate } from '@/lib/calendar-date';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

const DAYS = 30;

function MemberCheckInsSectionSkeleton() {
  const { t } = useI18n();
  return (
    <MemberSection title={t('Check-ins')} description={<Skeleton className="mt-1 h-5 w-64 max-w-full" />}>
      <div className="px-5 py-5 sm:px-6">
        <Skeleton className="h-8 w-full" />
      </div>
    </MemberSection>
  );
}

// One slanted segment per calendar day, oldest to newest, in the lean of the week strip: solid for a day with a
// check-in, gray without one. Each segment names its date and the fact, so the strip reads without colour.
function MemberCheckInsSectionRoot({ checkInDates }: { checkInDates: readonly string[] }) {
  const { t, tn, formatPlanDate } = useI18n();
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, index) => toIsoDate(addDays(today, index - (DAYS - 1))));
  const attended = new Set(checkInDates);
  const count = days.filter((day) => attended.has(day)).length;
  const last = checkInDates[0];
  const countNode = <span className="numerals text-base font-semibold text-foreground">{count}</span>;
  const daysNode = <span className="numerals text-base font-semibold text-foreground">{DAYS}</span>;

  return (
    <MemberSection
      title={t('Check-ins')}
      description={
        <>
          {count === 1
            ? tn('{count} day with a check-in in the last {days} days', { count: countNode, days: daysNode })
            : tn('{count} days with a check-in in the last {days} days', { count: countNode, days: daysNode })}
          {last && t(', the latest on {date}', { date: formatPlanDate(last) })}.
        </>
      }
    >
      <ul aria-label={t('Check-ins in the last 30 days')} className="flex gap-1 px-5 py-5 sm:px-6">
        {days.map((day) => {
          const isChecked = attended.has(day);
          return (
            <li
              key={day}
              aria-label={
                isChecked
                  ? t('{date}: checked in', { date: formatPlanDate(day) })
                  : t('{date}: no check-in', { date: formatPlanDate(day) })
              }
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
