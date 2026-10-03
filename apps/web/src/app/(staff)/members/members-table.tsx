'use client';

import { useQuery } from '@tanstack/react-query';
import { LockIcon, SearchXIcon, UsersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppAbility } from '@/abilities';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 10;

const STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type AptitudeStatus = 'pending' | 'cleared' | 'rejected' | null;

function MembershipBadge({ status }: { status: 'active' | 'inactive' | null }) {
  if (status === 'active') return <Badge variant="live">Active</Badge>;
  if (status === 'inactive') return <Badge variant="unavailable">Inactive</Badge>;
  return <Badge variant="pending">None</Badge>;
}

function AptitudeBadge({ status }: { status: AptitudeStatus }) {
  if (status === 'cleared') return <Badge variant="live">Cleared</Badge>;
  if (status === 'rejected') return <Badge variant="negative">Rejected</Badge>;
  return <Badge variant="pending">Pending</Badge>;
}

function MembersHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Member</TableHead>
        <TableHead className="hidden sm:table-cell">Plan</TableHead>
        <TableHead>Membership</TableHead>
        <TableHead className="hidden md:table-cell">Aptitude</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      {children}
    </div>
  );
}

function MembersTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Toolbar>
        <Skeleton className="h-10 w-full sm:w-72" />
        <Skeleton className="h-10 w-full sm:w-80" />
      </Toolbar>
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
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-6 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
      <div className="overflow-hidden rounded-lg border bg-card">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            placeholder="Search by name or e-mail"
            className="sm:w-72"
          />
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
          />
        </Toolbar>
        {filtered.length === 0 ? (
          <EmptyState icon={SearchXIcon} title="No matches" description="Try another name, e-mail or status." />
        ) : (
          <Table>
            <MembersHead />
            <TableBody>
              {pagination.pageItems.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-semibold">{member.name}</p>
                    <p className="max-w-64 truncate text-muted-foreground">{member.email}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{member.membershipPlan ?? 'None'}</TableCell>
                  <TableCell>
                    <MembershipBadge status={member.membershipStatus} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <AptitudeBadge status={member.aptitudeStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
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
