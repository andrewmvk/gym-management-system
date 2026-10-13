import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDatabase, runMigrations } from '@api/db/client';

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

  // Goes through the same runMigrations() the app and db:migrate use (not a second, divergent migrate()
  // call), so the test database gets the same enum-boundary fix (apps/api/src/db/client.ts).
  const { pool, db } = createDatabase(testDatabaseUrl);
  try {
    await runMigrations(db);
  } catch (error) {
    // Drizzle wraps the driver error and only says "Failed query"; the Postgres reason is on `cause`.
    const cause = (error as Error).cause as { code?: string; message?: string } | undefined;
    const reason = cause?.message ? `${cause.code ?? 'error'}: ${cause.message}` : (error as Error).message;
    throw new Error(`Could not migrate the test database (is it running? try pnpm db:up). ${reason}`);
  } finally {
    await pool.end();
  }
}
