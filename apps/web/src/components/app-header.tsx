'use client';

import { createAppAbility } from '@cadence/shared/auth';
import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Brand } from '@/components/brand';
import { KitBar } from '@/components/kit-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserMenu } from '@/components/user-menu';
import {
  type AppArea,
  isNavGroup,
  isNavItemActive,
  NAV_ENTRIES,
  type NavEntry,
  type NavGroup,
  type NavItem,
  resolveNavEntries,
} from '@/lib/navigation';
import { MEMBER_HOME_PATH, STAFF_HOME_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// whitespace-nowrap + shrink-0 keep a two-word page name on one line whatever the viewport.
function navLinkClass(isActive: boolean) {
  return cn(
    'group relative flex h-full shrink-0 items-center gap-1 px-3.5 font-display text-base font-semibold tracking-wider whitespace-nowrap uppercase transition-colors outline-none focus-visible:bg-white/10 data-[state=open]:text-kit-foreground',
    'after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.75 after:origin-left after:bg-tape after:transition-transform after:duration-300 after:ease-(--ease-out-expo)',
    isActive ? 'text-kit-foreground after:scale-x-100' : 'text-kit-muted after:scale-x-0 hover:text-kit-foreground',
  );
}

// Opens on hover (and on click or keyboard, which is also what a touch screen uses), so reaching a page is
// one move: point at the group, then click the page.
function NavGroupMenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActive = group.items.some((item) => isNavItemActive(item, pathname));

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={navLinkClass(isActive)}>
        {group.label}
        <ChevronDownIcon
          className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="flex flex-col">
          {group.items.map((item) => {
            const isCurrent = isNavItemActive(item, pathname);
            return (
              <li key={item.href}>
                <NavigationMenuLink asChild active={isCurrent}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex min-h-10 items-center gap-2.5 rounded-sm px-2.5 py-1.5 font-display text-base font-semibold tracking-wider whitespace-nowrap uppercase outline-none hover:bg-white/10 focus-visible:bg-white/10',
                      isCurrent ? 'text-kit-foreground' : 'text-kit-muted hover:text-kit-foreground',
                    )}
                  >
                    <span
                      className={cn('h-4 w-1 -skew-x-12 rounded-xs', isCurrent ? 'bg-tape' : 'bg-kit-muted/40')}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              </li>
            );
          })}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function MobileNavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const isActive = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-14 items-center gap-3 rounded-md px-3 font-display text-2xl font-bold tracking-wide uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        isActive ? 'text-kit-foreground' : 'text-kit-muted hover:text-kit-foreground',
      )}
    >
      <span className={cn('h-6 w-1.5 -skew-x-12 rounded-xs', isActive ? 'bg-tape' : 'bg-transparent')} aria-hidden />
      {item.label}
    </Link>
  );
}

function MobileNav({ entries, pathname }: { entries: NavEntry[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

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
          {entries.map((entry) =>
            isNavGroup(entry) ? (
              <div key={entry.label} className="flex flex-col">
                <p className="px-3 pt-4 pb-1 font-display text-xs font-semibold tracking-widest text-kit-muted uppercase">
                  {entry.label}
                </p>
                {entry.items.map((item) => (
                  <MobileNavLink key={item.href} item={item} pathname={pathname} onNavigate={close} />
                ))}
              </div>
            ) : (
              <MobileNavLink key={entry.href} item={entry} pathname={pathname} onNavigate={close} />
            ),
          )}
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

  const entries = resolveNavEntries(NAV_ENTRIES[area], me.data ? ability : null);
  const homeHref = area === 'staff' ? STAFF_HOME_PATH : MEMBER_HOME_PATH;

  return (
    <KitBar>
      <MobileNav entries={entries} pathname={pathname} />
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
      <NavigationMenu aria-label="Main" className="ml-6 hidden h-full md:flex">
        <NavigationMenuList className="h-full">
          {entries.map((entry) => {
            if (isNavGroup(entry)) return <NavGroupMenu key={entry.label} group={entry} pathname={pathname} />;
            const isActive = isNavItemActive(entry, pathname);
            return (
              <NavigationMenuItem key={entry.href}>
                <NavigationMenuLink asChild active={isActive}>
                  <Link href={entry.href} className={navLinkClass(isActive)}>
                    {entry.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
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
