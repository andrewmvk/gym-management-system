'use client';

import { QUESTIONNAIRE_V1 } from '@cadence/shared/schemas/aptitude';
import { LockIcon } from 'lucide-react';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export type AnswerState = Record<string, { answer: boolean | null; detail: string }>;

export function initialAnswers(): AnswerState {
  return Object.fromEntries(QUESTIONNAIRE_V1.map((q) => [q.id, { answer: null, detail: '' }]));
}

const QUESTIONS_PER_GROUP = 4;
const GROUP_TITLES = ['Long-term conditions', 'Health history', 'Exercise and restrictions'] as const;

const GROUPS = GROUP_TITLES.map((title, groupIndex) => {
  const start = groupIndex * QUESTIONS_PER_GROUP;
  return { title, start, questions: QUESTIONNAIRE_V1.slice(start, start + QUESTIONS_PER_GROUP) };
});

interface QuestionnaireStepProps {
  answers: AnswerState;
  onAnswersChange: (update: (previous: AnswerState) => AnswerState) => void;
  // Submitting is the single write of the whole signup, owned by the wizard.
  onSubmit: () => void;
  isSubmitting: boolean;
}

function YesNoOption({ id, value, label }: { id: string; value: 'yes' | 'no'; label: string }) {
  return (
    <label
      htmlFor={id}
      className="flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 font-display text-base font-semibold tracking-wider uppercase transition-colors hover:border-foreground/35 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/45"
    >
      <RadioGroupItem value={value} id={id} className="sr-only" />
      {label}
    </label>
  );
}

function AnsweredCount({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-sm font-medium">
        <span className="numerals text-base font-bold">{answered}</span> of{' '}
        <span className="numerals text-base font-bold">{total}</span> answered
      </p>
      <div aria-hidden className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed, never reordered segments
            key={index}
            className={cn(
              'h-1.5 -skew-x-12 rounded-xs transition-colors',
              index < answered ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function QuestionnaireStep({ answers, onAnswersChange, onSubmit, isSubmitting }: QuestionnaireStepProps) {
  const answeredCount = QUESTIONNAIRE_V1.filter((q) => answers[q.id]!.answer !== null).length;
  const allAnswered = answeredCount === QUESTIONNAIRE_V1.length;

  return (
    <StepPanel
      title="Health check"
      description="Answer honestly. This decides whether you can start training right away or need a medical certificate first."
    >
      <p className="flex items-start gap-2.5 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
        Your answers are evaluated as soon as you submit, and can&apos;t be edited afterward.
      </p>

      <div className="sticky top-0 z-10 -mx-5 border-b bg-card px-5 py-3 sm:-mx-8 sm:px-8">
        <AnsweredCount answered={answeredCount} total={QUESTIONNAIRE_V1.length} />
      </div>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => {
          const groupAnswered = group.questions.filter((q) => answers[q.id]!.answer !== null).length;
          return (
            <section key={group.title} aria-labelledby={`group-${group.start}`} className="flex flex-col">
              <h2
                id={`group-${group.start}`}
                className="flex items-baseline justify-between gap-3 border-b pb-2 font-display text-xl font-bold tracking-wide uppercase"
              >
                {group.title}
                <span className="numerals text-base text-muted-foreground">
                  {groupAnswered}/{group.questions.length}
                </span>
              </h2>
              <ol className="flex flex-col">
                {group.questions.map((question, offset) => {
                  const number = group.start + offset + 1;
                  const state = answers[question.id]!;
                  return (
                    <li key={question.id} className="flex flex-col gap-3 border-b py-5 last:border-b-0 last:pb-0">
                      <fieldset className="flex flex-col gap-3">
                        <legend className="mb-3 flex gap-3 text-base font-medium text-pretty">
                          <span className="numerals w-5 shrink-0 text-lg leading-6 font-bold text-muted-foreground">
                            {number}
                          </span>
                          <span>{question.text}</span>
                        </legend>
                        <RadioGroup
                          value={state.answer === null ? undefined : state.answer ? 'yes' : 'no'}
                          onValueChange={(value) =>
                            onAnswersChange((prev) => ({
                              ...prev,
                              [question.id]: { ...prev[question.id]!, answer: value === 'yes' },
                            }))
                          }
                          className="ml-8 grid max-w-56 grid-cols-2 gap-2"
                        >
                          <YesNoOption id={`${question.id}-yes`} value="yes" label="Yes" />
                          <YesNoOption id={`${question.id}-no`} value="no" label="No" />
                        </RadioGroup>
                      </fieldset>
                      <div className={cn('pl-8', state.answer === null && 'hidden')}>
                        <Input
                          aria-label={`Additional detail for question ${number} (optional)`}
                          placeholder="Additional detail (optional)"
                          value={state.detail}
                          onChange={(e) =>
                            onAnswersChange((prev) => ({
                              ...prev,
                              [question.id]: { ...prev[question.id]!, detail: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="border-t pt-5">
        <Button size="lg" className="w-full" disabled={!allAnswered || isSubmitting} onClick={onSubmit}>
          {isSubmitting
            ? 'Submitting...'
            : allAnswered
              ? 'Submit answers'
              : `${answeredCount} of ${QUESTIONNAIRE_V1.length} answered`}
        </Button>
      </div>
    </StepPanel>
  );
}
