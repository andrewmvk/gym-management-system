'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface StringListFieldProps {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}

// A lightweight add/remove list for free-text items (medications, conditions) - plain state instead of
// a form-library field array, matching this codebase's general preference for the simplest thing that works.
export function StringListField({ id, label, placeholder, values, onChange }: StringListFieldProps) {
  const [draft, setDraft] = useState('');

  function addDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft('');
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addDraft();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addDraft}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-col gap-1">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
              <span>{value}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
