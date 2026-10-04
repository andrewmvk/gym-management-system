'use client';

import { subject } from '@cadence/shared/auth';
import { computeMuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, ClipboardXIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { BlockedBanner } from '@/app/(staff)/reviews/[planId]/blocked-banner';
import { DetailLayout } from '@/app/(staff)/reviews/[planId]/detail-layout';
import { ExercisePicker } from '@/app/(staff)/reviews/[planId]/exercise-picker';
import { MemberContextCard } from '@/app/(staff)/reviews/[planId]/member-context-card';
import { PlanMusclePreview } from '@/app/(staff)/reviews/[planId]/plan-muscle-preview';
import { PlanNeighbors } from '@/app/(staff)/reviews/[planId]/plan-neighbors';
import { ReviewHistory } from '@/app/(staff)/reviews/[planId]/review-history';
import { useQueueFilters } from '@/app/(staff)/reviews/use-queue-filters';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { PlanStatusBadge } from '@/components/plan-status-badge';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toIsoDate } from '@/lib/calendar-date';
import { serverMessage } from '@/lib/error-message';
import { formatPlanDate } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface EditableExercise {
  // Client-only row identity: the same exercise can appear twice, and rows get removed mid-list.
  key: string;
  exerciseId: string;
  sets: number;
  reps: number;
  load: string;
  isCompleted: boolean;
}

// On phones the exercise name takes its own line and the three inputs share the next one.
const ROW_GRID = 'grid grid-cols-12 items-center gap-2';
const CELL = {
  name: 'col-span-12 sm:col-span-5',
  count: 'col-span-3 sm:col-span-2',
  load: 'col-span-4 sm:col-span-2',
  action: 'col-span-2 justify-self-end sm:col-span-1',
};

const ANY_TRAINING_PLAN = subject('TrainingPlan', {});

function toEditable(exercise: {
  exerciseId: string;
  sets: number;
  reps: number;
  load: string | null;
  completed: boolean;
}): EditableExercise {
  return {
    key: crypto.randomUUID(),
    exerciseId: exercise.exerciseId,
    sets: exercise.sets,
    reps: exercise.reps,
    load: exercise.load ?? '',
    isCompleted: exercise.completed,
  };
}

function signature(exercises: readonly Pick<EditableExercise, 'exerciseId' | 'sets' | 'reps' | 'load'>[]) {
  return JSON.stringify(exercises.map(({ exerciseId, sets, reps, load }) => [exerciseId, sets, reps, load.trim()]));
}

