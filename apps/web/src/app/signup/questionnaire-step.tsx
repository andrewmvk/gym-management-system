'use client';

import { QUESTIONNAIRE_V1, type QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTRPC } from '@/lib/trpc';

interface QuestionnaireStepProps {
  userId: string;
  onResolved: (outcome: 'cleared' | 'certificate_required' | 'pending_retry') => void;
}

type AnswerState = Record<string, { answer: boolean | null; detail: string }>;

function initialAnswers(): AnswerState {
  return Object.fromEntries(QUESTIONNAIRE_V1.map((q) => [q.id, { answer: null, detail: '' }]));
}

export function QuestionnaireStep({ userId, onResolved }: QuestionnaireStepProps) {
  const trpc = useTRPC();
  const [answers, setAnswers] = useState<AnswerState>(initialAnswers);

  const allAnswered = QUESTIONNAIRE_V1.every((q) => answers[q.id]!.answer !== null);

  const submit = useMutation(
    trpc.aptitude.submitQuestionnaire.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'unavailable') {
          toast.error("We couldn't submit your questionnaire right now. Try again.");
          return;
        }
        onResolved(result.status);
      },
      onError: () => toast.error("We couldn't submit your questionnaire. Try again."),
    }),
  );

  function handleSubmit() {
    const payload: QuestionnaireAnswer[] = QUESTIONNAIRE_V1.map((q) => ({
      questionId: q.id,
      answer: answers[q.id]!.answer!,
      detail: answers[q.id]!.detail.trim() || undefined,
    }));
    submit.mutate({ userId, answers: payload });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Health questionnaire</CardTitle>
        <CardDescription>Answer honestly - this determines whether you can start training right away.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {QUESTIONNAIRE_V1.map((question) => {
            const state = answers[question.id]!;
            return (
              <FieldSet key={question.id}>
                <FieldLegend variant="label">{question.text}</FieldLegend>
                <RadioGroup
                  value={state.answer === null ? undefined : state.answer ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id]!, answer: value === 'yes' } }))
                  }
                  className="flex flex-row gap-4"
                >
                  <FieldLabel htmlFor={`${question.id}-yes`} className="flex-row-reverse justify-end gap-1.5 border-0 p-0">
                    <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                    Yes
                  </FieldLabel>
                  <FieldLabel htmlFor={`${question.id}-no`} className="flex-row-reverse justify-end gap-1.5 border-0 p-0">
                    <RadioGroupItem value="no" id={`${question.id}-no`} />
                    No
                  </FieldLabel>
                </RadioGroup>
                <Field>
                  <Input
                    placeholder="Additional detail (optional)"
                    value={state.detail}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id]!, detail: e.target.value } }))
                    }
                  />
                </Field>
              </FieldSet>
            );
          })}
          <Button className="w-full" disabled={!allAnswered || submit.isPending} onClick={handleSubmit}>
            {submit.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
