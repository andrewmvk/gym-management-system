'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '@/lib/trpc';

// Ticking an exercise updates today's plan at once and rolls back with a toast if the save fails.
export function useToggleExercise() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const todayKey = trpc.plans.getToday.queryKey();

  return useMutation(
    trpc.plans.markExerciseCompleted.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: todayKey });
        const previous = queryClient.getQueryData(todayKey);
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
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) queryClient.setQueryData(todayKey, context.previous);
        toast.error("We couldn't update that exercise. Try again.");
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: todayKey }),
    }),
  );
}
