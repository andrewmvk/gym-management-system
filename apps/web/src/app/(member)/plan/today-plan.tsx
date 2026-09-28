'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { ExerciseRow } from './exercise-row';

function TodayPlanSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        {Array.from({ length: 4 }, (_, index) => (
          <ExerciseRow.Skeleton key={index} />
        ))}
      </CardContent>
    </Card>
  );
}

function TodayPlanRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());

  const generate = useMutation(
    trpc.plans.generateToday.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() }),
      onError: () => toast.error("We couldn't generate your plan. Try again."),
    }),
  );

  const toggle = useMutation(
    trpc.plans.markExerciseCompleted.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: trpc.plans.getToday.queryKey() });
        const previous = queryClient.getQueryData(trpc.plans.getToday.queryKey());
        queryClient.setQueryData(trpc.plans.getToday.queryKey(), (old) =>
          old
            ? {
                ...old,
                exercises: old.exercises.map((exercise) =>
                  exercise.id === input.planExerciseId ? { ...exercise, completed: input.completed } : exercise,
                ),
              }
            : old,
        );
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) queryClient.setQueryData(trpc.plans.getToday.queryKey(), context.previous);
        toast.error("We couldn't update that exercise. Try again.");
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() }),
    }),
  );

  if (todayQuery.isPending) return <TodayPlanSkeleton />;

  if (todayQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>We couldn&apos;t load today&apos;s plan.</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => todayQuery.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!todayQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No plan yet for today</CardTitle>
          <CardDescription>Generate your training plan to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled={generate.isPending} onClick={() => generate.mutate({})}>
            {generate.isPending ? 'Generating...' : 'Generate my plan'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = todayQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Today&apos;s plan</CardTitle>
          <CardDescription>{plan.exercises.length} exercises</CardDescription>
        </div>
        {plan.status === 'trainer_edited' && <Badge variant="secondary">Edited by a trainer</Badge>}
      </CardHeader>
      <CardContent>
        {plan.exercises.map((exercise) => (
          <ExerciseRow
            key={exercise.id}
            name={exercise.exerciseName}
            muscleGroup={exercise.muscleGroup}
            instructions={exercise.instructions}
            sets={exercise.sets}
            reps={exercise.reps}
            load={exercise.load}
            notes={exercise.notes}
            completed={exercise.completed}
            isPerformable={exercise.isPerformable}
            disabled={toggle.isPending}
            onToggle={(completed) => toggle.mutate({ planExerciseId: exercise.id, completed })}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export const TodayPlan = Object.assign(TodayPlanRoot, { Skeleton: TodayPlanSkeleton });
