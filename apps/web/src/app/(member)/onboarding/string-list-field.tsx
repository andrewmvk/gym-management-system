'use client';

import { PlusIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface StringListFieldProps {
  id: string;
  label: string;
  description?: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}

// A lightweight add/remove list for free-text items (medications, conditions) - plain state instead of
// a form-library field array, matching this codebase's general preference for the simplest thing that works.
export function StringListField({ id, label, description, placeholder, values, onChange }: StringListFieldProps) {
  const [draft, setDraft] = useState('');

  function addDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft('');
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
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
        <Button type="button" variant="outline" onClick={addDraft} disabled={!draft.trim()}>
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li
              key={value}
              className="flex h-8 items-center gap-1 rounded-sm bg-secondary pr-1 pl-3 text-sm font-medium"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-foreground/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/45"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
