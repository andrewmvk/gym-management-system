import * as repository from '@api/modules/checkins/repository';
import { type UnlockOptions, unlockTurnstile } from '@api/modules/turnstile/service';

export type CheckInOutcome =
  | { kind: 'member_not_found' }
  | { kind: 'member_not_cleared' }
  | { kind: 'recorded'; checkInId: string; turnstileStatus: 'success' | 'failed' };

// RN-09: once the member is validated the check-in row is always written, whatever the turnstile did.
export async function recordCheckIn(memberId: string, options?: UnlockOptions): Promise<CheckInOutcome> {
  const member = await repository.findMemberAptitude(memberId);
  if (!member) return { kind: 'member_not_found' };
  if (member.aptitudeStatus !== 'cleared') return { kind: 'member_not_cleared' };

  const { status, ...details } = await unlockTurnstile({ memberId }, options);
  const checkIn = await repository.insertCheckIn({
    userId: memberId,
    turnstileStatus: status,
    turnstileResponse: details,
  });
  return { kind: 'recorded', checkInId: checkIn.id, turnstileStatus: status };
}
