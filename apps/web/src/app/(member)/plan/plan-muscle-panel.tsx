'use client';

import type { MuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import { type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useCoach } from '@/app/(member)/coach/coach-context';
import { MuscleDetail, type PanelExercise } from '@/app/(member)/plan/muscle-detail';
import { useRebuildPlan } from '@/app/(member)/plan/use-rebuild-plan';
import { AiButton } from '@/components/ai-button';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { focusToMap } from '@/components/muscle-map/muscle-marks';
import { useTRPC } from '@/lib/trpc';

function PanelShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label="Muscle map" className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">Muscle map</h2>
        <p className="text-sm text-muted-foreground">
          Where today&apos;s plan lands. Tap a muscle to see its exercises and steer your next plans.
        </p>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer}
    </section>
  );
}

function PlanMusclePanelSkeleton() {
  return (
    <PanelShell>
      <MuscleLoadView.Skeleton isSingleView />
    </PanelShell>
  );
}

interface PlanMusclePanelProps {
  muscleLoad: MuscleLoad;
  exercises: readonly PanelExercise[];
  selected: MuscleId | null;
  onSelectedChange: (muscle: MuscleId | null) => void;
}

function PlanMusclePanelRoot({ muscleLoad, exercises, selected, onSelectedChange }: PlanMusclePanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const focusQuery = useQuery(trpc.focus.get.queryOptions());
  const focusKey = trpc.focus.get.queryKey();

  const setFocus = useMutation(
    trpc.focus.set.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: focusKey });
        const previous = queryClient.getQueryData(focusKey);
        queryClient.setQueryData(focusKey, (old) => [
          ...(old ?? []).filter((entry) => entry.muscle !== input.muscle),
          ...(input.bias === 0 ? [] : [input]),
        ]);
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) queryClient.setQueryData(focusKey, context.previous);
        toast.error("We couldn't save that focus. Try again.");
      },
      // Only the last of several quick taps refetches, so an early response never overwrites a later tap.
      onSettled: () => {
        if (queryClient.isMutating({ mutationKey: trpc.focus.set.mutationKey() }) === 1) {
          queryClient.invalidateQueries({ queryKey: focusKey });
        }
      },
    }),
  );

  const rebuild = useRebuildPlan({ successMessage: 'Your plan was rebuilt with your muscle focus.' });
  const coach = useCoach();

  // An enhancement only: without the injuries (still loading or failed) the map simply draws without them.
  const injuriesQuery = useQuery(trpc.profile.listActiveInjuries.queryOptions());
  const injured = new Map<MuscleId, string>();
  for (const injury of injuriesQuery.data ?? []) {
    for (const muscle of injury.muscles) {
      const known = injured.get(muscle);
      injured.set(muscle, known ? `${known}; ${injury.description}` : injury.description);
    }
  }

  const focus = focusToMap(focusQuery.data ?? []);
  const canEditFocus = focusQuery.isSuccess;

  return (
    <>
      <PanelShell
        footer={
          <div className="flex flex-col gap-2 border-t bg-muted/60 px-5 py-4 sm:px-6">
            <AiButton
              variant="outline"
              isPending={rebuild.isPending}
              pendingLabel="Rebuilding..."
              onClick={rebuild.requestRebuild}
            >
              Rebuild today with my focus
            </AiButton>
            {focusQuery.isError && (
              <p role="alert" className="text-sm text-destructive">
                We couldn&apos;t load your muscle focus, so it can&apos;t be changed right now.
              </p>
            )}
          </div>
        }
      >
        <MuscleLoadView
          load={muscleLoad}
          focus={focus}
          label="Muscles worked in today's plan"
          includeUntrained
          isSingleView
          selected={selected}
          onSelectedChange={onSelectedChange}
          injured={injured}
          emptyNote="Nothing in today's plan can be done right now."
          detail={(muscle) => (
            <MuscleDetail
              muscle={muscle}
              exercises={exercises}
              bias={focus[muscle]}
              onBias={(bias) => setFocus.mutate({ muscle, bias })}
              isBiasDisabled={!canEditFocus}
              injury={injured.get(muscle)}
              onAsk={() =>
                coach.ask({
                  mentions: [{ type: 'muscle', muscle }],
                  message: `Which exercises could I add for my ${muscleLabel(muscle).toLowerCase()}?`,
                })
              }
            />
          )}
        />
      </PanelShell>

      {rebuild.dialog}
    </>
  );
}

export const PlanMusclePanel = Object.assign(PlanMusclePanelRoot, { Skeleton: PlanMusclePanelSkeleton });
