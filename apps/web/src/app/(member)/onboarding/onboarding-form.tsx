'use client';

import { type ExamEntry, OnboardingSubmitInputSchema } from '@cadence/shared/schemas/onboarding';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ExamEntriesField } from '@/app/(member)/onboarding/exam-entries-field';
import type { OnboardingFormInput, OnboardingFormOutput } from '@/app/(member)/onboarding/onboarding-form-types';
import { StringListField } from '@/app/(member)/onboarding/string-list-field';
import { AiButton } from '@/components/ai-button';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface OnboardingInitialValues {
  heightCm: number;
  weightKg: number;
  goals: string;
  medications: string[];
  conditions: string[];
  otherNotes?: string;
  exams: ExamEntry[];
}

interface OnboardingFormProps {
  isUpdate: boolean;
  initialValues?: OnboardingInitialValues;
  isSubmitting: boolean;
  onSubmit: (values: OnboardingFormOutput) => void;
  onCancel?: () => void;
}

function toNumber(value: string) {
  return value === '' ? undefined : Number(value);
}

export function OnboardingForm({ isUpdate, initialValues, isSubmitting, onSubmit, onCancel }: OnboardingFormProps) {
  const form = useForm<OnboardingFormInput, unknown, OnboardingFormOutput>({
    resolver: zodResolver(OnboardingSubmitInputSchema),
    defaultValues: {
      heightCm: initialValues?.heightCm,
      weightKg: initialValues?.weightKg,
      goals: initialValues?.goals ?? '',
      medications: initialValues?.medications ?? [],
      physicalConditions: { conditions: initialValues?.conditions ?? [], otherNotes: initialValues?.otherNotes },
      exams: initialValues?.exams ?? [],
    },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-10 p-5 sm:p-8 lg:grid-cols-5 lg:gap-12">
        <div className="flex min-w-0 flex-col gap-10 lg:col-span-2">
          <FieldSet>
            <FieldLegend>About you</FieldLegend>
            <FieldDescription>
              {isUpdate
                ? 'Filled in from your last update. Change what is different.'
                : 'Your coach sizes the load of your plan to these.'}
            </FieldDescription>
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Controller
                name="heightCm"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="onboarding-height">Height (cm)</FieldLabel>
                    <Input
                      id="onboarding-height"
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      type="number"
                      inputMode="numeric"
                      aria-invalid={fieldState.invalid}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(toNumber(event.target.value))}
                      placeholder="e.g. 175"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="weightKg"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="onboarding-weight">Weight (kg)</FieldLabel>
                    <Input
                      id="onboarding-weight"
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      aria-invalid={fieldState.invalid}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(toNumber(event.target.value))}
                      placeholder="e.g. 72.5"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Goals</FieldLegend>
            <Controller
              name="goals"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="onboarding-goals">What do you want to achieve?</FieldLabel>
                  <Textarea
                    {...field}
                    id="onboarding-goals"
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Run a 10k by March, get stronger without hurting my back"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldSet>
        </div>

        <FieldSet className="min-w-0 lg:col-span-3">
          <FieldLegend>Health</FieldLegend>
          <FieldDescription>
            Only what applies to you. Leave a list empty if you have none. You can add more later by telling your coach.
          </FieldDescription>
          <FieldGroup>
            <Controller
              name="medications"
              control={form.control}
              render={({ field }) => (
                <StringListField
                  id="onboarding-medications"
                  label="Medications"
                  placeholder="e.g. Ibuprofen"
                  values={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="physicalConditions.conditions"
              control={form.control}
              render={({ field }) => (
                <StringListField
                  id="onboarding-conditions"
                  label="Physical conditions and limitations"
                  placeholder="e.g. Left knee injury"
                  values={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
            <ExamEntriesField form={form} />
            <Controller
              name="physicalConditions.otherNotes"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="onboarding-other-notes">Anything else we should know?</FieldLabel>
                  <Textarea
                    id="onboarding-other-notes"
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value.trim() ? event.target.value : undefined)}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t bg-muted/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
        {onCancel && (
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <AiButton type="submit" isPending={isSubmitting} pendingLabel="Saving and building your plan...">
          {isUpdate ? 'Save and update my plan' : 'Save and build my plan'}
        </AiButton>
      </div>
    </form>
  );
}
