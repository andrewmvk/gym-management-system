import type { ReactNode } from 'react';
import { MemberSection } from '@/app/(staff)/members/[id]/member-section';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

interface MemberProfileSectionProps {
  onboarding: {
    submittedAt: string | Date;
    goals: string;
    medications: readonly string[];
    conditions: readonly string[];
    otherNotes: string | null;
  } | null;
}

const TITLE = 'Current health profile';
const SKELETON_ROWS = 4;

function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
      <dt className="font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="max-w-prose text-pretty break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

function None() {
  return <span className="text-muted-foreground">None listed</span>;
}

function MemberProfileSectionSkeleton() {
  return (
    <MemberSection title={TITLE} description={<Skeleton className="mt-1 h-5 w-48" />}>
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
  if (!onboarding) {
    return (
      <MemberSection title={TITLE} description="What the member told us in the health profile.">
        <p className="px-5 py-4 text-muted-foreground sm:px-6">This member has not submitted a health profile yet.</p>
      </MemberSection>
    );
  }

  return (
    <MemberSection
      title={TITLE}
      description={
        <>
          Submitted <span className="numerals text-base font-semibold">{formatDateTime(onboarding.submittedAt)}</span>.
          The newest entry is the one the AI reads first.
        </>
      }
    >
      <dl>
        <ProfileRow label="Goals">{onboarding.goals}</ProfileRow>
        <ProfileRow label="Medications">
          {onboarding.medications.length > 0 ? onboarding.medications.join(', ') : <None />}
        </ProfileRow>
        <ProfileRow label="Physical conditions">
          {onboarding.conditions.length > 0 ? onboarding.conditions.join(', ') : <None />}
        </ProfileRow>
        <ProfileRow label="Other notes">{onboarding.otherNotes ?? <None />}</ProfileRow>
      </dl>
    </MemberSection>
  );
}

export const MemberProfileSection = Object.assign(MemberProfileSectionRoot, { Skeleton: MemberProfileSectionSkeleton });
