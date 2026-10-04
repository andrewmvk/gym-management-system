import { PROFILE_EVENT_LABELS, type ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAppAbility } from '@/abilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { isSafetyEvent, PROFILE_EVENT_ORDER } from '@/lib/profile-event-order';

interface MemberContextFact {
  id: string;
  eventType: ProfileEventType;
  description: string;
  sourceMessage: string | null;
  createdAt: string | Date;
}

interface MemberContext {
  name: string;
  age: number | null;
  onboarding: {
    submittedAt: string | Date;
    goals: string;
    medications: readonly string[];
    conditions: readonly string[];
    otherNotes: string | null;
  } | null;
  facts: readonly MemberContextFact[];
  aptitude: {
    questionnaire: {
      aiNotes: string | null;
      answers: readonly { questionId: string; question: string; answer: boolean; detail: string | null }[];
    } | null;
  };
}

interface MemberContextCardProps {
  memberId: string;
  context: MemberContext;
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">{label}</h3>
      {children}
    </div>
  );
}

function None({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Header() {
  return (
    <CardHeader>
      <CardTitle>What the AI knew</CardTitle>
      <CardDescription>
        The inputs the AI used to build this plan, as they stand now. Read them next to the exercises.
      </CardDescription>
    </CardHeader>
  );
}

function MemberContextCardSkeleton() {
  return (
    <Card>
      <Header />
      <CardContent className="flex flex-col gap-5">
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function MemberContextCardRoot({ memberId, context }: MemberContextCardProps) {
  const ability = useAppAbility();
  const { onboarding, facts, aptitude } = context;
  const yesAnswers = aptitude.questionnaire?.answers.filter((answer) => answer.answer) ?? [];
  const orderedFacts = [...facts].sort(
    (a, b) => PROFILE_EVENT_ORDER.indexOf(a.eventType) - PROFILE_EVENT_ORDER.indexOf(b.eventType),
  );

  return (
    <Card>
      <Header />
      <CardContent className="flex flex-col gap-5">
        <p className="text-base font-semibold">
          {context.name}
          {context.age !== null && (
            <span className="font-normal text-muted-foreground">
              , <span className="numerals text-lg font-semibold text-foreground">{context.age}</span> years old
            </span>
          )}
        </p>

        <Block label="Health profile">
          {onboarding ? (
            <div className="flex flex-col gap-2 text-sm">
              <dl className="flex flex-col gap-2">
                <div>
                  <dt className="font-semibold">Goals</dt>
                  <dd className="text-pretty break-words whitespace-pre-line">{onboarding.goals}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Medications</dt>
                  <dd>{onboarding.medications.length > 0 ? onboarding.medications.join(', ') : 'None listed'}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Physical conditions</dt>
                  <dd>{onboarding.conditions.length > 0 ? onboarding.conditions.join(', ') : 'None listed'}</dd>
                </div>
                {onboarding.otherNotes && (
                  <div>
                    <dt className="font-semibold">Other notes</dt>
                    <dd className="text-pretty break-words whitespace-pre-line">{onboarding.otherNotes}</dd>
                  </div>
                )}
              </dl>
              <p className="text-muted-foreground">
                Submitted{' '}
                <span className="numerals text-base font-semibold">{formatDateTime(onboarding.submittedAt)}</span>
              </p>
            </div>
          ) : (
            <None>No health profile submitted yet.</None>
          )}
        </Block>

        <Block label="Remembered from chat">
          {orderedFacts.length === 0 ? (
            <None>Nothing remembered that still applies.</None>
          ) : (
            <ul className="flex flex-col gap-3">
              {orderedFacts.map((fact) => (
                <li key={fact.id} className="flex flex-col gap-0.5 text-sm">
                  <p className="text-pretty">
                    {isSafetyEvent(fact.eventType) && (
                      <TriangleAlertIcon className="mr-1 mb-0.5 inline size-4 text-destructive" aria-hidden />
                    )}
                    <span className="font-semibold">{PROFILE_EVENT_LABELS[fact.eventType]}: </span>
                    {fact.description}
                  </p>
                  <p className="numerals text-base font-semibold text-muted-foreground">
                    {formatDateTime(fact.createdAt)}
                  </p>
                  {fact.sourceMessage && (
                    <p className="line-clamp-3 break-words text-muted-foreground">
                      Member said: <q className="italic">{fact.sourceMessage}</q>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block label="Aptitude questionnaire">
          {aptitude.questionnaire === null ? (
            <None>No questionnaire on file.</None>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {yesAnswers.length === 0 ? (
                <None>No question was answered yes.</None>
              ) : (
                <ul className="flex flex-col gap-2">
                  {yesAnswers.map((answer) => (
                    <li key={answer.questionId} className="text-pretty">
                      <span className="font-semibold">Yes: </span>
                      {answer.question}
                      {answer.detail && <span className="block text-muted-foreground">{answer.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {aptitude.questionnaire.aiNotes && (
                <p className="text-pretty">
                  <span className="font-semibold">AI note: </span>
                  {aptitude.questionnaire.aiNotes}
                </p>
              )}
            </div>
          )}
        </Block>

        {ability.can('read', 'Member') && (
          <Link
            href={`/members/${memberId}`}
            className="w-fit rounded-sm font-display text-sm font-semibold tracking-widest text-primary uppercase underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/45"
          >
            Open full member page
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export const MemberContextCard = Object.assign(MemberContextCardRoot, { Skeleton: MemberContextCardSkeleton });
