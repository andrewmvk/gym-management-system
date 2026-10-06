'use client';

import { useQuery } from '@tanstack/react-query';
import { LockIcon, SearchXIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useAppAbility } from '@/abilities';
import { MembershipControl } from '@/app/(staff)/members/membership-control';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 10;

const STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function MembersHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Member</TableHead>
        <TableHead className="hidden sm:table-cell">Plan</TableHead>
        <TableHead>Membership</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function MembersTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <Skeleton className="h-10 w-full lg:w-72" />
        <FilterBar.Trailing>
          <Skeleton className="h-10.5 w-full lg:w-80" />
        </FilterBar.Trailing>
      </FilterBar>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <MembersHead />
          <TableBody>
            {Array.from({ length: 6 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-1 h-4 w-48" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-28" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MembersTableRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canRead = ability.can('read', 'Member');
  const membersQuery = useQuery({ ...trpc.auth.listMembers.queryOptions(), enabled: canRead });
  const [search, setSearch] = useUrlState<string>('q', '');
  const [status, setStatus] = useUrlState<StatusFilter>('status', 'all', oneOf(STATUS_FILTERS));

  const members = membersQuery.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = members.filter(
    (member) =>
      (status === 'all' || member.membershipStatus === status) &&
      (!term || member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, PAGE_SIZE);

  if (!canRead) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title="No access"
          description="Your account doesn't include the member list. Ask an admin if you need it."
        />
      </div>
    );
  }

  if (membersQuery.isPending) {
    return (
      <Deferred>
        <MembersTableSkeleton />
      </Deferred>
    );
  }

  if (membersQuery.isError) {
    return (
      <QueryError
        title="We couldn't load the members"
        onRetry={() => membersQuery.refetch()}
        isRetrying={membersQuery.isRefetching}
      />
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={UsersIcon}
          title="No members yet"
          description="Members show up here once they finish signing up and set a password."
        />
      </div>
    );
  }

  const countOf = (value: StatusFilter) =>
    value === 'all' ? members.length : members.filter((member) => member.membershipStatus === value).length;

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            pagination.setPage(1);
          }}
          placeholder="Search by name or email"
          className="w-full lg:w-72"
        />
        <FilterBar.Trailing>
          <SegmentedFilter
            label="Filter by membership"
            value={status}
            onChange={(value) => {
              setStatus(value);
              pagination.setPage(1);
            }}
            options={[
              { value: 'all', label: 'All', count: countOf('all') },
              { value: 'active', label: 'Active', count: countOf('active') },
              { value: 'inactive', label: 'Inactive', count: countOf('inactive') },
            ]}
            className="w-full lg:w-auto"
          />
        </FilterBar.Trailing>
      </FilterBar>
      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState icon={SearchXIcon} title="No matches" description="Try another name, email or status." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <MembersHead />
            <TableBody>
              {pagination.pageItems.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link
                      href={`/members/${member.id}`}
                      className="rounded-sm font-semibold outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/45"
                    >
                      {member.name}
                    </Link>
                    <p className="max-w-64 truncate text-muted-foreground">{member.email}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{member.membershipPlan ?? 'None'}</TableCell>
                  <TableCell>
                    <MembershipControl userId={member.id} name={member.name} status={member.membershipStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.setPage}
        noun="members"
      />
    </div>
  );
}

export const MembersTable = Object.assign(MembersTableRoot, { Skeleton: MembersTableSkeleton });
