import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { OnboardingFormOutput } from '@/app/(member)/onboarding/onboarding-form-types';
import type { StreamedPlanExercise } from '@/app/(member)/plan/plan-build-progress';
import { useStreamAction } from '@/hooks/use-stream-action';
import { useTRPC, useTRPCClient } from '@/lib/trpc';

// building: the plan is being written; built or kept: the server finished it; failed: the information is
// saved but the plan could not be built.
export type PlanOutcome = 'idle' | 'building' | 'built' | 'kept' | 'failed';

interface UseOnboardingSubmitOptions {
  onSaved: () => void;
}

// The server saves the information first and then writes the plan, streaming each exercise. A failure before
// the information is saved is the member's to retry; one after it only concerns the plan.
export function useOnboardingSubmit({ onSaved }: UseOnboardingSubmitOptions) {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const [streamed, setStreamed] = useState<StreamedPlanExercise[]>([]);
  const [outcome, setOutcome] = useState<PlanOutcome>('idle');
  const hasSavedRef = useRef(false);

  const submit = useStreamAction({
    run: (input: OnboardingFormOutput) => client.onboarding.submit.mutate(input),
    onEvent: (event) => {
      if (event.type === 'saved') {
        hasSavedRef.current = true;
        setOutcome('building');
        queryClient.invalidateQueries({ queryKey: trpc.onboarding.getStatus.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.onboarding.listMine.queryKey() });
        onSaved();
      } else if (event.type === 'exercise') {
        setStreamed((current) => [...current, event.exercise]);
      } else {
        setOutcome(event.plan);
        queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.plans.listDays.queryKey() });
      }
    },
    onError: () => {
      if (hasSavedRef.current) {
        setOutcome('failed');
        return;
      }
      setOutcome('idle');
      toast.error("We couldn't save your information. Nothing was changed. Try again.");
    },
  });

  return {
    start: (input: OnboardingFormOutput) => {
      hasSavedRef.current = false;
      setStreamed([]);
      setOutcome('idle');
      submit.start(input);
    },
    isPending: submit.isPending,
    outcome,
    streamed,
  };
}
