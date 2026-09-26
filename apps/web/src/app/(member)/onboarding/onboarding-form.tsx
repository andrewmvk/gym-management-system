'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc';
import { ExamAttachmentsField, type Attachment } from './exam-attachments-field';
import { StringListField } from './string-list-field';

interface OnboardingFormProps {
  isUpdate: boolean;
  onSubmitted: () => void;
}

export function OnboardingForm({ isUpdate, onSubmitted }: OnboardingFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [medications, setMedications] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherNotes, setOtherNotes] = useState('');
  const [goals, setGoals] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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
      toast.error('Tell us your goals before submitting.');
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
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{isUpdate ? 'Update my information' : 'Tell us about yourself'}</CardTitle>
        <CardDescription>This is what your training plan will be built from.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <Textarea id="onboarding-other-notes" value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-goals">Goals</FieldLabel>
            <Textarea
              id="onboarding-goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="What do you want to achieve?"
            />
          </Field>
          <ExamAttachmentsField values={attachments} onChange={setAttachments} />
          <Button className="w-full" disabled={submit.isPending} onClick={handleSubmit}>
            {submit.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
