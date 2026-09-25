import { READ_CATALOG } from '@cadence/shared/auth';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUserPolicy, dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { resetTestDatabase } from '@api/test/database';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

async function columnsOf(table: string) {
  const result = await db.execute<{ column_name: string }>(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} ORDER BY column_name`,
  );
  return result.rows.map((row) => row.column_name);
}

async function insertUser(email = 'someone@example.com') {
  const [user] = await db.insert(dUsers).values({ email, name: 'Someone' }).returning();
  return user!;
}

async function insertPolicy() {
  await db.insert(dUserPolicy).values({
    id: READ_CATALOG,
    description: 'Browse the catalog',
    operation: 'read',
    resource: 'Catalog',
    scope: 'all',
  });
}

describe('users and policies schema', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  it('creates the tables with the documented columns', async () => {
    expect(await columnsOf('d_users')).toEqual(
      [
        'aptitude_status',
        'birthdate',
        'created_at',
        'email',
        'id',
        'membership_plan',
        'membership_status',
        'name',
        'password_hash',
        'phone',
        'reference_face_embedding',
        'reference_photo_path',
        'updated_at',
      ].sort(),
    );
    expect(await columnsOf('d_user_policy')).toEqual(
      ['created_at', 'description', 'id', 'operation', 'resource', 'scope'].sort(),
    );
    expect(await columnsOf('f_user_policy_on_user')).toEqual(
      ['effect', 'expires_on', 'policy_id', 'user_id'].sort(),
    );
  });

  it('rejects a duplicate e-mail', async () => {
    await insertUser('dup@example.com');

    await expect(insertUser('dup@example.com')).rejects.toMatchObject({
      cause: { code: UNIQUE_VIOLATION },
    });
  });

  it('rejects a duplicate (user, policy) grant', async () => {
    const user = await insertUser();
    await insertPolicy();
    const grant = { userId: user.id, policyId: READ_CATALOG, effect: 'granted' as const };
    await db.insert(fUserPolicyOnUser).values(grant);

    await expect(db.insert(fUserPolicyOnUser).values(grant)).rejects.toMatchObject({
      cause: { code: UNIQUE_VIOLATION },
    });
  });

  it('rejects a grant pointing to a missing user', async () => {
    await insertPolicy();

    await expect(
      db.insert(fUserPolicyOnUser).values({
        userId: '00000000-0000-0000-0000-000000000000',
        policyId: READ_CATALOG,
        effect: 'granted',
      }),
    ).rejects.toMatchObject({ cause: { code: FOREIGN_KEY_VIOLATION } });
  });

  it('rejects a grant pointing to a missing policy', async () => {
    const user = await insertUser();

    await expect(
      db.insert(fUserPolicyOnUser).values({ userId: user.id, policyId: 'no_such_policy', effect: 'granted' }),
    ).rejects.toMatchObject({ cause: { code: FOREIGN_KEY_VIOLATION } });
  });
});
