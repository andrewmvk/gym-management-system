'use client';

import { useQuery } from '@tanstack/react-query';
import { LockIcon, UserXIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { MemberCheckInsSection } from '@/app/(staff)/members/[id]/member-check-ins-section';
import { MemberFactsSection } from '@/app/(staff)/members/[id]/member-facts-section';
import { MemberPlansSection } from '@/app/(staff)/members/[id]/member-plans-section';
import { MemberProfileSection } from '@/app/(staff)/members/[id]/member-profile-section';
import { MembershipControl } from '@/app/(staff)/members/membership-control';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { QueryError } from '@/components/query-error';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

function useBackLink() {
  const { t } = useI18n();
  return { href: '/members', label: t('All members') };
}

export function MemberDetailSkeleton() {
  const back = useBackLink();
  return (
    <PageContainer>
      <PageHeading.Skeleton back={back} />
      <MemberProfileSection.Skeleton />
      <MemberFactsSection.Skeleton />
      <MemberPlansSection.Skeleton />
      <MemberCheckInsSection.Skeleton />
    </PageContainer>
  );
}

export function MemberDetailBody({ userId }: { userId: string }) {
  const { t, tn, formatDate } = useI18n();
  const back = useBackLink();
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canRead = ability.can('read', 'Member');
  const memberQuery = useQuery({ ...trpc.members.get.queryOptions({ userId }), enabled: canRead });

  if (!canRead) {
    return (
      <PageContainer>
        <PageHeading title={t('Member')} back={back} />
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={LockIcon}
            title={t('No access')}
            description={t("Your account doesn't include the member list. Ask an admin if you need it.")}
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
        <PageHeading title={t('Member')} back={back} />
        {memberQuery.error.data?.code === 'NOT_FOUND' ? (
          <div className="rounded-lg border bg-card">
            <EmptyState
              icon={UserXIcon}
              title={t('Member not found')}
              description={t('No member has this link. The link may be wrong.')}
            />
          </div>
        ) : (
          <QueryError
            title={t("We couldn't load this member")}
            onRetry={() => memberQuery.refetch()}
            isRetrying={memberQuery.isRefetching}
          />
        )}
      </PageContainer>
    );
  }

  const { profile, membership, onboarding, facts, plans, checkInDates } = memberQuery.data;

  return (
    <PageContainer>
      <PageHeading
        back={back}
        title={profile.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{profile.email}</span>
            {profile.phone && <span>{profile.phone}</span>}
            {profile.age !== null && (
              <span>
                {tn('{age} years old', {
                  age: <span className="numerals text-lg font-semibold text-foreground">{profile.age}</span>,
                })}
              </span>
            )}
            <span>
              {t('Member since {date}', {
                date: formatDate(new Date(profile.memberSince), { day: 'numeric', month: 'short', year: 'numeric' }),
              })}
            </span>
          </span>
        }
        actions={<MembershipControl userId={profile.id} name={profile.name} status={membership.status} />}
      />
      <MemberProfileSection onboarding={onboarding} />
      <MemberFactsSection facts={facts} />
      <MemberPlansSection plans={plans} />
      <MemberCheckInsSection checkInDates={checkInDates} />
    </PageContainer>
  );
}
