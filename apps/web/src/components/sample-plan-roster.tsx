import { CheckIcon, MessageSquareQuoteIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SAMPLE_ROWS = [
  { name: 'Goblet squat', group: 'Legs', sets: 4, reps: 8, load: '16 kg', isDone: true },
  { name: 'Glute bridge', group: 'Glutes', sets: 3, reps: 12, load: null, isDone: true },
  { name: 'Seated cable row', group: 'Back', sets: 3, reps: 10, load: '35 kg', isDone: false },
  { name: 'Dead bug', group: 'Core', sets: 3, reps: 12, load: null, isDone: false },
];

// Illustrative only: a synthetic plan used on the landing page to show what a member sees.
export function SamplePlanRoster() {
  const doneCount = SAMPLE_ROWS.filter((row) => row.isDone).length;

  return (
    <figure className="relative overflow-hidden rounded-lg border bg-card shadow-showcase">
      <div className="kit-corner flex items-end justify-between gap-4 bg-kit pt-4 pr-20 pb-3 pl-5 text-kit-foreground">
        <div>
          <p className="font-display text-sm font-semibold tracking-widest text-kit-muted uppercase">Today</p>
          <p className="numerals text-4xl leading-none font-extrabold">
            {doneCount}
            <span className="text-kit-muted">/{SAMPLE_ROWS.length}</span>
          </p>
        </div>
        <Badge variant="tape">Sample plan</Badge>
      </div>
      <ul>
        {SAMPLE_ROWS.map((row, index) => (
          <li
            key={row.name}
            data-done={row.isDone}
            className="flex items-center gap-4 border-b px-5 py-3.5 last:border-b-0"
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-sm border-2',
                row.isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
              )}
            >
              {row.isDone && <CheckIcon className="size-4 stroke-3" />}
            </span>
            <span className="numerals w-5 text-lg font-bold text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={cn('strike-wipe w-fit truncate font-semibold', row.isDone && 'text-muted-foreground')}>
                {row.name}
              </p>
              <p className="text-xs text-muted-foreground">{row.group}</p>
            </div>
            <p className="numerals shrink-0 text-right text-2xl leading-none font-bold">
              {row.sets}
              <span className="px-0.5 text-muted-foreground">&times;</span>
              {row.reps}
              {row.load && <span className="block text-sm font-semibold text-muted-foreground">{row.load}</span>}
            </p>
          </li>
        ))}
      </ul>
      <figcaption className="flex items-start gap-3 border-t bg-accent/60 px-5 py-4 text-sm">
        <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
        <span>
          <span className="font-semibold">Remembered from chat:</span> &ldquo;my left knee is sore.&rdquo; Lunges were
          swapped for glute bridges.
        </span>
      </figcaption>
    </figure>
  );
}
