'use client';

import { FileIcon, PaperclipIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useRef } from 'react';
import { Controller, type UseFormReturn, useFieldArray, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import type { OnboardingFormInput, OnboardingFormOutput } from '@/app/(member)/onboarding/onboarding-form-types';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toIsoDate } from '@/lib/calendar-date';

type OnboardingForm = UseFormReturn<OnboardingFormInput, unknown, OnboardingFormOutput>;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ExamAttachment({ form, index }: { form: OnboardingForm; index: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const attachment = useWatch({ control: form.control, name: `exams.${index}.attachment` });
  const attachmentPath = useWatch({ control: form.control, name: `exams.${index}.attachmentPath` });

  async function attach(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Attach a JPEG, PNG or PDF file.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('That file is larger than 5 MB.');
      return;
    }
    const base64 = await readAsBase64(file);
    form.setValue(
      `exams.${index}.attachment`,
      { filename: file.name, mimeType: file.type, base64 },
      { shouldDirty: true },
    );
    form.setValue(`exams.${index}.attachmentPath`, undefined, { shouldDirty: true });
  }

  function detach() {
    form.setValue(`exams.${index}.attachment`, undefined, { shouldDirty: true });
    form.setValue(`exams.${index}.attachmentPath`, undefined, { shouldDirty: true });
  }

  const hasFile = Boolean(attachment) || Boolean(attachmentPath);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasFile ? (
        <span className="flex h-8 min-w-0 items-center gap-2 rounded-sm bg-secondary pr-1 pl-3 text-sm font-medium">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{attachment ? attachment.filename : 'File already on record'}</span>
          <Button type="button" variant="ghost" size="xs" onClick={detach}>
            Remove file
          </Button>
        </span>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <PaperclipIcon data-icon="inline-start" />
        {hasFile ? 'Replace file' : 'Attach file'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Exam ${index + 1} file`}
        onChange={(event) => {
          void attach(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function ExamRow({ form, index, onRemove }: { form: OnboardingForm; index: number; onRemove: () => void }) {
  const id = `onboarding-exam-${index}`;

  return (
    <li className="flex flex-col gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name={`exams.${index}.name`}
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-name`}>Exam</FieldLabel>
              <Input
                {...field}
                id={`${id}-name`}
                aria-invalid={fieldState.invalid}
                placeholder="e.g. Resting ECG, knee X-ray"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name={`exams.${index}.date`}
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-date`}>
                Date <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <DatePicker
                id={`${id}-date`}
                value={field.value ?? ''}
                onChange={(value) => field.onChange(value || undefined)}
                onBlur={field.onBlur}
                max={toIsoDate(new Date())}
                captionLayout="dropdown"
                isClearable
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <Controller
        name={`exams.${index}.findings`}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${id}-findings`}>What did it find?</FieldLabel>
            <Textarea
              {...field}
              id={`${id}-findings`}
              aria-invalid={fieldState.invalid}
              placeholder="Type the result in your own words. Your coach reads this text, not the file."
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ExamAttachment form={form} index={index} />
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onRemove}>
          <Trash2Icon data-icon="inline-start" />
          Remove exam
        </Button>
      </div>
    </li>
  );
}

export function ExamEntriesField({ form }: { form: OnboardingForm }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'exams' });

  return (
    <Field>
      <FieldLabel>Medical exams</FieldLabel>
      <FieldDescription>
        Recent exams that matter for training. A file is optional supporting material for your trainers; the AI only
        reads what you type.
      </FieldDescription>
      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          No exams. That is fine, leave this empty if you have none.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {fields.map((field, index) => (
            <ExamRow key={field.id} form={form} index={index} onRemove={() => remove(index)} />
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" className="w-fit" onClick={() => append({ name: '', findings: '' })}>
        <PlusIcon data-icon="inline-start" />
        Add exam
      </Button>
    </Field>
  );
}
