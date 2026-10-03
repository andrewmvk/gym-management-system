'use client';

import {
  type ExerciseMuscle,
  MUSCLES,
  type MuscleId,
  type MuscleRole,
  muscleLabel,
} from '@cadence/shared/schemas/muscles';
import { useState } from 'react';
import { MuscleMap, type MuscleMarks } from '@/components/muscle-map/muscle-map';
import { MuscleRankList } from '@/components/muscle-map/muscle-rank-list';
import { cn } from '@/lib/utils';

const ROLE_STEP: Record<MuscleRole, number> = { primary: 5, secondary: 2 };
const ROLE_LABEL: Record<MuscleRole, string> = { primary: 'Primary', secondary: 'Secondary' };

interface MuscleSelectorProps {
  value: readonly ExerciseMuscle[];
  onChange: (value: ExerciseMuscle[]) => void;
  isInvalid?: boolean;
  labelledBy?: string;
}

// A tap steps a muscle through primary, secondary and off. The same muscles are listed by name below the
// body, so nothing depends on hitting a small shape, and no muscle name is ever typed.
function nextRole(role: MuscleRole | undefined): MuscleRole | undefined {
  if (!role) return 'primary';
  return role === 'primary' ? 'secondary' : undefined;
}

export function MuscleSelector({ value, onChange, isInvalid, labelledBy }: MuscleSelectorProps) {
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const roleOf = (muscle: MuscleId) => value.find((entry) => entry.muscle === muscle)?.role;

  const cycle = (muscle: MuscleId) => {
    const role = nextRole(roleOf(muscle));
    const rest = value.filter((entry) => entry.muscle !== muscle);
    onChange(role ? [...rest, { muscle, role }] : rest);
  };

  const marks: MuscleMarks = Object.fromEntries(value.map((entry) => [entry.muscle, { step: ROLE_STEP[entry.role] }]));
  const primary = value.filter((entry) => entry.role === 'primary');
  const secondary = value.filter((entry) => entry.role === 'secondary');

  return (
    <fieldset
      aria-labelledby={labelledBy}
      className={cn('flex min-w-0 flex-col gap-3 rounded-md border p-3', isInvalid && 'border-destructive')}
    >
      <MuscleMap
        isSingleView
        marks={marks}
        label="Muscles this exercise trains"
        highlighted={hovered}
        onSelect={cycle}
        onHover={setHovered}
      />
      <p className="text-xs text-muted-foreground">
        Tap once for a primary muscle, twice for a supporting one, three times to clear it.
      </p>
      <dl className="flex flex-col gap-1 text-sm" aria-live="polite">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 font-semibold">Primary</dt>
          <dd className="text-muted-foreground">
            {primary.length > 0 ? primary.map((entry) => muscleLabel(entry.muscle)).join(', ') : 'None yet'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 font-semibold">Supporting</dt>
          <dd className="text-muted-foreground">
            {secondary.length > 0 ? secondary.map((entry) => muscleLabel(entry.muscle)).join(', ') : 'None'}
          </dd>
        </div>
      </dl>
      <details>
        <summary className="flex min-h-11 items-center font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
          Choose by name
        </summary>
        <MuscleRankList
          label="All muscles"
          className="mt-2"
          onSelect={cycle}
          onHover={setHovered}
          items={MUSCLES.map(({ id }) => {
            const role = roleOf(id);
            return { muscle: id, step: role ? ROLE_STEP[role] : 0, value: role ? ROLE_LABEL[role] : '-' };
          })}
        />
      </details>
    </fieldset>
  );
}
