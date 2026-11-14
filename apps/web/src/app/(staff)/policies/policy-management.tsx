'use client';

import { useQuery } from '@tanstack/react-query';
import { LockIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { useAppAbility } from '@/abilities';
import { GroupMatrix } from '@/app/(staff)/policies/group-matrix';
import { type PolicyDialogState, PolicyDialogs, policyGroupLabel } from '@/app/(staff)/policies/policy-dialogs';
import { hasException, PolicyUserRow } from '@/app/(staff)/policies/policy-user-row';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 8;

const POLICY_TABS = ['users', 'policies'] as const;
type PolicyTab = (typeof POLICY_TABS)[number];

const USER_FILTERS = ['all', 'attention'] as const;
type UserFilter = (typeof USER_FILTERS)[number];

const ALL = 'all';
const isString = (value: unknown): value is string => typeof value === 'string';

function PolicyTabs({
  users,
  policies,
  ...tabsProps
}: {
  users: React.ReactNode;
  policies: React.ReactNode;
} & Pick<React.ComponentProps<typeof Tabs>, 'value' | 'onValueChange'>) {
  const { t } = useI18n();
  return (
    <Tabs defaultValue="users" {...tabsProps}>
      <TabsList>
        <TabsTrigger value="users">{t('Users')}</TabsTrigger>
        <TabsTrigger value="policies">{t('Policies')}</TabsTrigger>
      </TabsList>
      <TabsContent value="users">{users}</TabsContent>
      <TabsContent value="policies">{policies}</TabsContent>
    </Tabs>
  );
}

function PolicyManagementSkeleton() {
  return (
    <PolicyTabs
      users={
        <div className="flex flex-col gap-4">
          <FilterBar>
            <Skeleton className="h-10 w-full lg:w-72" />
            <Skeleton className="h-10 w-full lg:w-44" />
            <Skeleton className="h-10 w-full lg:w-56" />
            <FilterBar.Trailing>
              <Skeleton className="h-10.5 w-full lg:w-72" />
            </FilterBar.Trailing>
          </FilterBar>
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {Array.from({ length: 3 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
              <li key={index} className="flex flex-col gap-3 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-5 w-56" />
                  </div>
                  <Skeleton className="h-11 w-20 sm:h-8" />
                </div>
                <Skeleton className="h-5 w-48" />
              </li>
            ))}
          </ul>
        </div>
      }
      policies={<GroupMatrix.Skeleton />}
    />
  );
}

function PolicyManagementRoot() {
  const { t, tx } = useI18n();
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'UserPolicyAssignment');
  const [tab, setTab] = useUrlState<PolicyTab>('tab', 'users', oneOf(POLICY_TABS));
  const [search, setSearch] = useUrlState<string>('q', '', isString);
  const [groupFilter, setGroupFilter] = useUrlState<string>('group', ALL, isString);
  const [policyFilter, setPolicyFilter] = useUrlState<string>('policy', ALL, isString);
  const [filter, setFilter] = useUrlState<UserFilter>('filter', 'all', oneOf(USER_FILTERS));
  const [dialog, setDialog] = useState<PolicyDialogState | null>(null);

  const me = useQuery(trpc.auth.me.queryOptions());
  const listQuery = useQuery({ ...trpc.policies.list.queryOptions(), enabled: canManage });

  const now = Date.now();
  const term = search.trim().toLowerCase();
  const matchingSearch = (listQuery.data?.users ?? []).filter(
    (user) =>
      (!term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)) &&
      (groupFilter === ALL || user.groups.some((group) => group.groupId === groupFilter && group.isActive)) &&
      (policyFilter === ALL ||
        user.effective.some((effective) => effective.policyId === policyFilter && !effective.isDenied)),
  );
  const attentionCount = matchingSearch.filter((user) => hasException(user, now)).length;
  const users = filter === 'attention' ? matchingSearch.filter((user) => hasException(user, now)) : matchingSearch;
  const pagination = usePagination(users, PAGE_SIZE);

  if (!canManage) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title={t('No access')}
          description={t("Your account doesn't include policy management. Ask an admin if you need it.")}
        />
      </div>
    );
  }

  if (listQuery.isPending) {
    return (
      <Deferred>
        <PolicyManagementSkeleton />
      </Deferred>
    );
  }

  if (listQuery.isError) {
    return (
      <QueryError
        title={t("We couldn't load the policies")}
        onRetry={() => listQuery.refetch()}
        isRetrying={listQuery.isRefetching}
      />
    );
  }

  const { policies, groups } = listQuery.data;
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const hasFilters = term !== '' || groupFilter !== ALL || policyFilter !== ALL;

  function clearFilters() {
    setSearch('');
    setGroupFilter(ALL);
    setPolicyFilter(ALL);
  }

  return (
    <>
      <PolicyTabs
        value={tab}
        onValueChange={(value) => setTab(value as PolicyTab)}
        users={
          <div className="flex flex-col gap-4">
            <FilterBar>
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  pagination.setPage(1);
                }}
                placeholder={t('Search by name or email')}
                className="w-full lg:w-72"
              />
              <Select
                value={groupFilter}
                onValueChange={(value) => {
                  setGroupFilter(value);
                  pagination.setPage(1);
                }}
              >
                <SelectTrigger aria-label={t('Filter by group')} className="w-full lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('All groups')}</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {policyGroupLabel(tx, group.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={policyFilter}
                onValueChange={(value) => {
                  setPolicyFilter(value);
                  pagination.setPage(1);
                }}
              >
                <SelectTrigger aria-label={t('Filter by policy')} className="w-full lg:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('All policies')}</SelectItem>
                  {policies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {tx(policy.description)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FilterBar.Trailing>
                <SegmentedFilter
                  label={t('Filter users')}
                  value={filter}
                  onChange={(value) => {
                    setFilter(value);
                    pagination.setPage(1);
                  }}
                  options={[
                    { value: 'all', label: t('All'), count: matchingSearch.length },
                    { value: 'attention', label: t('Needs attention'), count: attentionCount },
                  ]}
                  className="w-full lg:w-auto"
                />
              </FilterBar.Trailing>
            </FilterBar>

            {users.length === 0 ? (
              <div className="rounded-lg border bg-card">
                <EmptyState
                  icon={UsersIcon}
                  title={filter === 'attention' && !hasFilters ? t('Nothing needs attention') : t('No users')}
                  description={
                    hasFilters
                      ? t('No user matches these filters.')
                      : filter === 'attention'
                        ? t('No denied, expired or soon-to-expire access.')
                        : t('There are no accounts yet.')
                  }
                  action={
                    hasFilters ? (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        {t('Clear filters')}
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {pagination.pageItems.map((user) => (
                  <PolicyUserRow
                    key={user.id}
                    user={user}
                    groupById={groupById}
                    policyById={policyById}
                    now={now}
                    isSelf={user.id === me.data?.user.id}
                    onDialog={setDialog}
                  />
                ))}
              </ul>
            )}

            <Pagination
              page={pagination.page}
              pageCount={pagination.pageCount}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={pagination.setPage}
              noun={t('users')}
            />
          </div>
        }
        policies={<GroupMatrix policies={policies} groups={groups} />}
      />

      <PolicyDialogs state={dialog} policies={policies} groups={groups} onClose={() => setDialog(null)} />
    </>
  );
}

export const PolicyManagement = Object.assign(PolicyManagementRoot, { Skeleton: PolicyManagementSkeleton });
