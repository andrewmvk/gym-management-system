'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTRPC } from '@/lib/trpc';

interface UseRebuildPlanOptions {
  planStatus: 'ai_published' | 'trainer_edited';
  hasCompleted: boolean;
  successMessage: string;
}

// One place for "rebuild today's plan": the confirm dialog says what gets replaced, and the rebuild
// always runs confirmed because the dialog already named the trainer edit it would overwrite.
export function useRebuildPlan({ planStatus, hasCompleted, successMessage }: UseRebuildPlanOptions) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  const rebuild = useMutation(
    trpc.plans.generateToday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
        toast.message(successMessage);
      },
      onError: () => toast.error("We couldn't rebuild your plan. Try again."),
    }),
  );

  const dialog = (
    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rebuild today&apos;s plan?</AlertDialogTitle>
          <AlertDialogDescription>
            Your coach builds a new plan from what can be done right now.
            {hasCompleted ? ' Exercises you already ticked off are cleared.' : ''}
            {planStatus === 'trainer_edited' ? ' A trainer edited this plan, and rebuilding replaces their edits.' : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep this plan</AlertDialogCancel>
          <AlertDialogAction onClick={() => rebuild.mutate({ confirmOverwrite: true })}>Rebuild</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { isPending: rebuild.isPending, requestRebuild: () => setIsConfirming(true), dialog };
}
