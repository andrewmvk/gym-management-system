import type { AppAbility } from '@cadence/shared/auth';

export const LOGIN_PATH = '/login';
export const MEMBER_HOME_PATH = '/home';
export const STAFF_HOME_PATH = '/staff';

export function homePathFor(ability: AppAbility): string | null {
  if (ability.can('read', 'StaffApp')) return STAFF_HOME_PATH;
  if (ability.can('read', 'MemberApp')) return MEMBER_HOME_PATH;
  return null;
}

export function loginPathFor(returnTo: string) {
  return `${LOGIN_PATH}?next=${encodeURIComponent(returnTo)}`;
}

// Only same-app paths are accepted, so a crafted ?next= can't send the user to another site.
export function safeReturnPath(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}
