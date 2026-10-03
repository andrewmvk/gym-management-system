'use client';

import { useQuery } from '@tanstack/react-query';
import { LockIcon, ShieldIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';
import { useAppAbility } from '@/abilities';
import { type PolicyDialogState, PolicyDialogs } from '@/app/(staff)/policies/policy-dialogs';
import { hasException, PolicyUserRow } from '@/app/(staff)/policies/policy-user-row';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 8;

const POLICY_TABS = ['users', 'policies'] as const;
type PolicyTab = (typeof POLICY_TABS)[number];

const USER_FILTERS = ['all', 'attention'] as const;
type UserFilter = (typeof USER_FILTERS)[number];

function PolicyTabs({
  users,
  policies,
  ...tabsProps
}: {
  users: React.ReactNode;
  policies: React.ReactNode;
} & Pick<React.ComponentProps<typeof Tabs>, 'value' | 'onValueChange'>) {
  return (
    <Tabs defaultValue="users" {...tabsProps}>
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-full sm:w-80" />
            <Skeleton className="h-11 w-full sm:w-72" />
          </div>
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
      policies={null}
    />
  );
}

function PolicyManagementRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'UserPolicyAssignment');
  const [tab, setTab] = useUrlState<PolicyTab>('tab', 'users', oneOf(POLICY_TABS));
  const [search, setSearch] = useUrlState<string>('q', '', (value): value is string => typeof value === 'string');
  const [filter, setFilter] = useUrlState<UserFilter>('filter', 'all', oneOf(USER_FILTERS));
  const [dialog, setDialog] = useState<PolicyDialogState | null>(null);

  const me = useQuery(trpc.auth.me.queryOptions());
  const listQuery = useQuery({ ...trpc.policies.list.queryOptions(), enabled: canManage });

  const now = Date.now();
  const term = search.trim().toLowerCase();
  const matchingSearch = (listQuery.data?.users ?? []).filter(
    (user) => !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
  );
  const attentionCount = matchingSearch.filter((user) => hasException(user, now)).length;
  const users = filter === 'attention' ? matchingSearch.filter((user) => hasException(user, now)) : matchingSearch;
  const pagination = usePagination(users, PAGE_SIZE);

  if (!canManage) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title="No access"
          description="Your account doesn't include policy management. Ask an admin if you need it."
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
        title="We couldn't load the policies"
        onRetry={() => listQuery.refetch()}
        isRetrying={listQuery.isRefetching}
      />
    );
  }

  const { policies } = listQuery.data;
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));

  return (
    <>
      <PolicyTabs
        value={tab}
        onValueChange={(value) => setTab(value as PolicyTab)}
        users={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  pagination.setPage(1);
                }}
                placeholder="Search by name or email"
                className="w-full sm:w-80"
              />
              <SegmentedFilter
                label="Filter users"
                value={filter}
                onChange={(value) => {
                  setFilter(value);
                  pagination.setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All', count: matchingSearch.length },
                  { value: 'attention', label: 'Needs attention', count: attentionCount },
                ]}
                className="w-full sm:w-auto"
              />
            </div>

            {users.length === 0 ? (
              <div className="rounded-lg border bg-card">
                <EmptyState
                  icon={UsersIcon}
                  title={filter === 'attention' && !term ? 'Nothing needs attention' : 'No users'}
                  description={
                    term
                      ? 'No user matches that search.'
                      : filter === 'attention'
                        ? 'No denied, expired or soon-to-expire grants.'
                        : 'There are no accounts yet.'
                  }
                  action={
                    term ? (
                      <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                        Clear search
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
              noun="users"
            />
          </div>
        }
        policies={
          policies.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <EmptyState icon={ShieldIcon} title="No policies" description="No policy is defined yet." />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{policy.description}</p>
                        <p className="text-xs text-muted-foreground">{policy.id}</p>
                      </TableCell>
                      <TableCell>{policy.operation}</TableCell>
                      <TableCell>{policy.resource}</TableCell>
                      <TableCell>{policy.scope}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        }
      />

      <PolicyDialogs state={dialog} policies={policies} onClose={() => setDialog(null)} />
    </>
  );
}

export const PolicyManagement = Object.assign(PolicyManagementRoot, { Skeleton: PolicyManagementSkeleton });
