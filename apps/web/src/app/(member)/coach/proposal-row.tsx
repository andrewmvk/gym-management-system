'use client';

import type { BeforeRow, ProposalRow as ProposalRowData, SafetyWarning } from '@cadence/shared/schemas/coach';
import type { DiffChange } from '@cadence/shared/schemas/coach-draft';
import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { AtSignIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import type { ExerciseNumbers } from '@/app/(member)/coach/use-coach-draft';
import { PrescriptionFields } from '@/components/prescription-fields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const CHANGE_LABELS: Record<Exclude<DiffChange, 'unchanged'>, string> = { added: 'New', changed: 'Changed' };

interface ProposalRowProps {
  row: ProposalRowData;
  change: DiffChange;
  previous: BeforeRow | null;
  warning: SafetyWarning | null;
  isAcknowledged: boolean;
  isMentioned: boolean;
  onEdit: (numbers: ExerciseNumbers) => void;
  onRemove: () => void;
  onMention: () => void;
  onAcknowledge: (isAcknowledged: boolean) => void;
  onAskSaferSwap: () => void;
}

// One exercise of the draft: the member can point at it for the coach, change its numbers by hand, take it
// out, and, when it carries a safety warning, read and accept that before the plan can be applied.
export function ProposalRow({
  row,
  change,
  previous,
  warning,
  isAcknowledged,
  isMentioned,
  onEdit,
  onRemove,
  onMention,
  onAcknowledge,
  onAskSaferSwap,
}: ProposalRowProps) {
  const primary = row.muscles.filter((entry) => entry.role === 'primary').map((entry) => muscleLabel(entry.muscle));

  return (
    <li className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={onMention}
            aria-pressed={isMentioned}
            aria-label={`Ask the coach about ${row.name}`}
            className={cn(
              'group flex min-h-8 w-fit max-w-full items-center gap-1.5 rounded-sm text-left text-base font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
              isMentioned && 'text-primary',
            )}
          >
            <span className="min-w-0 text-pretty">{row.name}</span>
            <AtSignIcon
              className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </button>
          <p className="truncate font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {change !== 'unchanged' && <span className="text-primary">{CHANGE_LABELS[change]} </span>}
            {change === 'changed' && previous && (
              <span className="numerals text-sm normal-case">
                was {previous.sets}&times;{previous.reps}
                {previous.load ? ` ${previous.load} kg` : ''}{' '}
              </span>
            )}
            {primary.join(', ')}
          </p>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${row.name}`}>
          <XIcon />
        </Button>
      </div>

      <PrescriptionFields
        name={row.name}
        size="md"
        sets={row.sets}
        reps={row.reps}
        load={row.load}
        isEditable
        onCommit={async (numbers) => onEdit(numbers)}
        className="items-start"
      />

      {row.reason && <p className="max-w-prose text-sm text-pretty text-muted-foreground">{row.reason}</p>}

      {warning && (
        <div className="flex flex-col gap-2 rounded-md bg-tape px-3 py-2.5 text-tape-foreground">
          <p className="flex items-start gap-2 text-sm font-semibold text-pretty">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {warning.reason}
          </p>
          <label htmlFor={`acknowledge-${row.exerciseId}`} className="flex min-h-10 items-center gap-2.5 text-sm">
            <Checkbox
              id={`acknowledge-${row.exerciseId}`}
              checked={isAcknowledged}
              onCheckedChange={(checked) => onAcknowledge(checked === true)}
              className="border-tape-foreground/60"
            />
            I understand and want this exercise anyway
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit border-tape-foreground/30"
            onClick={onAskSaferSwap}
          >
            Ask for a safer swap
          </Button>
        </div>
      )}
    </li>
  );
}
