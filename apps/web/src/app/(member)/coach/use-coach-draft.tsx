'use client';

import type {
  BeforeRow,
  CoachBlock,
  CoachDraft,
  PickerOption,
  ProposalRow,
  SafetyWarning,
} from '@cadence/shared/schemas/coach';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { isDockedViewport } from '@/app/(member)/coach/viewport';
import { type PlanOverwriteConfirmation, PlanOverwriteDialog } from '@/app/(member)/plan/plan-overwrite-dialog';
import { toIsoDate } from '@/lib/calendar-date';
import { formatPlanDate } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';

export type PlanProposalBlock = Extract<CoachBlock, { type: 'plan_proposal' }>;

export interface ExerciseNumbers {
  sets: number;
  reps: number;
  load: number | null;
}

// The proposal the member is looking at. It lives only in the browser: every message carries it to the
// coach and Apply sends the final version, so nothing about a draft is stored until the member applies it.
export interface CoachDraftState {
  blockId: string | null;
  date: string;
  summary: string;
  before: BeforeRow[];
  rows: ProposalRow[];
  warnings: SafetyWarning[];
  acknowledged: string[];
  request: string;
  // The line remembered about this plan once it is applied; empty for a draft the coach did not write.
  memoryNote: string;
  status: 'open' | 'applied';
}

function toRow(option: PickerOption): ProposalRow {
  return {
    exerciseId: option.exerciseId,
    name: option.name,
    muscles: option.muscles,
    sets: option.sets,
    reps: option.reps,
    load: option.load,
    notes: null,
    completed: null,
    reason: option.reason,
  };
}

