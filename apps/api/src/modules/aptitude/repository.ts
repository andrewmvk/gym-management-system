import { eq } from 'drizzle-orm';
import { db, type DatabaseExecutor } from '@api/db/client';
import { dUsers, type User } from '@api/db/schema';

export async function findByEmail(email: string, executor: DatabaseExecutor = db): Promise<User | null> {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.email, email));
  return user ?? null;
}

export async function findById(id: string, executor: DatabaseExecutor = db): Promise<User | null> {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.id, id));
  return user ?? null;
}

export async function insertPendingApplicant(
  input: { name: string; phone: string; email: string; birthdate: string },
  executor: DatabaseExecutor = db,
): Promise<User> {
  const [user] = await executor
    .insert(dUsers)
    .values({ ...input, aptitudeStatus: 'pending' })
    .returning();
  return user!;
}

export async function updateBasicInfo(
  id: string,
  input: { name: string; phone: string; birthdate: string },
  executor: DatabaseExecutor = db,
): Promise<User> {
  const [user] = await executor.update(dUsers).set(input).where(eq(dUsers.id, id)).returning();
  return user!;
}

export async function saveReferencePhoto(
  id: string,
  input: { referencePhotoPath: string; referenceFaceEmbedding: number[] },
  executor: DatabaseExecutor = db,
): Promise<User> {
  const [user] = await executor.update(dUsers).set(input).where(eq(dUsers.id, id)).returning();
  return user!;
}
