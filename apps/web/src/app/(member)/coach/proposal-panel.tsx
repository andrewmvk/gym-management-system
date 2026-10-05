'use client';

import type { ProposalRow as ProposalRowData } from '@cadence/shared/schemas/coach';
import { countChanges, diffDraft } from '@cadence/shared/schemas/coach-draft';
import { ArrowLeftIcon, Undo2Icon } from 'lucide-react';
import { type MentionChip, mentionKey } from '@/app/(member)/coach/coach-context';
import { Prescription } from '@/app/(member)/coach/prescription';
import { ProposalRow } from '@/app/(member)/coach/proposal-row';
import type { CoachDraftApi, CoachDraftState } from '@/app/(member)/coach/use-coach-draft';
import { AiButton } from '@/components/ai-button';
import { Button } from '@/components/ui/button';
import { formatPlanDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProposalPanelProps {
  draft: CoachDraftState;
  api: CoachDraftApi;
  mentions: readonly MentionChip[];
  onMention: (row: ProposalRowData) => void;
  onAskSaferSwap: (row: ProposalRowData) => void;
  className?: string;
}

// The whole proposal, beside the chat on a wide screen and over it on a phone. Every number can be changed
// by hand, an exercise can be taken out or pointed at for the coach, and nothing reaches the plan until Apply.
export function ProposalPanel({ draft, api, mentions, onMention, onAskSaferSwap, className }: ProposalPanelProps) {
  const diff = diffDraft(draft.before, draft.rows);
  const changeCount = countChanges(diff);
  const mentionedKeys = new Set(mentions.map(mentionKey));
  const isBlocked = api.unacknowledgedWarnings.length > 0;
  const isEmpty = draft.rows.length === 0;
  const date = formatPlanDate(draft.date, { day: 'numeric', month: 'short' });

  return (
    <aside aria-label="Proposed plan" className={cn('flex min-h-0 flex-col bg-card', className)}>
      <div className="flex items-start gap-3 border-b px-4 pt-4 pb-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 shrink-0"
          onClick={() => api.setIsPanelOpen(false)}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          <span className="lg:sr-only">Chat</span>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">Plan for {date}</h2>
          {draft.summary && <p className="text-sm text-pretty text-muted-foreground">{draft.summary}</p>}
        </div>
        <span className="numerals shrink-0 text-3xl leading-none font-bold">
          {changeCount}
          <span className="sr-only"> {changeCount === 1 ? 'change' : 'changes'}</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <p className="px-4 py-6 text-sm text-pretty text-muted-foreground">
            Nothing is left in this plan. Put an exercise back below, or discard the proposal.
          </p>
        ) : (
          <ul>
            {diff.rows.map(({ row, change, previous }) => {
              const warning = draft.warnings.find((entry) => entry.exerciseId === row.exerciseId) ?? null;
              return (
                <ProposalRow
                  key={row.exerciseId}
                  row={row}
                  change={change}
                  previous={previous}
                  warning={warning}
                  isAcknowledged={draft.acknowledged.includes(row.exerciseId)}
                  isMentioned={mentionedKeys.has(`exercise:${row.exerciseId}`)}
                  onEdit={(numbers) => api.updateRow(row.exerciseId, numbers)}
                  onRemove={() => api.removeRow(row.exerciseId)}
                  onMention={() => onMention(row)}
                  onAcknowledge={(isAcknowledged) => api.setAcknowledged(row.exerciseId, isAcknowledged)}
                  onAskSaferSwap={() => onAskSaferSwap(row)}
                />
              );
            })}
          </ul>
        )}

        {diff.removed.length > 0 && (
          <section aria-label="Taken out of the plan" className="border-t">
            <h3 className="bg-muted/60 px-4 py-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              Taken out
            </h3>
            <ul>
              {diff.removed.map((row) => (
                <li
                  key={row.exerciseId}
                  className="flex items-center justify-between gap-3 border-b px-4 py-2 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-muted-foreground line-through decoration-2">
                      {row.name}
                    </span>
                    <Prescription sets={row.sets} reps={row.reps} load={row.load} isStruck className="text-base" />
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => api.restoreRow(row.exerciseId)}>
                    <Undo2Icon data-icon="inline-start" />
                    Put back
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t bg-muted/60 px-4 py-3">
        {isBlocked && (
          <p role="status" className="text-xs text-pretty text-muted-foreground">
            Accept the safety {api.unacknowledgedWarnings.length === 1 ? 'warning' : 'warnings'} above to apply this
            plan.
          </p>
        )}
        <div className="flex items-center gap-2">
          <AiButton
            variant="tape"
            mark="tempo"
            className="min-w-0 flex-1"
            isPending={api.isApplying}
            pendingLabel="Applying..."
            disabled={isBlocked || isEmpty}
            onClick={api.apply}
          >
            Apply to plan for {date}
          </AiButton>
          <Button type="button" variant="ghost" disabled={api.isApplying} onClick={api.discard}>
            Discard
          </Button>
        </div>
      </div>
    </aside>
  );
}
