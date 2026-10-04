import { PROFILE_EVENT_TYPES, type ProfileEventType } from '@cadence/shared/schemas/profile-events';

// Injuries and medication changes can make an exercise unsafe, so they are read before everything else.
const SAFETY_FIRST: readonly ProfileEventType[] = ['injury', 'medication_change'];

export const PROFILE_EVENT_ORDER: readonly ProfileEventType[] = [
  ...SAFETY_FIRST,
  ...PROFILE_EVENT_TYPES.filter((type) => !SAFETY_FIRST.includes(type)),
];

export function isSafetyEvent(type: ProfileEventType) {
  return SAFETY_FIRST.includes(type);
}
