'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { StreamedPlanExercise } from '@/app/(member)/plan/plan-build-progress';
import { type PlanOverwriteConfirmation, PlanOverwriteDialog } from '@/app/(member)/plan/plan-overwrite-dialog';
import { useStreamAction } from '@/hooks/use-stream-action';
import { useTRPC, useTRPCClient } from '@/lib/trpc';

interface UseRebuildPlanOptions {
  successMessage?: string;
  // The caller shows the failure in place (an error panel with a retry), so no toast repeats it.
  isErrorInline?: boolean;
}

export const PLAN_BUILD_FAILED_MESSAGE = "We couldn't build your plan right now. Nothing was changed. Try again.";

// One place for "build or rebuild today's plan". The server asks for confirmation only when the plan holds
// something worth protecting (a trainer edit or ticked exercises), so a plain rebuild runs straight away and
// a guarded one waits for the dialog. Exercises arrive in `streamed` while the plan is being written.
export function useRebuildPlan({ successMessage, isErrorInline }: UseRebuildPlanOptions = {}) {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<PlanOverwriteConfirmation | null>(null);
  const [streamed, setStreamed] = useState<StreamedPlanExercise[]>([]);

  const rebuild = useStreamAction({
    run: (input: { confirmOverwrite: boolean }) => client.plans.generateToday.mutate(input),
    onEvent: (event) => {
      if (event.type === 'exercise') {
        setStreamed((current) => [...current, event.exercise]);
        return;
      }
      if (event.result.status === 'needs_confirmation') {
        setConfirmation(event.result);
        return;
      }
      queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.plans.listDays.queryKey() });
      if (successMessage) toast.message(successMessage);
    },
    onError: () => {
      if (!isErrorInline) toast.error(PLAN_BUILD_FAILED_MESSAGE);
    },
  });

  function run(confirmOverwrite: boolean) {
    setStreamed([]);
    rebuild.start({ confirmOverwrite });
  }

  function confirmOverwrite() {
    setConfirmation(null);
    run(true);
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
    requestRebuild: () => run(false),
    streamed,
    dialog,
  };
}
