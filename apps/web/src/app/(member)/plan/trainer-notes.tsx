import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface TrainerNoteEntry {
  id: string;
  authorName: string;
  note: string;
  isEdit: boolean;
  createdAt: string | Date;
}

// Every trainer note and edit on the member's own plan, in the order the staff wrote them. The member
// reads the note as written: it is what explains why the plan changed.
export function TrainerNotes({ notes, className }: { notes: readonly TrainerNoteEntry[]; className?: string }) {
  if (notes.length === 0) return null;

  return (
    <ul aria-label="Notes from your trainers" className={cn('flex flex-col divide-y', className)}>
      {notes.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold">{entry.authorName}</span>
            <span className="numerals text-base text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
            {entry.isEdit && <Badge variant="tape">Edited the plan</Badge>}
          </p>
          <p className="text-sm text-pretty whitespace-pre-line">{entry.note}</p>
        </li>
      ))}
    </ul>
  );
}
