import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

// The member's own sets, reps and weight for one exercise. Every plan view that can still be done reads from
// the same queries, so all of them are refreshed.
export function useUpdateExerciseNumbers() {
  const { t } = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.plans.updateExercise.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.plans.listDays.queryKey() });
        toast.message(t('Saved. Your coach will remember this change.'));
      },
      onError: () => toast.error(t("We couldn't save that change. Nothing was changed. Try again.")),
    }),
  );
}
