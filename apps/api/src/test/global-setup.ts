import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const rootEnvFile = fileURLToPath(new URL('../../../../.env', import.meta.url));

export default async function migrateTestDatabase() {
  if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is missing: tests run against a real, separate Postgres database');
  }
  if (testDatabaseUrl === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must point to a different database than DATABASE_URL');
  }

  const pool = new Pool({ connectionString: testDatabaseUrl });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
    });
  } catch (error) {
    // Drizzle wraps the driver error and only says "Failed query"; the Postgres reason is on `cause`.
    const cause = (error as Error).cause as { code?: string; message?: string } | undefined;
    const reason = cause?.message ? `${cause.code ?? 'error'}: ${cause.message}` : (error as Error).message;
    throw new Error(`Could not migrate the test database (is it running? try pnpm db:up). ${reason}`);
  } finally {
    await pool.end();
  }
}
