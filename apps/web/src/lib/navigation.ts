import type { AppAbility } from '@cadence/shared/auth';
import { MEMBER_HOME_PATH, STAFF_HOME_PATH } from '@/lib/routes';

export type AppArea = 'member' | 'staff';

export interface NavItem {
  href: string;
  label: string;
  isVisible?: (ability: AppAbility) => boolean;
}

// A dropdown of related pages, so the header keeps a handful of entries however many pages the area has.
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

export const NAV_ENTRIES: Record<AppArea, NavEntry[]> = {
  member: [
    { href: MEMBER_HOME_PATH, label: 'Home' },
    { href: '/plan', label: 'My plan' },
    { href: '/metrics', label: 'Metrics' },
    { href: '/gym', label: 'Gym info' },
    { href: '/onboarding', label: 'Health profile' },
  ],
  staff: [
    { href: STAFF_HOME_PATH, label: 'Overview' },
    { href: '/reviews', label: 'Plan reviews' },
    {
      label: 'Gym',
      items: [
        { href: '/gym', label: 'Gym info' },
        { href: '/checkins', label: 'Check-ins', isVisible: (ability) => ability.can('read', 'CheckIn') },
        { href: '/catalog', label: 'Catalog' },
      ],
    },
    {
      label: 'People',
      items: [
        { href: '/members', label: 'Members', isVisible: (ability) => ability.can('read', 'Member') },
        {
          href: '/certificates',
          label: 'Certificates',
          isVisible: (ability) => ability.can('manage', 'MedicalCertificate'),
        },
        {
          href: '/policies',
          label: 'Policies',
          isVisible: (ability) => ability.can('manage', 'UserPolicyAssignment'),
        },
      ],
    },
    {
      label: 'Setup',
      items: [
        {
          href: '/settings/turnstile',
          label: 'Turnstile',
          isVisible: (ability) => ability.can('manage', 'TurnstileConfig'),
        },
        {
          href: '/settings/hours',
          label: 'Opening hours',
          isVisible: (ability) => ability.can('manage', 'GymSettings'),
        },
      ],
    },
  ],
};

// Permission-gated items stay hidden until the ability is known. A group left with nothing disappears,
// and one left with a single page is just that page.
export function resolveNavEntries(entries: NavEntry[], ability: AppAbility | null): NavEntry[] {
  const isVisible = (item: NavItem) => !item.isVisible || (ability !== null && item.isVisible(ability));

  return entries.flatMap((entry): NavEntry[] => {
    if (!isNavGroup(entry)) return isVisible(entry) ? [entry] : [];
    const items = entry.items.filter(isVisible);
    if (items.length === 0) return [];
    if (items.length === 1) return items;
    return [{ ...entry, items }];
  });
}

export function isNavItemActive(item: NavItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
