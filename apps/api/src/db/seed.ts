import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '@api/config/env';
import { type Database, db as defaultDb, type Transaction } from '@api/db/client';
import { dUserPolicy, dUserPolicyGroup, dUserPolicyGroupPolicy, dUsers, fUserPolicyGroupOnUser } from '@api/db/schema';
import { seedCatalog } from '@api/db/seed-data/catalog';
import { computeFaceEmbedding } from '@api/lib/face-embedding';
import { saveUpload } from '@api/lib/uploads';
import { DEFAULT_MEMBERSHIP_PLAN } from '@api/modules/auth/service';
import {
  ADMIN_GROUP,
  MEMBER_GROUP,
  POLICY_CATALOG,
  POLICY_GROUP_CATALOG,
  type PolicyGroupId,
  TRAINER_GROUP,
} from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import { and, eq, notInArray, sql } from 'drizzle-orm';

export const SEED_TRAINER_EMAIL = 'trainer@example.com';
export const SEED_ADMIN_EMAIL = 'admin@example.com';
export const SEED_STUDENT_EMAIL = 'student@example.com';

const STUDENT_PHOTO_PATH = fileURLToPath(new URL('../test/fixtures/faces/valid/reference.jpg', import.meta.url));

const BCRYPT_ROUNDS = 10;

interface StaffAccount {
  email: string;
  name: string;
  password: string;
  groupId: PolicyGroupId;
}

// The groups are owned by the code, so every run re-asserts their policy lists: a change in the catalog reaches
// the members the groups already have.
async function seedPolicyGroups(tx: Transaction) {
  await tx
    .insert(dUserPolicyGroup)
    .values(POLICY_GROUP_CATALOG.map(({ id, description }) => ({ id, description })))
    .onConflictDoUpdate({ target: dUserPolicyGroup.id, set: { description: sql`excluded.description` } });

  for (const group of POLICY_GROUP_CATALOG) {
    await tx
      .delete(dUserPolicyGroupPolicy)
      .where(
        and(
          eq(dUserPolicyGroupPolicy.groupId, group.id),
          notInArray(dUserPolicyGroupPolicy.policyId, [...group.policyIds]),
        ),
      );
    await tx
      .insert(dUserPolicyGroupPolicy)
      .values(group.policyIds.map((policyId) => ({ groupId: group.id, policyId })))
      .onConflictDoNothing();
  }
}

// Staff rows and memberships are insert-if-missing on purpose: re-running the seed (it runs on every container
// boot) must not undo password or access changes made later through the app (FR-43).
async function ensureStaffAccount(tx: Transaction, account: StaffAccount) {
  await tx
    .insert(dUsers)
    .values({
      email: account.email,
      name: account.name,
      passwordHash: await bcrypt.hash(account.password, BCRYPT_ROUNDS),
    })
    .onConflictDoNothing({ target: dUsers.email });

  const [user] = await tx.select({ id: dUsers.id }).from(dUsers).where(eq(dUsers.email, account.email));
  if (!user) throw new Error(`Seed could not load the staff account ${account.email}`);

  await tx.insert(fUserPolicyGroupOnUser).values({ userId: user.id, groupId: account.groupId }).onConflictDoNothing();
}

// The demo member is created already activated (cleared, active, in the member group) so the member screens can be
// used without going through signup. Like the staff rows it is insert-if-missing, and the photo is only stored and
// embedded when the row is first created, so a re-run never piles up copies of the file.
async function ensureStudentAccount(tx: Transaction) {
  const [created] = await tx
    .insert(dUsers)
    .values({
      email: SEED_STUDENT_EMAIL,
      name: 'Demo Student',
      passwordHash: await bcrypt.hash(env.SEED_STUDENT_PASSWORD, BCRYPT_ROUNDS),
      aptitudeStatus: 'cleared',
      membershipStatus: 'active',
      membershipPlan: DEFAULT_MEMBERSHIP_PLAN,
    })
    .onConflictDoNothing({ target: dUsers.email })
    .returning({ id: dUsers.id });

  if (created) {
    const photo = await readFile(STUDENT_PHOTO_PATH);
    const embedding = await computeFaceEmbedding(photo);
    if (!embedding.ok) {
      throw new Error(`Seed could not compute the face embedding of the demo student (${embedding.reason})`);
    }
    const saved = await saveUpload({
      ownerId: created.id,
      kind: 'reference_photo',
      filename: 'reference.jpg',
      mimeType: 'image/jpeg',
      base64: photo.toString('base64'),
    });
    await tx
      .update(dUsers)
      .set({ referencePhotoPath: saved.path, referenceFaceEmbedding: embedding.embedding })
      .where(eq(dUsers.id, created.id));
  }

  const [user] = await tx.select({ id: dUsers.id }).from(dUsers).where(eq(dUsers.email, SEED_STUDENT_EMAIL));
  if (!user) throw new Error(`Seed could not load the student account ${SEED_STUDENT_EMAIL}`);

  await tx.insert(fUserPolicyGroupOnUser).values({ userId: user.id, groupId: MEMBER_GROUP }).onConflictDoNothing();
}

export async function seedBase(database: Database = defaultDb) {
  await database.transaction(async (tx) => {
    await tx
      .insert(dUserPolicy)
      .values([...POLICY_CATALOG])
      .onConflictDoUpdate({
        target: dUserPolicy.id,
        set: {
          description: sql`excluded.description`,
          operation: sql`excluded.operation`,
          resource: sql`excluded.resource`,
          scope: sql`excluded.scope`,
        },
      });

    await seedPolicyGroups(tx);

    await ensureStaffAccount(tx, {
      email: SEED_TRAINER_EMAIL,
      name: 'Demo Trainer',
      password: env.SEED_TRAINER_PASSWORD,
      groupId: TRAINER_GROUP,
    });
    await ensureStaffAccount(tx, {
      email: SEED_ADMIN_EMAIL,
      name: 'Demo Admin',
      password: env.SEED_ADMIN_PASSWORD,
      groupId: ADMIN_GROUP,
    });
    await ensureStudentAccount(tx);

    await seedCatalog(tx);
  });
}
