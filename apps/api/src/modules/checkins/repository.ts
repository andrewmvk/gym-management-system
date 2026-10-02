import { db } from '@api/db/client';
import { dUsers, fCheckIns } from '@api/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';

export async function listKioskEmbeddings() {
  const rows = await db
    .select({ memberId: dUsers.id, embedding: dUsers.referenceFaceEmbedding })
    .from(dUsers)
    .where(
      and(
        eq(dUsers.aptitudeStatus, 'cleared'),
        isNotNull(dUsers.passwordHash),
        isNotNull(dUsers.referenceFaceEmbedding),
      ),
    );
  return rows as { memberId: string; embedding: number[] }[];
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
