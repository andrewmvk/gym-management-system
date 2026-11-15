'use client';

import { useQuery } from '@tanstack/react-query';
import { PaperclipIcon, PencilIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

const SKELETON_ROWS = 6;

function SectionShell({
  description,
  action,
  children,
}: {
  description: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section aria-label={t('Your health profile')} className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">{t('Your health profile')}</h2>
          <div className="text-sm text-pretty text-muted-foreground">{description}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
      <dt className="font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="max-w-prose text-pretty break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

function CurrentProfileSkeleton() {
  return (
    <SectionShell description={<Skeleton className="mt-1 h-5 w-48" />} action={<Skeleton className="h-10 w-44" />}>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <div key={index} className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-56 max-w-full" />
        </div>
      ))}
    </SectionShell>
  );
}

function None() {
  const { t } = useI18n();
  return <span className="text-muted-foreground">{t('None listed')}</span>;
}

function CurrentProfileRoot({ onUpdate }: { onUpdate: () => void }) {
  const { t, tn, formatDateTime, formatPlanDate } = useI18n();
  const trpc = useTRPC();
  const submissionsQuery = useQuery(trpc.onboarding.listMine.queryOptions());

  if (submissionsQuery.isPending) {
    return (
      <Deferred>
        <CurrentProfileSkeleton />
      </Deferred>
    );
  }

  if (submissionsQuery.isError) {
    return (
      <SectionShell description={t('What you told us in your health profile.')}>
        <QueryError
          title={t("We couldn't load your health profile")}
          onRetry={() => submissionsQuery.refetch()}
          isRetrying={submissionsQuery.isRefetching}
          className="m-5 sm:m-6"
        />
      </SectionShell>
    );
  }

  const latest = submissionsQuery.data[0];

  return (
    <SectionShell
      description={
        latest
          ? tn('Last updated {date}. Each update is saved as a new entry, and your coach reads the newest first.', {
              date: <span className="numerals text-base font-semibold">{formatDateTime(latest.submittedAt)}</span>,
            })
          : t('Nothing saved yet.')
      }
      action={
        <Button type="button" variant="outline" className="w-fit" onClick={onUpdate}>
          <PencilIcon data-icon="inline-start" />
          {t('Update my profile')}
        </Button>
      }
    >
      {latest && (
        <dl>
          <ProfileRow label={t('Height and weight')}>
            <span className="numerals text-lg font-semibold">{latest.heightCm}</span> cm,{' '}
            <span className="numerals text-lg font-semibold">{latest.weightKg}</span> kg
          </ProfileRow>
          <ProfileRow label={t('Goals')}>{latest.goals}</ProfileRow>
          <ProfileRow label={t('Medications')}>
            {latest.medications.length > 0 ? latest.medications.join(', ') : <None />}
          </ProfileRow>
          <ProfileRow label={t('Physical conditions')}>
            {latest.physicalConditions.conditions.length > 0 ? (
              latest.physicalConditions.conditions.join(', ')
            ) : (
              <None />
            )}
          </ProfileRow>
          <ProfileRow label={t('Other notes')}>{latest.physicalConditions.otherNotes ?? <None />}</ProfileRow>
          <ProfileRow label={t('Medical exams')}>
            {latest.exams.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {latest.exams.map((exam) => (
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
                    {exam.attachmentPath && (
                      <a
                        href={`/files/${exam.attachmentPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/45"
                      >
                        <PaperclipIcon className="size-4" aria-hidden />
                        {t('View attached file')}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <None />
            )}
          </ProfileRow>
        </dl>
      )}
    </SectionShell>
  );
}

export const CurrentProfile = Object.assign(CurrentProfileRoot, { Skeleton: CurrentProfileSkeleton });
