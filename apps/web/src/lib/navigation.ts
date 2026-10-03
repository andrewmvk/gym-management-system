import type { AppAbility } from '@cadence/shared/auth';
import { MEMBER_HOME_PATH, STAFF_HOME_PATH } from '@/lib/routes';

export type AppArea = 'member' | 'staff';

export interface NavItem {
  href: string;
  label: string;
  isVisible?: (ability: AppAbility) => boolean;
}

export const NAV_ITEMS: Record<AppArea, NavItem[]> = {
  member: [
    { href: MEMBER_HOME_PATH, label: 'Home' },
    { href: '/plan', label: 'My plan' },
    { href: '/onboarding', label: 'Health profile' },
  ],
  staff: [
    { href: STAFF_HOME_PATH, label: 'Overview' },
    { href: '/reviews', label: 'Plan reviews' },
    {
      href: '/certificates',
      label: 'Certificates',
      isVisible: (ability) => ability.can('manage', 'MedicalCertificate'),
    },
    { href: '/catalog', label: 'Catalog' },
    {
      href: '/policies',
      label: 'Policies',
      isVisible: (ability) => ability.can('manage', 'UserPolicyAssignment'),
    },
    {
      href: '/settings/turnstile',
      label: 'Turnstile',
      isVisible: (ability) => ability.can('manage', 'TurnstileConfig'),
    },
  ],
};

export function isNavItemActive(item: NavItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
