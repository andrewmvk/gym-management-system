import type { BeforeRow, ProposalRow } from '@cadence/shared/schemas/coach';
import { diffDraft } from '@cadence/shared/schemas/coach-draft';
import { SparklesIcon, TriangleAlertIcon, UserPenIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatWeight } from '@/lib/format';

interface ChangeExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  // Kilograms; a change saved before weights became numbers may hold the text that was typed.
  load: number | string | null;
}

interface CoachChange {
  id: string;
  kind: 'coach' | 'member_edit';
  request: string | null;
  before: readonly ChangeExercise[];
  after: readonly ChangeExercise[];
  acknowledgedWarnings: readonly { exerciseId: string; name: string; reason: string }[];
  createdAt: string | Date;
}

function toBefore(row: ChangeExercise): BeforeRow {
  return { ...row, load: typeof row.load === 'number' ? row.load : null, muscles: [] };
}

function toAfter(row: ChangeExercise): ProposalRow {
  return { ...toBefore(row), notes: null, completed: null, reason: null };
}

function Numbers({ row }: { row: Pick<ChangeExercise, 'sets' | 'reps' | 'load'> }) {
  return (
    <span className="numerals text-base font-semibold">
      {row.sets}&times;{row.reps}
      {row.load ? ` ${formatWeight(row.load)}` : ''}
    </span>
  );
}

function Diff({ change }: { change: CoachChange }) {
  const diff = diffDraft(change.before.map(toBefore), change.after.map(toAfter));
  const rows = diff.rows.filter((entry) => entry.change !== 'unchanged');
  if (rows.length === 0 && diff.removed.length === 0) {
    return <p className="text-sm text-muted-foreground">No exercise changed.</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {rows.map(({ row, change: kind, previous }) => (
        <li key={row.exerciseId} className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{row.name}</span>
          {kind === 'added' ? (
            <>
              <Badge variant="secondary">Added</Badge>
              <Numbers row={row} />
            </>
          ) : (
            previous && (
              <span className="inline-flex items-baseline gap-1">
                <Numbers row={previous} />
                <span aria-hidden>&rarr;</span>
                <span className="sr-only">changed to</span>
                <Numbers row={row} />
              </span>
            )
          )}
        </li>
      ))}
      {diff.removed.map((row) => (
        <li key={row.exerciseId} className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-muted-foreground line-through decoration-2">{row.name}</span>
          <Badge variant="outline">Removed</Badge>
        </li>
      ))}
    </ul>
  );
}

// What the member changed on this plan without a trainer: through the coach, or by editing the numbers
// themselves. Oldest first, like the review history.
export function CoachChanges({ changes }: { changes: readonly CoachChange[] }) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle>Changed through the coach</CardTitle>
        <CardDescription>
          What the member changed on this plan themselves. The plan was published as they left it.
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        <ol className="flex flex-col">
          {changes.map((change) => (
            <li key={change.id} className="flex gap-3 border-b py-4 last:border-b-0">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                {change.kind === 'coach' ? <SparklesIcon className="size-3.5" /> : <UserPenIcon className="size-3.5" />}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Badge variant="secondary">{change.kind === 'coach' ? 'Coach change' : 'Member edit'}</Badge>
                  <span className="numerals text-base text-muted-foreground">{formatDateTime(change.createdAt)}</span>
                </p>
                {change.request && (
                  <p className="text-sm text-pretty break-words">
                    Asked: <q className="italic">{change.request}</q>
                  </p>
                )}
                <Diff change={change} />
                {change.acknowledgedWarnings.length > 0 && (
                  <div className="flex gap-2 rounded-sm bg-tape px-3 py-2 text-sm text-tape-foreground">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="font-semibold">Member accepted a safety warning</p>
                      <ul>
                        {change.acknowledgedWarnings.map((warning) => (
                          <li key={`${warning.exerciseId}:${warning.reason}`} className="text-pretty">
                            <span className="font-semibold">{warning.name}</span>: {warning.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
