import {
  ADMIN_POLICY_IDS,
  POLICY_CATALOG,
  TRAINER_POLICY_IDS,
  type PolicyId,
} from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { env } from '@api/config/env';
import { db as defaultDb, type Database, type Transaction } from '@api/db/client';
import { dUserPolicy, dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { seedCatalog } from '@api/db/seed-data/catalog';

export const SEED_TRAINER_EMAIL = 'trainer@example.com';
export const SEED_ADMIN_EMAIL = 'admin@example.com';

const BCRYPT_ROUNDS = 10;

interface StaffAccount {
  email: string;
  name: string;
  password: string;
  policyIds: readonly PolicyId[];
}

// Staff rows and grants are insert-if-missing on purpose: re-running the seed (it runs on every container boot)
// must not undo password or policy changes made later through the app (FR-43).
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

  await tx
    .insert(fUserPolicyOnUser)
    .values(account.policyIds.map((policyId) => ({ userId: user.id, policyId, effect: 'granted' as const })))
    .onConflictDoNothing();
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

    await ensureStaffAccount(tx, {
      email: SEED_TRAINER_EMAIL,
      name: 'Demo Trainer',
      password: env.SEED_TRAINER_PASSWORD,
      policyIds: TRAINER_POLICY_IDS,
    });
    await ensureStaffAccount(tx, {
      email: SEED_ADMIN_EMAIL,
      name: 'Demo Admin',
      password: env.SEED_ADMIN_PASSWORD,
      policyIds: ADMIN_POLICY_IDS,
    });

    await seedCatalog(tx);
  });
}
