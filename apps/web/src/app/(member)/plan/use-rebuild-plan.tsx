'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { type PlanOverwriteConfirmation, PlanOverwriteDialog } from '@/app/(member)/plan/plan-overwrite-dialog';
import { useTRPC } from '@/lib/trpc';

interface UseRebuildPlanOptions {
  successMessage?: string;
  // The caller shows the failure in place (an error panel with a retry), so no toast repeats it.
  isErrorInline?: boolean;
}

export const PLAN_BUILD_FAILED_MESSAGE = "We couldn't build your plan right now. Nothing was changed. Try again.";

// One place for "build or rebuild today's plan". The server asks for confirmation only when the plan holds
// something worth protecting (a trainer edit or ticked exercises), so a plain rebuild runs straight away and
// a guarded one waits for the dialog.
export function useRebuildPlan({ successMessage, isErrorInline }: UseRebuildPlanOptions = {}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<PlanOverwriteConfirmation | null>(null);

  const rebuild = useMutation(
    trpc.plans.generateToday.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'needs_confirmation') {
          setConfirmation(result);
          return;
        }
        queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.plans.listUpcoming.queryKey() });
        if (successMessage) toast.message(successMessage);
      },
      onError: () => {
        if (!isErrorInline) toast.error(PLAN_BUILD_FAILED_MESSAGE);
      },
    }),
  );

  function confirmOverwrite() {
    setConfirmation(null);
    rebuild.mutate({ confirmOverwrite: true });
  }

  const dialog = (
    <PlanOverwriteDialog
      confirmation={confirmation}
      intent="rebuild"
      onConfirm={confirmOverwrite}
      onCancel={() => setConfirmation(null)}
    />
  );

  return {
    isPending: rebuild.isPending,
    isError: rebuild.isError,
    requestRebuild: () => rebuild.mutate({ confirmOverwrite: false }),
    dialog,
  };
}
