import { db } from '@api/db/client';
import { dUsers, fCheckIns } from '@api/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';

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

export async function findMemberAptitude(userId: string) {
  const [user] = await db.select({ aptitudeStatus: dUsers.aptitudeStatus }).from(dUsers).where(eq(dUsers.id, userId));
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
