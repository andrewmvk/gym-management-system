'use client';

import { UpdateExerciseInputSchema } from '@cadence/shared/schemas/coach';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface PrescriptionNumbers {
  sets: number;
  reps: number;
  load: number | null;
}

const NumbersSchema = UpdateExerciseInputSchema.pick({ sets: true, reps: true, load: true });

type Size = 'lg' | 'md';

// Fixed widths, so a value changing from 9 to 10 never moves what is next to it. The boxes are sized for the
// largest value each field accepts (20 sets, 100 reps, 1000 kg).
const SIZES = {
  lg: { numeral: 'text-3xl font-bold', sets: 'w-10', reps: 'w-14', weight: 'w-16', unit: 'text-sm font-semibold' },
  md: { numeral: 'text-2xl font-bold', sets: 'w-8', reps: 'w-11', weight: 'w-14', unit: 'text-sm font-semibold' },
} as const satisfies Record<Size, Record<string, string>>;

const INTEGER = /^\d{0,3}$/;
const DECIMAL = /^\d{0,4}([.,]\d?)?$/;

interface FieldProps {
  value: string;
  label: string;
  inputMode: 'numeric' | 'decimal';
  pattern: RegExp;
  placeholder?: string;
  isEditable: boolean;
  className: string;
  onValueChange: (value: string) => void;
  onCommit: () => void;
  onRevert: () => void;
}

// The number is the input. At rest it looks exactly like the numeral it replaces; hovering tints it, focusing
// rings it. Nothing about its box changes, so reading and editing are the same layout.
function Field({
  value,
  label,
  inputMode,
  pattern,
  placeholder,
  isEditable,
  className,
  onValueChange,
  onCommit,
  onRevert,
}: FieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onRevert();
      event.currentTarget.blur();
    }
  }

  return (
    <input
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      readOnly={!isEditable}
      tabIndex={isEditable ? 0 : -1}
      onChange={(event) => pattern.test(event.target.value) && onValueChange(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      className={cn(
        'numerals min-w-0 rounded-sm border-0 bg-transparent p-0 text-center leading-none text-inherit outline-none placeholder:text-muted-foreground/50',
        isEditable &&
          'cursor-text transition-colors hover:bg-muted focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-ring/45',
        className,
      )}
    />
  );
}

interface PrescriptionFieldsProps extends PrescriptionNumbers {
  name: string;
  size: Size;
  isEditable: boolean;
  // Resolves when saved and rejects when it failed, so the fields fall back to what is stored.
  onCommit?: (numbers: PrescriptionNumbers) => Promise<unknown> | undefined;
  isPending?: boolean;
  isStruck?: boolean;
  className?: string;
}

const text = (value: number | null) => (value === null ? '' : String(value));

// Sets x reps with the weight in kilograms under it, edited in place. A change is saved when the field loses
// focus or Enter is pressed; Escape puts the stored value back. A value outside what a plan accepts is put
// back too, so what is shown is always something that can be saved. The unit is always shown and is never part
// of what is typed.
export function PrescriptionFields({
  sets,
  reps,
  load,
  name,
  size,
  isEditable,
  onCommit,
  isPending,
  isStruck,
  className,
}: PrescriptionFieldsProps) {
  const [draft, setDraft] = useState({ sets: String(sets), reps: String(reps), load: text(load) });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stored = { sets: String(sets), reps: String(reps), load: text(load) };
  const storedKey = `${stored.sets}|${stored.reps}|${stored.load}`;

  // A value saved elsewhere (a rebuild, the coach) replaces the draft unless the member is typing in it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the stored key is the trigger; the draft is rewritten from it.
  useEffect(() => {
    if (!wrapperRef.current?.contains(document.activeElement)) {
      setDraft({ sets: stored.sets, reps: stored.reps, load: stored.load });
    }
  }, [storedKey]);

  function revert() {
    setDraft(stored);
  }

  async function commit() {
    const parsed = NumbersSchema.safeParse({
      sets: Number(draft.sets),
      reps: Number(draft.reps),
      load: draft.load === '' ? null : Number(draft.load.replace(',', '.')),
    });
    if (!parsed.success || draft.sets === '' || draft.reps === '') {
      revert();
      return;
    }
    const next: PrescriptionNumbers = {
      sets: parsed.data.sets,
      reps: parsed.data.reps,
      load: parsed.data.load ? parsed.data.load : null,
    };
    if (next.sets === sets && next.reps === reps && (next.load ?? 0) === (load ?? 0)) {
      revert();
      return;
    }
    try {
      await onCommit?.(next);
    } catch {
      revert();
    }
  }

  const sizes = SIZES[size];
  const isLocked = !isEditable || isPending;
  const bind = (key: 'sets' | 'reps' | 'load') => ({
    value: draft[key],
    isEditable: !isLocked,
    onValueChange: (value: string) => setDraft((current) => ({ ...current, [key]: value })),
    onCommit: commit,
    onRevert: revert,
  });
  const hasWeightRow = isEditable || load !== null;

  return (
    <div
      ref={wrapperRef}
      aria-busy={isPending}
      className={cn(
        'numerals flex shrink-0 flex-col items-end gap-1 leading-none font-bold transition-opacity',
        isPending && 'opacity-60',
        isStruck && 'text-muted-foreground line-through decoration-2',
        className,
      )}
    >
      <div className={cn('flex items-baseline', sizes.numeral)}>
        <Field
          {...bind('sets')}
          label={`Sets for ${name}`}
          inputMode="numeric"
          pattern={INTEGER}
          className={cn(sizes.sets, isStruck && 'line-through decoration-2')}
        />
        <span className="text-muted-foreground" aria-hidden>
          &times;
        </span>
        <Field
          {...bind('reps')}
          label={`Reps for ${name}`}
          inputMode="numeric"
          pattern={INTEGER}
          className={cn(sizes.reps, isStruck && 'line-through decoration-2')}
        />
      </div>
      {hasWeightRow && (
        <div className={cn('flex items-baseline gap-1 font-semibold text-muted-foreground', sizes.unit)}>
          <Field
            {...bind('load')}
            label={`Weight in kilograms for ${name}`}
            inputMode="decimal"
            pattern={DECIMAL}
            placeholder="0"
            className={cn(sizes.weight, 'text-right', isStruck && 'line-through decoration-2')}
          />
          <span aria-hidden>kg</span>
        </div>
      )}
    </div>
  );
}