export function PlanReviewBody({ planId }: { planId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const { search } = useQueueFilters();
  const planQuery = useQuery(trpc.reviews.getPlan.queryOptions({ planId }));

  const [exercises, setExercises] = useState<EditableExercise[] | null>(null);
  const [note, setNote] = useState('');

  const back = { href: `/reviews${search}`, label: 'Back to queue' };

  // Seeds local editable state from the server once, and again after a successful save (via
  // onSuccess's setExercises(null) below) - never on a plain background refetch, so it doesn't clobber
  // edits the trainer is still typing.
  useEffect(() => {
    if (planQuery.data && exercises === null) {
      setExercises(planQuery.data.exercises.map(toEditable));
    }
  }, [planQuery.data, exercises]);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.reviews.getPlan.queryKey({ planId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.reviews.queue.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.reviews.overview.queryKey() }),
    ]);

  const addNote = useMutation(
    trpc.reviews.addNote.mutationOptions({
      onSuccess: async () => {
        setNote('');
        await invalidate();
        toast.success('Note added to the review history.');
      },
      onError: (error) => toast.error(serverMessage(error, "We couldn't save that note. Try again.")),
    }),
  );

  const editPlan = useMutation(
    trpc.reviews.editPlan.mutationOptions({
      onSuccess: async () => {
        setNote('');
        await invalidate();
        setExercises(null);
        toast.success('Plan updated. The member sees it right away.');
      },
      onError: (error) => toast.error(serverMessage(error, "We couldn't save those changes. Try again.")),
    }),
  );

  function updateExercise(index: number, patch: Partial<EditableExercise>) {
    setExercises(
      (current) => current?.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise)) ?? current,
    );
  }

  function removeExercise(index: number) {
    setExercises((current) => current?.filter((_, i) => i !== index) ?? current);
  }

  function addExercise(exerciseId: string) {
    setExercises((current) => [
      ...(current ?? []),
      { key: crypto.randomUUID(), exerciseId, sets: 3, reps: 10, load: '', isCompleted: false },
    ]);
  }

  if (planQuery.isPending) {
    return (
      <Deferred>
        <DetailLayout.Skeleton />
      </Deferred>
    );
  }

  if (planQuery.isError) {
    return (
      <PageContainer>
        <PageHeading title="Plan review" back={back} />
        {planQuery.error.data?.code === 'NOT_FOUND' ? (
          <div className="rounded-lg border bg-card">
            <EmptyState
              icon={ClipboardXIcon}
              title="Plan not found"
              description="This plan does not exist any more, or the link is wrong. Go back to the queue to pick another."
            />
          </div>
        ) : (
          <QueryError
            title="We couldn't load this plan"
            onRetry={() => planQuery.refetch()}
            isRetrying={planQuery.isRefetching}
          />
        )}
      </PageContainer>
    );
  }

  const {
    plan,
    reviews,
    catalog,
    recentMuscleLoad,
    muscleFocus,
    blocked,
    memberContext,
    exercises: saved,
  } = planQuery.data;

  const isPast = plan.planDate < toIsoDate(new Date());
  const canNote = ability.can('manage', 'PlanReview');
  const canEditPlan = canNote && ability.can('update', ANY_TRAINING_PLAN);
  const canEdit = canEditPlan && !isPast;
  const isChanged =
    exercises !== null && signature(exercises) !== signature(saved.map((row) => ({ ...row, load: row.load ?? '' })));
  const isSaving = editPlan.isPending;

  let readOnlyMessage: string | null = null;
  if (!canNote) readOnlyMessage = 'You can read this plan. Trainers edit it and leave notes.';
  else if (!canEditPlan) readOnlyMessage = 'You can leave notes on this plan, but not change its exercises.';
  else if (isPast) readOnlyMessage = 'Past plans cannot be edited. You can still leave a note.';

  // The preview follows the rows being edited; exercises that cannot be done today are left out, as in the member's view.
  const planLoad = computeMuscleLoad(
    (exercises ?? []).flatMap((exercise) => {
      const details = catalog.find((entry) => entry.id === exercise.exerciseId);
      return details?.isAvailable ? [{ sets: exercise.sets, muscles: details.muscles }] : [];
    }),
  );

  return (
    <DetailLayout
      heading={
        <PageHeading
          back={back}
          title={plan.memberName}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>
                Plan for{' '}
                <span className="font-semibold text-foreground">
                  {formatPlanDate(plan.planDate, { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </span>
              <span className="text-muted-foreground">{plan.memberEmail}</span>
            </span>
          }
          actions={<PlanStatusBadge status={plan.status} />}
        />
      }
      navigation={<PlanNeighbors planId={planId} />}
      context={memberContext && <MemberContextCard memberId={plan.userId} context={memberContext} />}
      editor={
        <div className="flex flex-col gap-6">
          {blocked.length > 0 && <BlockedBanner blocked={blocked} />}
          <Card className="gap-0 pb-0">
            <CardHeader className="border-b">
              <CardTitle>Exercises</CardTitle>
              <CardDescription>
                {readOnlyMessage ?? 'Changes publish to the member as soon as you save.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col py-2">
              <div
                className={`${ROW_GRID} border-b py-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase sm:border-b-0`}
              >
                <span className={`${CELL.name} hidden sm:block`}>Exercise</span>
                <span className={CELL.count}>Sets</span>
                <span className={CELL.count}>Reps</span>
                <span className={CELL.load}>Load</span>
                <span className={CELL.action} />
              </div>
              {exercises?.map((exercise, index) => {
                const details = catalog.find((c) => c.id === exercise.exerciseId);
                const name = details?.name ?? 'Unknown exercise';
                return (
                  <div key={exercise.key} className={`${ROW_GRID} border-b py-3 last:border-b-0`}>
                    <span className={`${CELL.name} flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold`}>
                      <span className="numerals text-lg text-muted-foreground">{index + 1}</span>
                      <span
                        className={cn(
                          'truncate',
                          exercise.isCompleted && 'text-muted-foreground line-through decoration-2',
                        )}
                      >
                        {name}
                      </span>
                      {exercise.isCompleted && (
                        <span className="inline-flex items-center gap-1 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          <CheckIcon className="size-3.5" aria-hidden />
                          Done
                        </span>
                      )}
                      {details && !details.isAvailable && (
                        <Badge variant="unavailable">
                          Out of service
                          {details.equipment.some((item) => !item.isAvailable) &&
                            `: ${details.equipment
                              .filter((item) => !item.isAvailable)
                              .map((item) => item.name)
                              .join(', ')}`}
                        </Badge>
                      )}
                    </span>
                    {canEdit ? (
                      <>
                        <Input
                          type="number"
                          min={1}
                          className={`${CELL.count} numerals text-lg`}
                          value={exercise.sets}
                          onChange={(e) => updateExercise(index, { sets: Number(e.target.value) })}
                          aria-label={`Sets for ${name}`}
                        />
                        <Input
                          type="number"
                          min={1}
                          className={`${CELL.count} numerals text-lg`}
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, { reps: Number(e.target.value) })}
                          aria-label={`Reps for ${name}`}
                        />
                        <Input
                          className={CELL.load}
                          placeholder="Load"
                          value={exercise.load}
                          onChange={(e) => updateExercise(index, { load: e.target.value })}
                          aria-label={`Load for ${name}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={`${CELL.action} text-muted-foreground hover:text-destructive`}
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2Icon />
                          <span className="sr-only">Remove {name}</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className={`${CELL.count} numerals text-lg`}>{exercise.sets}</span>
                        <span className={`${CELL.count} numerals text-lg`}>{exercise.reps}</span>
                        <span className={`${CELL.load} text-sm text-muted-foreground`}>{exercise.load || 'None'}</span>
                        <span className={CELL.action} />
                      </>
                    )}
                  </div>
                );
              })}

              {canEdit && (
                <div className="py-4">
                  <ExercisePicker exercises={catalog} onPick={addExercise} />
                </div>
              )}
            </CardContent>
            {canNote && (
              <CardFooter className="flex-col items-stretch gap-3">
                <Field>
                  <FieldLabel htmlFor="review-note">Note for the review history</FieldLabel>
                  <Textarea
                    id="review-note"
                    className="min-h-16"
                    placeholder="Why you changed it, or what the next trainer should know"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <FieldDescription>
                    {canEdit
                      ? 'Save changes publishes your edits and attaches this note to them. Add note only leaves the exercises as they are. The member reads the note on their plan.'
                      : 'The note joins the review history. The member reads the note on their plan.'}
                  </FieldDescription>
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={addNote.isPending || !note.trim()}
                    onClick={() => addNote.mutate({ planId, note: note.trim() })}
                  >
                    {addNote.isPending ? 'Adding...' : 'Add note only'}
                  </Button>
                  {canEdit && (
                    <Button
                      type="button"
                      disabled={isSaving || !isChanged}
                      onClick={() =>
                        exercises &&
                        editPlan.mutate({
                          planId,
                          exercises: exercises.map(({ exerciseId, sets, reps, load }) => ({
                            exerciseId,
                            sets,
                            reps,
                            load: load.trim() || undefined,
                          })),
                          note: note.trim() || undefined,
                        })
                      }
                    >
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      }
      preview={<PlanMusclePreview planLoad={planLoad} recentLoad={recentMuscleLoad} focus={muscleFocus} />}
      history={<ReviewHistory reviews={reviews} />}
    />
  );
}
