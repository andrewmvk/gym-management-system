'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { inferOutput } from '@trpc/tanstack-react-query';
import { toast } from 'sonner';
import { useTRPC } from '@/lib/trpc';

// Ticking an exercise updates today's plan and the done count of today in the day strip at once, and rolls
// both back with a toast if the save fails.
export function useToggleExercise() {
  const trpc = useTRPC();
  type PlanDays = inferOutput<typeof trpc.plans.listDays>;
  const queryClient = useQueryClient();
  const todayKey = trpc.plans.getToday.queryKey();
  const daysKey = trpc.plans.listDays.queryKey();

  return useMutation(
    trpc.plans.markExerciseCompleted.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: todayKey });
        const previous = queryClient.getQueryData(todayKey);
        const previousDays = queryClient.getQueriesData({ queryKey: daysKey });
        const wasCompleted = previous?.exercises.find((exercise) => exercise.id === input.planExerciseId)?.completed;
        queryClient.setQueryData(todayKey, (old) =>
          old
            ? {
                ...old,
                exercises: old.exercises.map((exercise) =>
                  exercise.id === input.planExerciseId ? { ...exercise, completed: input.completed } : exercise,
                ),
              }
            : old,
        );
        if (previous && wasCompleted !== undefined && wasCompleted !== input.completed) {
          queryClient.setQueriesData<PlanDays>({ queryKey: daysKey }, (old) =>
            old?.map((day) =>
              day.planDate === previous.planDate
                ? { ...day, completedCount: day.completedCount + (input.completed ? 1 : -1) }
                : day,
            ),
          );
        }
        return { previous, previousDays };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) queryClient.setQueryData(todayKey, context.previous);
        for (const [key, data] of context?.previousDays ?? []) queryClient.setQueryData(key, data);
        toast.error("We couldn't update that exercise. Try again.");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: todayKey });
        queryClient.invalidateQueries({ queryKey: daysKey });
      },
    }),
  );
}
