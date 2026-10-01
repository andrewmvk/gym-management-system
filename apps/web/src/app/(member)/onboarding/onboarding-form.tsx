'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { type Attachment, ExamAttachmentsField } from '@/app/(member)/onboarding/exam-attachments-field';
import { StringListField } from '@/app/(member)/onboarding/string-list-field';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc';

interface OnboardingFormProps {
  isUpdate: boolean;
  onSubmitted: () => void;
  onCancel?: () => void;
}

export function OnboardingForm({ isUpdate, onSubmitted, onCancel }: OnboardingFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [medications, setMedications] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherNotes, setOtherNotes] = useState('');
  const [goals, setGoals] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGoalsMissing, setIsGoalsMissing] = useState(false);

  const submit = useMutation(
    trpc.onboarding.submit.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.onboarding.getStatus.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.onboarding.listMine.queryKey() });
        onSubmitted();
      },
      onError: () => toast.error("We couldn't submit your information. Try again."),
    }),
  );

  function handleSubmit() {
    if (!goals.trim()) {
      setIsGoalsMissing(true);
      document.getElementById('onboarding-goals')?.focus();
      return;
    }
    submit.mutate({
      medications,
      physicalConditions: { conditions, otherNotes: otherNotes.trim() || undefined },
      goals: goals.trim(),
      attachments,
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-10 p-5 sm:p-8 lg:grid-cols-5 lg:gap-12">
        <FieldSet className="min-w-0 lg:col-span-2">
          <FieldLegend>Goals</FieldLegend>
          <Field data-invalid={isGoalsMissing}>
            <FieldLabel htmlFor="onboarding-goals">What do you want to achieve?</FieldLabel>
            <Textarea
              id="onboarding-goals"
              value={goals}
              aria-invalid={isGoalsMissing}
              onChange={(e) => {
                setGoals(e.target.value);
                if (e.target.value.trim()) setIsGoalsMissing(false);
              }}
              placeholder="e.g. Run a 10k by March, get stronger without hurting my back"
            />
            {isGoalsMissing && <p className="text-sm text-destructive">Tell us your goals before submitting.</p>}
          </Field>
        </FieldSet>

        <FieldSet className="min-w-0 lg:col-span-3">
          <FieldLegend>Health</FieldLegend>
          <FieldDescription>Only what applies to you. You can add more later by telling your coach.</FieldDescription>
          <FieldGroup>
            <StringListField
              id="onboarding-medications"
              label="Medications"
              placeholder="e.g. Ibuprofen"
              values={medications}
              onChange={setMedications}
            />
            <StringListField
              id="onboarding-conditions"
              label="Physical conditions and limitations"
              placeholder="e.g. Left knee injury"
              values={conditions}
              onChange={setConditions}
            />
            <Field>
              <FieldLabel htmlFor="onboarding-other-notes">Anything else we should know?</FieldLabel>
              <Textarea
                id="onboarding-other-notes"
                value={otherNotes}
                onChange={(e) => setOtherNotes(e.target.value)}
              />
            </Field>
            <ExamAttachmentsField values={attachments} onChange={setAttachments} />
          </FieldGroup>
        </FieldSet>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t bg-muted/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
        {onCancel && (
          <Button variant="ghost" disabled={submit.isPending} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={submit.isPending} onClick={handleSubmit}>
          {submit.isPending ? 'Submitting...' : isUpdate ? 'Save update' : 'Build my plan'}
        </Button>
      </div>
    </div>
  );
}
