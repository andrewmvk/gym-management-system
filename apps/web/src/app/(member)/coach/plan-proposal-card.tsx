import { countChanges, diffDraft } from '@cadence/shared/schemas/coach-draft';
import { ArrowRightIcon, PanelRightOpenIcon, TriangleAlertIcon } from 'lucide-react';
import { Prescription } from '@/app/(member)/coach/prescription';
import type { PlanProposalBlock } from '@/app/(member)/coach/use-coach-draft';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPlanDate } from '@/lib/format';

const PREVIEW_ROWS = 3;

// closed: replaced by a newer proposal or discarded, so it can no longer be applied.
export type ProposalCardState = 'active' | 'applied' | 'closed';

interface PlanProposalCardProps {
  block: PlanProposalBlock;
  state: ProposalCardState;
  onReview: () => void;
}

// The proposal at a glance, inside the thread. The whole editable version opens beside the chat.
export function PlanProposalCard({ block, state, onReview }: PlanProposalCardProps) {
  const diff = diffDraft(block.before, block.after);
  const changed = diff.rows.filter((entry) => entry.change !== 'unchanged');
  const changeCount = countChanges(diff);
  const hidden = changed.length + diff.removed.length - PREVIEW_ROWS;

  return (
    <section
      aria-label={`Proposed plan for ${formatPlanDate(block.date)}`}
      className="animate-block-in flex flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-display text-lg leading-tight font-bold tracking-wide uppercase">
            Plan for {formatPlanDate(block.date, { day: 'numeric', month: 'short' })}
          </h3>
          <p className="text-sm text-pretty text-muted-foreground">{block.summary}</p>
        </div>
        <span className="numerals shrink-0 text-3xl leading-none font-bold">
          {changeCount}
          <span className="sr-only"> {changeCount === 1 ? 'change' : 'changes'}</span>
        </span>
      </div>

      <ul className="flex flex-col gap-1.5 border-y py-2">
        {changed.slice(0, PREVIEW_ROWS).map(({ row, change, previous }) => (
          <li key={row.exerciseId} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-semibold">
              {change === 'added' && <span className="font-display tracking-widest text-primary uppercase">New </span>}
              {row.name}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {previous && (
                <Prescription
                  sets={previous.sets}
                  reps={previous.reps}
                  load={previous.load}
                  isStruck
                  className="text-base"
                />
              )}
              {previous && <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden />}
              <Prescription sets={row.sets} reps={row.reps} load={row.load} className="text-base" />
            </span>
          </li>
        ))}
        {diff.removed.slice(0, Math.max(0, PREVIEW_ROWS - changed.length)).map((row) => (
          <li key={row.exerciseId} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="min-w-0 truncate font-semibold line-through decoration-2">{row.name}</span>
            <span className="font-display tracking-widest uppercase">Removed</span>
          </li>
        ))}
        {hidden > 0 && <li className="text-xs text-muted-foreground">and {hidden} more</li>}
        {block.focusChanges.length > 0 && (
          <li className="text-xs text-muted-foreground">
            Also changes your focus for {block.focusChanges.length}{' '}
            {block.focusChanges.length === 1 ? 'muscle' : 'muscles'}.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {block.warnings.length > 0 && state === 'active' && (
            <Badge variant="tape">
              <TriangleAlertIcon data-icon="inline-start" />
              Safety warning
            </Badge>
          )}
          {state === 'applied' && <Badge variant="live">Applied</Badge>}
          {state === 'closed' && <Badge variant="outline">Not applied</Badge>}
        </div>
        {state === 'active' && (
          <Button type="button" size="sm" variant="outline" onClick={onReview}>
            <PanelRightOpenIcon data-icon="inline-start" />
            Review and edit
          </Button>
        )}
      </div>
    </section>
  );
}
