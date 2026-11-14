'use client';

import { PaperclipIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { MemberSection } from '@/app/(staff)/members/[id]/member-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n/i18n-provider';

interface MemberProfileSectionProps {
  onboarding: {
    submittedAt: string | Date;
    heightCm: number;
    weightKg: number;
    goals: string;
    medications: readonly string[];
    conditions: readonly string[];
    otherNotes: string | null;
    exams: readonly { name: string; date: string | null; findings: string; hasAttachment: boolean }[];
  } | null;
}

const SKELETON_ROWS = 6;

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
      <dt className="font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="max-w-prose text-pretty break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

function None() {
  const { t } = useI18n();
  return <span className="text-muted-foreground">{t('None listed')}</span>;
}

function MemberProfileSectionSkeleton() {
  const { t } = useI18n();
  return (
    <MemberSection title={t('Current health profile')} description={<Skeleton className="mt-1 h-5 w-48" />}>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <div key={index} className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-56 max-w-full" />
        </div>
      ))}
    </MemberSection>
  );
}

function MemberProfileSectionRoot({ onboarding }: MemberProfileSectionProps) {
  const { t, tn, formatDateTime, formatPlanDate } = useI18n();
  const title = t('Current health profile');

  if (!onboarding) {
    return (
      <MemberSection title={title} description={t('What the member told us in the health profile.')}>
        <p className="px-5 py-4 text-muted-foreground sm:px-6">
          {t('This member has not submitted a health profile yet.')}
        </p>
      </MemberSection>
    );
  }

  return (
    <MemberSection
      title={title}
      description={tn('Submitted {date}. The newest entry is the one the AI reads first.', {
        date: <span className="numerals text-base font-semibold">{formatDateTime(onboarding.submittedAt)}</span>,
      })}
    >
      <dl>
        <ProfileRow label={t('Height and weight')}>
          <span className="numerals text-lg font-semibold">{onboarding.heightCm}</span> cm,{' '}
          <span className="numerals text-lg font-semibold">{onboarding.weightKg}</span> kg
        </ProfileRow>
        <ProfileRow label={t('Goals')}>{onboarding.goals}</ProfileRow>
        <ProfileRow label={t('Medications')}>
          {onboarding.medications.length > 0 ? onboarding.medications.join(', ') : <None />}
        </ProfileRow>
        <ProfileRow label={t('Physical conditions')}>
          {onboarding.conditions.length > 0 ? onboarding.conditions.join(', ') : <None />}
        </ProfileRow>
        <ProfileRow label={t('Other notes')}>{onboarding.otherNotes ?? <None />}</ProfileRow>
        <ProfileRow label={t('Medical exams')}>
          {onboarding.exams.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {onboarding.exams.map((exam) => (
                <li key={`${exam.name}:${exam.date ?? ''}:${exam.findings}`} className="flex flex-col gap-0.5">
                  <p className="font-semibold">
                    {exam.name}
                    {exam.date && (
                      <span className="numerals text-base font-semibold text-muted-foreground">
                        {' '}
                        ({formatPlanDate(exam.date)})
                      </span>
                    )}
                  </p>
                  <p>{exam.findings}</p>
                  {exam.hasAttachment && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <PaperclipIcon className="size-4" aria-hidden />
                      {t('File attached by the member')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <None />
          )}
        </ProfileRow>
      </dl>
    </MemberSection>
  );
}

export const MemberProfileSection = Object.assign(MemberProfileSectionRoot, { Skeleton: MemberProfileSectionSkeleton });
