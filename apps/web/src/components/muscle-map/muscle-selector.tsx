'use client';

import { type ExerciseMuscle, type MuscleId, type MuscleRole, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useState } from 'react';
import { MuscleMap, type MuscleMarks } from '@/components/muscle-map/muscle-map';
import { MuscleNamePicker } from '@/components/muscle-map/muscle-name-picker';

const ROLE_STEP: Record<MuscleRole, number> = { primary: 5, secondary: 2 };

interface MuscleSelectorProps {
  value: readonly ExerciseMuscle[];
  onChange: (value: ExerciseMuscle[]) => void;
  labelledBy?: string;
}

// A tap steps a muscle through primary, secondary and off. The same muscles can be chosen by name in the picker
// below the body, so nothing depends on hitting a small shape, and no muscle name is ever typed.
function nextRole(role: MuscleRole | undefined): MuscleRole | undefined {
  if (!role) return 'primary';
  return role === 'primary' ? 'secondary' : undefined;
}

export function MuscleSelector({ value, onChange, labelledBy }: MuscleSelectorProps) {
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
    <fieldset aria-labelledby={labelledBy} className="flex min-w-0 flex-col gap-3">
      <MuscleMap
        isSingleView
        marks={marks}
        label="Muscles this exercise trains"
        highlighted={hovered}
        onSelect={cycle}
        onHover={setHovered}
      />
      <p className="text-sm text-muted-foreground">
        Tap once for a primary muscle, twice for a supporting one, three times to clear it.
      </p>
      <MuscleNamePicker value={value} onChange={onChange} onHover={setHovered} />
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
    </fieldset>
  );
}
