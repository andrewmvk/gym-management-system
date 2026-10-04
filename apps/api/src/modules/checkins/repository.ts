import { type DatabaseExecutor, db } from '@api/db/client';
import { dUsers, fCheckIns } from '@api/db/schema';
import { and, count, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';

const kioskEligible = and(
  eq(dUsers.aptitudeStatus, 'cleared'),
  isNotNull(dUsers.passwordHash),
  isNotNull(dUsers.referenceFaceEmbedding),
);

export async function listKioskEmbeddings() {
  const rows = await db
    .select({ memberId: dUsers.id, embedding: dUsers.referenceFaceEmbedding })
    .from(dUsers)
    .where(kioskEligible);
  return rows as { memberId: string; embedding: number[] }[];
}

export async function listKioskDevMembers() {
  return db.select({ memberId: dUsers.id, name: dUsers.name }).from(dUsers).where(kioskEligible).orderBy(dUsers.name);
}

export async function findMemberForCheckIn(userId: string) {
  const [user] = await db
    .select({ aptitudeStatus: dUsers.aptitudeStatus, membershipStatus: dUsers.membershipStatus })
    .from(dUsers)
    .where(eq(dUsers.id, userId));
  return user ?? null;
}

export async function insertCheckIn(input: {
  userId: string;
  turnstileStatus: 'success' | 'failed';
  turnstileResponse: Record<string, unknown>;
}) {
  const [checkIn] = await db.insert(fCheckIns).values(input).returning();
  return checkIn!;
}

// Only what the staff log shows: the stored turnstile response is read for its failure code and never returned.
export function findRecentCheckIns(limit: number, executor: DatabaseExecutor = db) {
  return executor
    .select({
      id: fCheckIns.id,
      memberName: dUsers.name,
      checkedInAt: fCheckIns.checkedInAt,
      turnstileStatus: fCheckIns.turnstileStatus,
      turnstileResponse: fCheckIns.turnstileResponse,
    })
    .from(fCheckIns)
    .innerJoin(dUsers, eq(dUsers.id, fCheckIns.userId))
    .orderBy(desc(fCheckIns.checkedInAt), desc(fCheckIns.id))
    .limit(limit);
}

export async function countCheckInsBetween(from: Date, to: Date, executor: DatabaseExecutor = db) {
  const [row] = await executor
    .select({
      total: count(),
      failed: sql<number>`count(*) filter (where ${fCheckIns.turnstileStatus} = 'failed')`.mapWith(Number),
    })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lt(fCheckIns.checkedInAt, to)));
  return { total: row?.total ?? 0, failed: row?.failed ?? 0 };
}

// Members with at least one check-in in [from, to), whatever the turnstile did: they were physically there.
export async function findCheckedInMemberIds(from: Date, to: Date, executor: DatabaseExecutor = db) {
  const rows = await executor
    .selectDistinct({ userId: fCheckIns.userId })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lt(fCheckIns.checkedInAt, to)));
  return new Set(rows.map((row) => row.userId));
}

// Newest first, capped: the member page shows the last days a member came in.
export async function findCheckInTimesForMember(userId: string, limit: number, executor: DatabaseExecutor = db) {
  const rows = await executor
    .select({ checkedInAt: fCheckIns.checkedInAt })
    .from(fCheckIns)
    .where(eq(fCheckIns.userId, userId))
    .orderBy(desc(fCheckIns.checkedInAt))
    .limit(limit);
  return rows.map((row) => row.checkedInAt);
}
