'use client';

import { useQuery } from '@tanstack/react-query';
import { LockIcon, UserXIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { MemberCheckInsSection } from '@/app/(staff)/members/[id]/member-check-ins-section';
import { MemberFactsSection } from '@/app/(staff)/members/[id]/member-facts-section';
import { MemberPlansSection } from '@/app/(staff)/members/[id]/member-plans-section';
import { MemberProfileSection } from '@/app/(staff)/members/[id]/member-profile-section';
import { AptitudeBadge } from '@/app/(staff)/members/aptitude-badge';
import { MembershipControl } from '@/app/(staff)/members/membership-control';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { QueryError } from '@/components/query-error';
import { useTRPC } from '@/lib/trpc';

const BACK = { href: '/members', label: 'All members' };

export function MemberDetailSkeleton() {
  return (
    <PageContainer>
      <PageHeading.Skeleton back={BACK} />
      <MemberProfileSection.Skeleton />
      <MemberFactsSection.Skeleton />
      <MemberPlansSection.Skeleton />
      <MemberCheckInsSection.Skeleton />
    </PageContainer>
  );
}

export function MemberDetailBody({ userId }: { userId: string }) {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canRead = ability.can('read', 'Member');
  const memberQuery = useQuery({ ...trpc.members.get.queryOptions({ userId }), enabled: canRead });

  if (!canRead) {
    return (
      <PageContainer>
        <PageHeading title="Member" back={BACK} />
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={LockIcon}
            title="No access"
            description="Your account doesn't include the member list. Ask an admin if you need it."
          />
        </div>
      </PageContainer>
    );
  }

  if (memberQuery.isPending) {
    return (
      <Deferred>
        <MemberDetailSkeleton />
      </Deferred>
    );
  }

  if (memberQuery.isError) {
    return (
      <PageContainer>
        <PageHeading title="Member" back={BACK} />
        {memberQuery.error.data?.code === 'NOT_FOUND' ? (
          <div className="rounded-lg border bg-card">
            <EmptyState
              icon={UserXIcon}
              title="Member not found"
              description="No member has this link. They may not have finished signing up, or the link is wrong."
            />
          </div>
        ) : (
          <QueryError
            title="We couldn't load this member"
            onRetry={() => memberQuery.refetch()}
            isRetrying={memberQuery.isRefetching}
          />
        )}
      </PageContainer>
    );
  }

  const { profile, membership, aptitude, onboarding, facts, plans, checkInDates } = memberQuery.data;

  return (
    <PageContainer>
      <PageHeading
        back={BACK}
        title={profile.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{profile.email}</span>
            {profile.phone && <span>{profile.phone}</span>}
            {profile.age !== null && (
              <span>
                <span className="numerals text-lg font-semibold text-foreground">{profile.age}</span> years old
              </span>
            )}
            <span>
              Member since{' '}
              {new Date(profile.memberSince).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </span>
        }
        actions={
          <>
            <MembershipControl userId={profile.id} name={profile.name} status={membership.status} />
            <AptitudeBadge status={aptitude.status} />
          </>
        }
      />
      <MemberProfileSection onboarding={onboarding} />
      <MemberFactsSection facts={facts} />
      <MemberPlansSection plans={plans} />
      <MemberCheckInsSection checkInDates={checkInDates} />
    </PageContainer>
  );
}
