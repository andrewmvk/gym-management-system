import { PT_AUTH } from '@/lib/i18n/pt/auth';
import { PT_COACH } from '@/lib/i18n/pt/coach';
import { PT_COMMON } from '@/lib/i18n/pt/common';
import { PT_DATA } from '@/lib/i18n/pt/data';
import { PT_KIOSK } from '@/lib/i18n/pt/kiosk';
import { PT_MEMBER } from '@/lib/i18n/pt/member';
import { PT_PUBLIC } from '@/lib/i18n/pt/public';
import { PT_STAFF } from '@/lib/i18n/pt/staff';
import { PT_STAFF_MEMBERS } from '@/lib/i18n/pt/staff-members';
import { PT_STAFF_REVIEWS } from '@/lib/i18n/pt/staff-reviews';

// Portuguese text for every English key the app shows. Split by area only to keep each file readable.
export const PT = {
  ...PT_COMMON,
  ...PT_DATA,
  ...PT_AUTH,
  ...PT_PUBLIC,
  ...PT_MEMBER,
  ...PT_COACH,
  ...PT_STAFF,
  ...PT_STAFF_MEMBERS,
  ...PT_STAFF_REVIEWS,
  ...PT_KIOSK,
} as const;
