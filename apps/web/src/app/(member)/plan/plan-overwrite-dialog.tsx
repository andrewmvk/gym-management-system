'use client';

import { useRef } from 'react';
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
import { toIsoDate } from '@/lib/calendar-date';
import { formatDateTime, formatPlanDate } from '@/lib/format';

export interface PlanOverwriteConfirmation {
  reason: 'trainer_edited' | 'has_completed';
  editedBy: string | null;
  editedAt: string | Date | null;
  completedCount: number;
}

interface PlanOverwriteDialogProps {
  confirmation: PlanOverwriteConfirmation | null;
  intent: 'rebuild' | 'adjust';
  planDate?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function exerciseCount(count: number) {
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`;
}

// The server decides when a plan holds something worth protecting; this names it and asks. The trainer
// edit comes first when both apply, as it does on the server.
export function PlanOverwriteDialog({
  confirmation: current,
  intent,
  planDate,
  onConfirm,
  onCancel,
}: PlanOverwriteDialogProps) {
  // The last confirmation keeps the text steady while the dialog fades out after it was cleared.
  const lastRef = useRef<PlanOverwriteConfirmation | null>(null);
  if (current) lastRef.current = current;
  const confirmation = current ?? lastRef.current;
  const isRebuild = intent === 'rebuild';
  const action = isRebuild ? 'Rebuilding' : 'Applying this change';
  const isTrainerEdit = confirmation?.reason === 'trainer_edited';
  const when = planDate && planDate !== toIsoDate(new Date()) ? `in the plan for ${formatPlanDate(planDate)}` : 'today';

  return (
    <AlertDialog open={current !== null} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isTrainerEdit ? 'A trainer already adjusted this plan' : "You've already started this plan"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isTrainerEdit
              ? `${confirmation?.editedBy ?? 'A trainer'} edited it${confirmation?.editedAt ? ` on ${formatDateTime(confirmation.editedAt)}` : ''}. ${action} replaces their edits.`
              : `You have ticked off ${exerciseCount(confirmation?.completedCount ?? 0)} ${when}. ${action} keeps the ticks on exercises that stay in the plan.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isTrainerEdit ? "Keep trainer's plan" : 'Keep this plan'}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isTrainerEdit ? 'Replace edits' : isRebuild ? 'Rebuild plan' : 'Apply change'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