export function useCoachDraft() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CoachDraftState | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<PlanOverwriteConfirmation | null>(null);

  const invalidatePlanQueries = () => {
    queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.plans.listUpcoming.queryKey() });
  };

  const applyMutation = useMutation(
    trpc.chat.applyDraft.mutationOptions({
      onSuccess: (result, variables) => {
        if (result.status === 'needs_confirmation') {
          setConfirmation(result);
          return;
        }
        if (result.status === 'needs_acknowledgement') {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  warnings: [
                    ...current.warnings.filter((w) => !result.warnings.some((n) => n.exerciseId === w.exerciseId)),
                    ...result.warnings,
                  ],
                  acknowledged: current.acknowledged.filter((id) => !result.warnings.some((w) => w.exerciseId === id)),
                }
              : current,
          );
          toast.message('Read the safety warning before you apply this.');
          return;
        }
        invalidatePlanQueries();
        setDraft((current) => (current ? { ...current, status: 'applied' } : current));
        setIsPanelOpen(false);
        toast.message(`Plan for ${formatPlanDate(variables.date)} updated.`);
      },
      onError: () => toast.error("We couldn't apply that change right now. Nothing was changed. Try again."),
    }),
  );

  function receiveProposal(block: PlanProposalBlock, request: string) {
    setDraft((previous) => {
      const keptAcknowledgements = (previous?.acknowledged ?? []).filter((id) => {
        const before = previous?.warnings.find((warning) => warning.exerciseId === id);
        return block.warnings.some((warning) => warning.exerciseId === id && warning.reason === before?.reason);
      });
      return {
        blockId: block.id,
        date: block.date,
        summary: block.summary,
        before: block.before,
        rows: block.after,
        warnings: block.warnings,
        acknowledged: keptAcknowledgements,
        request,
        memoryNote: block.memoryNote,
        status: 'open',
      };
    });
    setIsPanelOpen(isDockedViewport());
  }

  // Starts a draft from the plan the member has saved for that date when the coach has not proposed one yet,
  // for example when they add an exercise from a picker.
  async function ensureDraft(date: string, request: string): Promise<CoachDraftState> {
    if (draft && draft.status === 'open' && draft.date === date) return draft;
    const plan = await queryClient.fetchQuery(trpc.plans.getByDate.queryOptions({ date }));
    const before: BeforeRow[] = (plan?.exercises ?? []).map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.exerciseName,
      muscles: exercise.muscles,
      sets: exercise.sets,
      reps: exercise.reps,
      load: exercise.load,
    }));
    return {
      blockId: null,
      date,
      summary: '',
      before,
      rows: (plan?.exercises ?? []).map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.exerciseName,
        muscles: exercise.muscles,
        sets: exercise.sets,
        reps: exercise.reps,
        load: exercise.load,
        notes: exercise.notes,
        completed: null,
        reason: null,
      })),
      warnings: [],
      acknowledged: [],
      request,
      memoryNote: '',
      status: 'open',
    };
  }

  async function addExercise(option: PickerOption, request: string) {
    const base = await ensureDraft(toIsoDate(new Date()), request);
    if (base.rows.some((row) => row.exerciseId === option.exerciseId)) {
      setDraft(base);
      setIsPanelOpen(isDockedViewport());
      return;
    }
    const warnings = option.warning
      ? [...base.warnings, { exerciseId: option.exerciseId, reason: option.warning, source: 'injury' as const }]
      : base.warnings;
    setDraft({ ...base, rows: [...base.rows, toRow(option)], warnings, request: request || base.request });
    setIsPanelOpen(isDockedViewport());
  }

  async function swapExercise(fromExerciseId: string, option: PickerOption, request: string) {
    const base = await ensureDraft(toIsoDate(new Date()), request);
    const rows = base.rows.filter((row) => row.exerciseId !== fromExerciseId);
    if (!rows.some((row) => row.exerciseId === option.exerciseId)) rows.push(toRow(option));
    setDraft({
      ...base,
      rows,
      warnings: base.warnings.filter((warning) => warning.exerciseId !== fromExerciseId),
      acknowledged: base.acknowledged.filter((id) => id !== fromExerciseId),
      request: request || base.request,
    });
    setIsPanelOpen(isDockedViewport());
  }

  function updateRow(exerciseId: string, numbers: ExerciseNumbers) {
    setDraft((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.exerciseId === exerciseId ? { ...row, ...numbers } : row)),
          }
        : current,
    );
  }

  function removeRow(exerciseId: string) {
    setDraft((current) =>
      current ? { ...current, rows: current.rows.filter((row) => row.exerciseId !== exerciseId) } : current,
    );
  }

  function restoreRow(exerciseId: string) {
    setDraft((current) => {
      const original = current?.before.find((row) => row.exerciseId === exerciseId);
      if (!current || !original || current.rows.some((row) => row.exerciseId === exerciseId)) return current;
      return {
        ...current,
        rows: [...current.rows, { ...original, notes: null, completed: null, reason: null }],
      };
    });
  }

  function setAcknowledged(exerciseId: string, isAcknowledged: boolean) {
    setDraft((current) => {
      if (!current) return current;
      const others = current.acknowledged.filter((id) => id !== exerciseId);
      return { ...current, acknowledged: isAcknowledged ? [...others, exerciseId] : others };
    });
  }

  function discard() {
    setDraft(null);
    setIsPanelOpen(false);
  }

  function buildApplyInput(current: CoachDraftState, confirmOverwrite: boolean) {
    return {
      date: current.date,
      request: current.request,
      memoryNote: current.memoryNote,
      confirmOverwrite,
      exercises: current.rows.map((row) => ({
        exerciseId: row.exerciseId,
        sets: row.sets,
        reps: row.reps,
        load: row.load,
        notes: row.notes,
        completed: row.completed,
      })),
      acknowledgedWarnings: current.warnings
        .filter(
          (warning) =>
            current.acknowledged.includes(warning.exerciseId) &&
            current.rows.some((row) => row.exerciseId === warning.exerciseId),
        )
        .map((warning) => ({ exerciseId: warning.exerciseId, reason: warning.reason })),
    };
  }

  function apply() {
    if (draft && draft.status === 'open') applyMutation.mutate(buildApplyInput(draft, false));
  }

  function confirmOverwrite() {
    setConfirmation(null);
    if (draft && draft.status === 'open') applyMutation.mutate(buildApplyInput(draft, true));
  }

  const openDraft = draft?.status === 'open' ? draft : null;
  const unacknowledgedWarnings = openDraft
    ? openDraft.warnings.filter(
        (warning) =>
          openDraft.rows.some((row) => row.exerciseId === warning.exerciseId) &&
          !openDraft.acknowledged.includes(warning.exerciseId),
      )
    : [];

  // What the coach is shown with the next message, so a revision starts from what the member sees now.
  const sendableDraft: CoachDraft | undefined = openDraft
    ? {
        date: openDraft.date,
        memoryNote: openDraft.memoryNote || null,
        exercises: openDraft.rows.map((row) => ({
          exerciseId: row.exerciseId,
          sets: row.sets,
          reps: row.reps,
          load: row.load,
          notes: row.notes,
          completed: row.completed,
        })),
      }
    : undefined;

  const overwriteDialog = (
    <PlanOverwriteDialog
      confirmation={confirmation}
      intent="adjust"
      planDate={draft?.date}
      onConfirm={confirmOverwrite}
      onCancel={() => setConfirmation(null)}
    />
  );

  return {
    draft,
    openDraft,
    sendableDraft,
    unacknowledgedWarnings,
    isPanelOpen,
    setIsPanelOpen,
    isApplying: applyMutation.isPending,
    receiveProposal,
    addExercise,
    swapExercise,
    updateRow,
    removeRow,
    restoreRow,
    setAcknowledged,
    discard,
    apply,
    overwriteDialog,
  };
}

export type CoachDraftApi = ReturnType<typeof useCoachDraft>;
