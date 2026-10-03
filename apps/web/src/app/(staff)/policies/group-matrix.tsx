'use client';

import { POLICY_GROUP_CATALOG } from '@cadence/shared/auth';
import { CheckIcon, CircleHelpIcon, MinusIcon, ShieldIcon } from 'lucide-react';
import { type GroupOption, groupLabel, type PolicyOption, policyMeta } from '@/app/(staff)/policies/policy-dialogs';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SKELETON_ROWS = 6;

function groupRank(groupId: string) {
  const index = POLICY_GROUP_CATALOG.findIndex((group) => group.id === groupId);
  return index === -1 ? POLICY_GROUP_CATALOG.length : index;
}

// Rows holding the same groups sit together, widest first, so each group's shape reads as a block of ticks down its
// column and the policies shared by several groups come before the ones only one group has.
function buildRows(policies: PolicyOption[], groups: GroupOption[]) {
  return policies
    .map((policy) => ({ policy, held: groups.map((group) => group.policyIds.includes(policy.id)) }))
    .sort((a, b) => {
      for (let index = 0; index < groups.length; index++) {
        if (a.held[index] !== b.held[index]) return a.held[index] ? -1 : 1;
      }
      return a.policy.description.localeCompare(b.policy.description);
    });
}

function GroupMatrixSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-end justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-6">
          {Array.from({ length: 3 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
            <div key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
      <ul className="divide-y">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <li key={index} className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-32" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupMatrixRoot({ policies, groups }: { policies: PolicyOption[]; groups: GroupOption[] }) {
  if (policies.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState icon={ShieldIcon} title="No policies" description="No policy is defined yet." />
      </div>
    );
  }

  const columns = [...groups].sort((a, b) => groupRank(a.id) - groupRank(b.id));
  const rows = buildRows(policies, columns);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="text-xl font-bold tracking-wide text-foreground">
              Policy
            </TableHead>
            {columns.map((group) => (
              <TableHead key={group.id} scope="col" className="min-w-24 py-3 text-center">
                <span className="flex items-center justify-center gap-1 font-display text-base font-bold tracking-wide text-foreground">
                  {groupLabel(group.id)}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`About the ${groupLabel(group.id)} group: ${group.description}`}
                        className="inline-flex items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45"
                      >
                        <CircleHelpIcon className="size-4" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{group.description}</TooltipContent>
                  </Tooltip>
                </span>
                <span className="numerals block text-base font-semibold text-muted-foreground">
                  {group.policyIds.length}
                  <span className="text-xs font-semibold"> of </span>
                  {policies.length}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ policy, held }, rowIndex) => {
            const previous = rows[rowIndex - 1];
            const startsCluster = previous?.held.some((value, index) => value !== held[index]);
            return (
              <TableRow key={policy.id} className={cn(startsCluster && 'border-t-4 border-t-muted')}>
                <TableCell>
                  <p className="text-sm font-medium">{policy.description}</p>
                  <p className="text-xs text-muted-foreground">{policyMeta(policy)}</p>
                </TableCell>
                {columns.map((group, index) => (
                  <TableCell key={group.id} className="text-center">
                    {held[index] ? (
                      <>
                        <CheckIcon className="mx-auto size-5 text-primary" aria-hidden />
                        <span className="sr-only">Included in the {groupLabel(group.id)} group</span>
                      </>
                    ) : (
                      <>
                        <MinusIcon className="mx-auto size-4 text-muted-foreground/40" aria-hidden />
                        <span className="sr-only">Not included in the {groupLabel(group.id)} group</span>
                      </>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export const GroupMatrix = Object.assign(GroupMatrixRoot, { Skeleton: GroupMatrixSkeleton });
