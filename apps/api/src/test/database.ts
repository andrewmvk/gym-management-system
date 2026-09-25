import { sql } from 'drizzle-orm';
import { env } from '@api/config/env';
import { db } from '@api/db/client';

export async function resetTestDatabase() {
  if (!env.TEST_DATABASE_URL || env.DATABASE_URL !== env.TEST_DATABASE_URL) {
    throw new Error('resetTestDatabase only runs against TEST_DATABASE_URL');
  }

  const result = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  if (result.rows.length === 0) return;

  const tables = result.rows.map((row) => `"${row.tablename}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables} CASCADE`));
}
