import { endOfLocalDay, startOfLocalDay, todayLocal } from '@api/lib/dates';
import * as repository from '@api/modules/checkins/repository';
import * as turnstileRepository from '@api/modules/turnstile/repository';
import {
  isConfigured,
  type TurnstileFailureReason,
  type UnlockOptions,
  unlockTurnstile,
} from '@api/modules/turnstile/service';

export type CheckInOutcome =
  | { kind: 'member_not_found' }
  | { kind: 'member_not_cleared' }
  | { kind: 'member_inactive' }
  | { kind: 'recorded'; checkInId: string; turnstileStatus: 'success' | 'failed' };

// RN-09: once the member is validated the check-in row is always written, whatever the turnstile did.
// An inactive membership is refused before the turnstile is called, so the door never opens for it.
export async function recordCheckIn(memberId: string, options?: UnlockOptions): Promise<CheckInOutcome> {
  const member = await repository.findMemberForCheckIn(memberId);
  if (!member) return { kind: 'member_not_found' };
  if (member.aptitudeStatus !== 'cleared') return { kind: 'member_not_cleared' };
  if (member.membershipStatus === 'inactive') return { kind: 'member_inactive' };

  const { status, ...details } = await unlockTurnstile({ memberId }, options);
  const checkIn = await repository.insertCheckIn({
    userId: memberId,
    turnstileStatus: status,
    turnstileResponse: details,
  });
  return { kind: 'recorded', checkInId: checkIn.id, turnstileStatus: status };
}

const DEFAULT_RECENT_LIMIT = 50;
export const MAX_RECENT_LIMIT = 100;

const KNOWN_FAILURE_CODES: readonly TurnstileFailureReason[] = [
  'not_configured',
  'timeout',
  'http_error',
  'network_error',
];
export type TurnstileFailureCode = TurnstileFailureReason | 'unknown';

// The stored response is `{ response, error }` on a failure (see unlockTurnstile). Anything else, such as a
// row written before the error code existed, is "unknown" rather than a guess.
export function toFailureCode(
  turnstileStatus: 'success' | 'failed',
  turnstileResponse: Record<string, unknown> | null,
): TurnstileFailureCode | null {
  if (turnstileStatus === 'success') return null;
  const error = turnstileResponse?.error;
  return KNOWN_FAILURE_CODES.find((code) => code === error) ?? 'unknown';
}

export async function listRecentCheckIns(limit: number = DEFAULT_RECENT_LIMIT) {
  const rows = await repository.findRecentCheckIns(limit);
  return rows.map((row) => ({
    id: row.id,
    memberName: row.memberName,
    checkedInAt: row.checkedInAt,
    turnstileStatus: row.turnstileStatus,
    failureReason: toFailureCode(row.turnstileStatus, row.turnstileResponse),
  }));
}

export async function getTurnstileSummary(now: Date = new Date()) {
  const today = todayLocal(now);
  const [counts, config] = await Promise.all([
    repository.countCheckInsBetween(startOfLocalDay(today), endOfLocalDay(today)),
    turnstileRepository.getOrCreateConfig(),
  ]);
  return { failedToday: counts.failed, totalToday: counts.total, isConfigured: isConfigured(config) };
}
