'use client';

import { useQuery } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';

const SKELETON_ROWS = 4;

function SectionShell({
  description,
  action,
  children,
}: {
  description: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label="Your health profile" className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">Your health profile</h2>
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
  return <span className="text-muted-foreground">None listed</span>;
}

function CurrentProfileRoot({ onUpdate }: { onUpdate: () => void }) {
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
      <SectionShell description="What you told us in your health profile.">
        <QueryError
          title="We couldn't load your health profile"
          onRetry={() => submissionsQuery.refetch()}
          isRetrying={submissionsQuery.isRefetching}
          className="m-5 sm:m-6"
        />
      </SectionShell>
    );
  }

  const latest = submissionsQuery.data[0];
  const attachmentCount = latest?.examAttachmentPaths.length ?? 0;

  return (
    <SectionShell
      description={
        latest ? (
          <>
            Last updated <span className="numerals text-base font-semibold">{formatDateTime(latest.submittedAt)}</span>.
            Each update is saved as a new entry, and your coach reads the newest first.
          </>
        ) : (
          'Nothing saved yet.'
        )
      }
      action={
        <Button type="button" variant="outline" className="w-fit" onClick={onUpdate}>
          <PencilIcon data-icon="inline-start" />
          Update my profile
        </Button>
      }
    >
      {latest && (
        <dl>
          <ProfileRow label="Goals">{latest.goals}</ProfileRow>
          <ProfileRow label="Medications">
            {latest.medications.length > 0 ? latest.medications.join(', ') : <None />}
          </ProfileRow>
          <ProfileRow label="Physical conditions">
            {latest.physicalConditions.conditions.length > 0 ? (
              latest.physicalConditions.conditions.join(', ')
            ) : (
              <None />
            )}
          </ProfileRow>
          <ProfileRow label="Other notes">{latest.physicalConditions.otherNotes ?? <None />}</ProfileRow>
          <ProfileRow label="Exam results">
            {attachmentCount > 0 ? `${attachmentCount} ${attachmentCount === 1 ? 'file' : 'files'} on file` : <None />}
          </ProfileRow>
        </dl>
      )}
    </SectionShell>
  );
}

export const CurrentProfile = Object.assign(CurrentProfileRoot, { Skeleton: CurrentProfileSkeleton });
