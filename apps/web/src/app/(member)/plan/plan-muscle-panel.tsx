'use client';

import type { MuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { AtSignIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { type MentionChip, mentionKey, useCoach } from '@/app/(member)/coach/coach-context';
import { MuscleDetail, type PanelExercise } from '@/app/(member)/plan/muscle-detail';
import { relationOf } from '@/app/(member)/plan/plan-day';
import { MuscleLoadView, type MusclePointTarget } from '@/components/muscle-map/muscle-load-view';
import { formatPlanDate } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface DistributionPointing {
  isActive: boolean;
  isMarked: boolean;
  onPoint: () => void;
}

// The block of the plan card between its progress and its exercises. While the member is pointing the coach at
// things, the head is the target for the whole distribution.
function PanelShell({
  children,
  distribution,
  description = 'Where the plan lands. Tap a muscle to see which exercises train it.',
}: {
  children: ReactNode;
  distribution?: DistributionPointing;
  description?: string;
}) {
  const isPointing = Boolean(distribution?.isActive);
  return (
    <section aria-label="Muscle map" className="border-b">
      <div
        className={cn(
          'relative px-5 py-4 transition-colors sm:px-6',
          isPointing && 'outline-2 -outline-offset-2 outline-primary/60 outline-dashed',
          distribution?.isMarked && 'bg-accent/50 outline-solid outline-primary',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold tracking-wide uppercase">Muscle map</h3>
          {distribution?.isMarked && (
            <span className="flex h-6 items-center gap-1 rounded-sm bg-primary px-2 font-display text-xs font-semibold tracking-widest text-primary-foreground uppercase">
              <AtSignIcon className="size-3" aria-hidden />
              Pointed at
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isPointing ? 'Tap here to ask about the whole distribution, or a muscle or group below.' : description}
        </p>
        {isPointing && (
          <button
            type="button"
            onClick={distribution?.onPoint}
            aria-pressed={distribution?.isMarked}
            className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
          >
            <span className="sr-only">Point the coach at the whole muscle distribution</span>
          </button>
        )}
      </div>
      <div className="px-5 pb-5 sm:px-6">{children}</div>
    </section>
  );
}

function PlanMusclePanelSkeleton() {
  return (
    <PanelShell>
      <MuscleLoadView.Skeleton isPaired />
    </PanelShell>
  );
}

interface PlanMusclePanelProps {
  date: string;
  todayIso: string;
  muscleLoad: MuscleLoad;
  exercises: readonly PanelExercise[];
  selected: MuscleId | null;
  onSelectedChange: (muscle: MuscleId | null) => void;
}

function toChip(target: MusclePointTarget): MentionChip {
  return target;
}

// The map of the day on screen. A day that has passed is history: no injuries drawn over what was actually
// trained and nothing to point the coach at.
function PlanMusclePanelRoot({
  date,
  todayIso,
  muscleLoad,
  exercises,
  selected,
  onSelectedChange,
}: PlanMusclePanelProps) {
  const trpc = useTRPC();
  const coach = useCoach();
  const markedKeys = new Set(coach.mentions.map(mentionKey));
  const relation = relationOf(date, todayIso);
  const isPast = relation === 'past';
  const subject =
    relation === 'today' ? "today's plan" : `the plan for ${formatPlanDate(date, { day: 'numeric', month: 'short' })}`;

  // An enhancement only: without the injuries (still loading or failed) the map simply draws without them.
  const injuriesQuery = useQuery({ ...trpc.profile.listActiveInjuries.queryOptions(), enabled: !isPast });
  const injured = new Map<MuscleId, string>();
  for (const injury of isPast ? [] : (injuriesQuery.data ?? [])) {
    for (const muscle of injury.muscles) {
      const known = injured.get(muscle);
      injured.set(muscle, known ? `${known}; ${injury.description}` : injury.description);
    }
  }

  return (
    <PanelShell
      description={
        isPast
          ? `What ${subject} trained. Tap a muscle to see which exercises worked it.`
          : `Where ${subject} lands. Tap a muscle to see which exercises train it.`
      }
      distribution={
        isPast
          ? undefined
          : {
              isActive: coach.isPointing,
              isMarked: markedKeys.has('distribution'),
              onPoint: () => coach.toggleMention({ type: 'distribution' }),
            }
      }
    >
      <MuscleLoadView
        load={muscleLoad}
        label={isPast ? `Muscles worked in ${subject}` : `Muscles planned in ${subject}`}
        includeUntrained
        isPaired
        selected={selected}
        onSelectedChange={onSelectedChange}
        injured={injured}
        pointing={
          isPast
            ? undefined
            : {
                isActive: coach.isPointing,
                isMarked: (target) => markedKeys.has(mentionKey(toChip(target))),
                onPoint: (target) => coach.toggleMention(toChip(target)),
              }
        }
        emptyNote={`Nothing in ${subject} can be done right now.`}
        detail={(muscle) => <MuscleDetail muscle={muscle} exercises={exercises} injury={injured.get(muscle)} />}
      />
    </PanelShell>
  );
}

export const PlanMusclePanel = Object.assign(PlanMusclePanelRoot, { Skeleton: PlanMusclePanelSkeleton });
