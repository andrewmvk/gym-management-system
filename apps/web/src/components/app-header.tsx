'use client';

import { createAppAbility } from '@cadence/shared/auth';
import { useQuery } from '@tanstack/react-query';
import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Brand } from '@/components/brand';
import { KitBar } from '@/components/kit-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserMenu } from '@/components/user-menu';
import { type AppArea, isNavItemActive, NAV_ITEMS, type NavItem } from '@/lib/navigation';
import { MEMBER_HOME_PATH, STAFF_HOME_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function MobileNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 text-kit-foreground hover:bg-white/10 md:hidden">
          <MenuIcon className="size-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="gap-8 border-r-0 bg-kit p-0 text-kit-foreground">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Go to another section of Cadence.</SheetDescription>
        <nav className="flex flex-col px-3">
          {items.map((item) => {
            const isActive = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-14 items-center gap-3 rounded-md px-3 font-display text-2xl font-bold tracking-wide uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive ? 'text-kit-foreground' : 'text-kit-muted hover:text-kit-foreground',
                )}
              >
                <span
                  className={cn('h-6 w-1.5 -skew-x-12 rounded-xs', isActive ? 'bg-tape' : 'bg-transparent')}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function AppHeader({ area }: { area: AppArea }) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const me = useQuery(trpc.auth.me.queryOptions());
  const rules = me.data?.rules;
  const membership = me.data?.user;
  const ability = useMemo(() => createAppAbility(rules), [rules]);

  const items = NAV_ITEMS[area].filter((item) => !item.isVisible || (me.data && item.isVisible(ability)));
  const homeHref = area === 'staff' ? STAFF_HOME_PATH : MEMBER_HOME_PATH;

  return (
    <KitBar>
      <MobileNav items={items} pathname={pathname} />
      <Link
        href={homeHref}
        className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Brand />
        {area === 'staff' && (
          <span className="rounded-sm bg-tape px-1.5 py-0.5 font-display text-xs font-bold tracking-widest text-tape-foreground uppercase">
            Staff
          </span>
        )}
      </Link>
      <nav aria-label="Main" className="ml-6 hidden h-full items-stretch md:flex">
        {items.map((item) => {
          const isActive = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex items-center px-3.5 font-display text-base font-semibold tracking-wider uppercase transition-colors outline-none focus-visible:bg-white/10',
                'after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.75 after:origin-left after:bg-tape after:transition-transform after:duration-300 after:ease-(--ease-out-expo)',
                isActive
                  ? 'text-kit-foreground after:scale-x-100'
                  : 'text-kit-muted after:scale-x-0 hover:text-kit-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        {area === 'member' && membership?.membershipPlan && (
          <Badge
            variant={membership.membershipStatus === 'active' ? 'live' : 'unavailable'}
            className="mr-1 hidden sm:inline-flex"
          >
            {membership.membershipPlan} · {membership.membershipStatus}
          </Badge>
        )}
        <ThemeToggle />
        <UserMenu area={area} />
      </div>
    </KitBar>
  );
}
