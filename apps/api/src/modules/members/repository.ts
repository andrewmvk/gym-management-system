import { type DatabaseExecutor, db } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import { eq } from 'drizzle-orm';

// The columns are listed one by one so the embedding and the photo path can never reach a caller (FR-40).
const memberColumns = {
  id: dUsers.id,
  name: dUsers.name,
  email: dUsers.email,
  phone: dUsers.phone,
  birthdate: dUsers.birthdate,
  gender: dUsers.gender,
  aptitudeStatus: dUsers.aptitudeStatus,
  membershipStatus: dUsers.membershipStatus,
  membershipPlan: dUsers.membershipPlan,
  createdAt: dUsers.createdAt,
};

export async function findMemberById(userId: string, executor: DatabaseExecutor = db) {
  const [member] = await executor.select(memberColumns).from(dUsers).where(eq(dUsers.id, userId));
  return member ?? null;
}

export async function updateMembershipStatus(
  userId: string,
  membershipStatus: 'active' | 'inactive',
  executor: DatabaseExecutor = db,
) {
  const [member] = await executor.update(dUsers).set({ membershipStatus }).where(eq(dUsers.id, userId)).returning({
    id: dUsers.id,
    name: dUsers.name,
    email: dUsers.email,
    membershipStatus: dUsers.membershipStatus,
    membershipPlan: dUsers.membershipPlan,
    aptitudeStatus: dUsers.aptitudeStatus,
  });
  return member!;
}
