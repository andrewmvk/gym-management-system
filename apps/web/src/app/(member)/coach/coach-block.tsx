'use client';

import type { CoachBlock as CoachBlockData } from '@cadence/shared/schemas/coach';
import { ExerciseExplainerCard } from '@/app/(member)/coach/exercise-explainer-card';
import { ExercisePickerCard } from '@/app/(member)/coach/exercise-picker-card';
import { FactsCard } from '@/app/(member)/coach/facts-card';
import { PlanProposalCard, type ProposalCardState } from '@/app/(member)/coach/plan-proposal-card';
import { QuickReplies } from '@/app/(member)/coach/quick-replies';
import { SafetyWarningCard } from '@/app/(member)/coach/safety-warning-card';
import type { CoachDraftApi } from '@/app/(member)/coach/use-coach-draft';

interface CoachBlockProps {
  block: CoachBlockData;
  draftApi: CoachDraftApi;
  // The member's latest request, kept with the draft as what the plan change was asked for.
  lastRequest: string;
  isLatest: boolean;
  isStreaming: boolean;
  onQuickReply: (reply: string) => void;
}

function proposalState(blockId: string, draftApi: CoachDraftApi): ProposalCardState {
  if (draftApi.draft?.blockId !== blockId) return 'closed';
  return draftApi.draft.status === 'applied' ? 'applied' : 'active';
}

// The registry of what the coach can put in a conversation. The coach only ever chooses a block type and
// supplies its data; every one of these is drawn by the app, never by the model.
export function CoachBlock({ block, draftApi, lastRequest, isLatest, isStreaming, onQuickReply }: CoachBlockProps) {
  switch (block.type) {
    case 'plan_proposal':
      return (
        <PlanProposalCard
          block={block}
          state={proposalState(block.id, draftApi)}
          onReview={() => draftApi.setIsPanelOpen(true)}
        />
      );
    case 'exercise_picker':
      return (
        <ExercisePickerCard
          block={block}
          addedIds={new Set(draftApi.openDraft?.rows.map((row) => row.exerciseId))}
          isDisabled={draftApi.isApplying}
          onAdd={(option) => draftApi.addExercise(option, lastRequest)}
        />
      );
    case 'exercise_explainer':
      return <ExerciseExplainerCard block={block} />;
    case 'safety_warning':
      return (
        <SafetyWarningCard
          block={block}
          isDisabled={draftApi.isApplying}
          onSwap={(option) => draftApi.swapExercise(block.exercise.exerciseId, option, lastRequest)}
        />
      );
    case 'facts':
      return <FactsCard block={block} />;
    case 'quick_replies':
      return isLatest ? <QuickReplies replies={block.replies} isDisabled={isStreaming} onPick={onQuickReply} /> : null;
  }
}
