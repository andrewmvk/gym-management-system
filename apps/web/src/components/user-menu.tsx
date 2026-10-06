'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import { Deferred } from '@/components/deferred';
import { MembershipBadge } from '@/components/membership-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogout } from '@/hooks/use-logout';
import type { AppArea } from '@/lib/navigation';
import { useTRPC } from '@/lib/trpc';

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase();
}

function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2 px-1">
      <Skeleton className="size-9 rounded-full bg-white/12" />
      <Skeleton className="hidden h-4 w-24 bg-white/12 sm:block" />
    </div>
  );
}

function UserMenuRoot({ area }: { area: AppArea }) {
  const trpc = useTRPC();
  const me = useQuery(trpc.auth.me.queryOptions());
  const logout = useLogout();

  if (me.isPending) {
    return (
      <Deferred>
        <UserMenuSkeleton />
      </Deferred>
    );
  }
  if (!me.data) return null;
  const { user } = me.data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex h-11 items-center gap-2 rounded-md px-1.5 outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50 sm:pr-2.5">
        <span className="numerals flex size-9 items-center justify-center rounded-full bg-tape text-base font-bold text-tape-foreground">
          {initialsOf(user.name)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{user.name}</span>
        <ChevronDownIcon className="hidden size-4 text-kit-muted transition-transform group-data-[state=open]:rotate-180 sm:block" />
        <span className="sr-only">Open account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-semibold">{user.name}</span>
          <span className="truncate text-muted-foreground">{user.email}</span>
          {area === 'member' && user.membershipPlan && (
            <MembershipBadge plan={user.membershipPlan} status={user.membershipStatus} className="mt-2" />
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          className="cursor-pointer"
          onSelect={() => logout.mutate()}
        >
          <LogOutIcon className="text-destructive" />
          {logout.isPending ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const UserMenu = Object.assign(UserMenuRoot, { Skeleton: UserMenuSkeleton });
