import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '@api/config/env';
import * as schema from '@api/db/schema';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  return { pool, db: drizzle(pool, { schema }) };
}

export type Database = ReturnType<typeof createDatabase>['db'];
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DatabaseExecutor = Database | Transaction;

export const { pool, db } = createDatabase(env.DATABASE_URL);

export function runMigrations(database: Database = db) {
  return migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
}
