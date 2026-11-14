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
import { useI18n } from '@/lib/i18n/i18n-provider';

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

// The server decides when a plan holds something worth protecting; this names it and asks. The trainer
// edit comes first when both apply, as it does on the server.
export function PlanOverwriteDialog({
  confirmation: current,
  intent,
  planDate,
  onConfirm,
  onCancel,
}: PlanOverwriteDialogProps) {
  const { t, formatDateTime, formatPlanDate } = useI18n();
  // The last confirmation keeps the text steady while the dialog fades out after it was cleared.
  const lastRef = useRef<PlanOverwriteConfirmation | null>(null);
  if (current) lastRef.current = current;
  const confirmation = current ?? lastRef.current;
  const isRebuild = intent === 'rebuild';
  const isTrainerEdit = confirmation?.reason === 'trainer_edited';
  const isOtherDay = Boolean(planDate) && planDate !== toIsoDate(new Date());
  const count = confirmation?.completedCount ?? 0;

  function trainerEditText() {
    const vars = { name: confirmation?.editedBy ?? t('A trainer') };
    const edited = confirmation?.editedAt
      ? t('{name} edited it on {date}.', { ...vars, date: formatDateTime(confirmation.editedAt) })
      : t('{name} edited it.', vars);
    return `${edited} ${isRebuild ? t('Rebuilding replaces their edits.') : t('Applying this change replaces their edits.')}`;
  }

  function ticksText() {
    const ticked = isOtherDay
      ? count === 1
        ? t('You have ticked off 1 exercise in the plan for {date}.', { date: formatPlanDate(planDate!) })
        : t('You have ticked off {count} exercises in the plan for {date}.', {
            count,
            date: formatPlanDate(planDate!),
          })
      : count === 1
        ? t('You have ticked off 1 exercise today.')
        : t('You have ticked off {count} exercises today.', { count });
    const keeps = isRebuild
      ? t('Rebuilding keeps the ticks on exercises that stay in the plan.')
      : t('Applying this change keeps the ticks on exercises that stay in the plan.');
    return `${ticked} ${keeps}`;
  }

  return (
    <AlertDialog open={current !== null} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isTrainerEdit ? t('A trainer already adjusted this plan') : t("You've already started this plan")}
          </AlertDialogTitle>
          <AlertDialogDescription>{isTrainerEdit ? trainerEditText() : ticksText()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isTrainerEdit ? t("Keep trainer's plan") : t('Keep this plan')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isTrainerEdit ? t('Replace edits') : isRebuild ? t('Rebuild plan') : t('Apply change')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
