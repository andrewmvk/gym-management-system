'use client';

import type { MuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { AtSignIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { type MentionChip, mentionKey, useCoach } from '@/app/(member)/coach/coach-context';
import { MuscleDetail, type PanelExercise } from '@/app/(member)/plan/muscle-detail';
import { MuscleLoadView, type MusclePointTarget } from '@/components/muscle-map/muscle-load-view';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface DistributionPointing {
  isActive: boolean;
  isMarked: boolean;
  onPoint: () => void;
}

// From lg the panel sits beside the plan and follows it down the page, so the map and the plan are on
// screen together. Its head stays put and only the body scrolls, and only on a short screen. While the member
// is pointing the coach at things, the head is the target for the whole distribution.
function PanelShell({ children, distribution }: { children: ReactNode; distribution?: DistributionPointing }) {
  const isPointing = Boolean(distribution?.isActive);
  return (
    <section
      aria-label="Muscle map"
      className="flex flex-col overflow-hidden rounded-lg border bg-card lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]"
    >
      <div
        className={cn(
          'relative shrink-0 border-b px-5 py-4 transition-colors sm:px-6',
          isPointing && 'outline-2 -outline-offset-2 outline-primary/60 outline-dashed',
          distribution?.isMarked && 'bg-accent/50 outline-solid outline-primary',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">Muscle map</h2>
          {distribution?.isMarked && (
            <span className="flex h-6 items-center gap-1 rounded-sm bg-primary px-2 font-display text-xs font-semibold tracking-widest text-primary-foreground uppercase">
              <AtSignIcon className="size-3" aria-hidden />
              Pointed at
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isPointing
            ? 'Tap here to ask about the whole distribution, or a muscle or group below.'
            : "Where today's plan lands. Tap a muscle to see which exercises train it."}
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
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
  muscleLoad: MuscleLoad;
  exercises: readonly PanelExercise[];
  selected: MuscleId | null;
  onSelectedChange: (muscle: MuscleId | null) => void;
}

function toChip(target: MusclePointTarget): MentionChip {
  return target;
}

function PlanMusclePanelRoot({ muscleLoad, exercises, selected, onSelectedChange }: PlanMusclePanelProps) {
  const trpc = useTRPC();
  const coach = useCoach();
  const markedKeys = new Set(coach.mentions.map(mentionKey));

  // An enhancement only: without the injuries (still loading or failed) the map simply draws without them.
  const injuriesQuery = useQuery(trpc.profile.listActiveInjuries.queryOptions());
  const injured = new Map<MuscleId, string>();
  for (const injury of injuriesQuery.data ?? []) {
    for (const muscle of injury.muscles) {
      const known = injured.get(muscle);
      injured.set(muscle, known ? `${known}; ${injury.description}` : injury.description);
    }
  }

  return (
    <PanelShell
      distribution={{
        isActive: coach.isPointing,
        isMarked: markedKeys.has('distribution'),
        onPoint: () => coach.toggleMention({ type: 'distribution' }),
      }}
    >
      <MuscleLoadView
        load={muscleLoad}
        label="Muscles worked in today's plan"
        includeUntrained
        isPaired
        selected={selected}
        onSelectedChange={onSelectedChange}
        injured={injured}
        pointing={{
          isActive: coach.isPointing,
          isMarked: (target) => markedKeys.has(mentionKey(toChip(target))),
          onPoint: (target) => coach.toggleMention(toChip(target)),
        }}
        emptyNote="Nothing in today's plan can be done right now."
        detail={(muscle) => <MuscleDetail muscle={muscle} exercises={exercises} injury={injured.get(muscle)} />}
      />
    </PanelShell>
  );
}

export const PlanMusclePanel = Object.assign(PlanMusclePanelRoot, { Skeleton: PlanMusclePanelSkeleton });
