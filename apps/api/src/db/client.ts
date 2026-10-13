import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '@api/config/env';
import * as schema from '@api/db/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  return { pool, db: drizzle(pool, { schema }) };
}

export type Database = ReturnType<typeof createDatabase>['db'];
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DatabaseExecutor = Database | Transaction;

export const { pool, db } = createDatabase(env.DATABASE_URL);

interface JournalEntry {
  idx: number;
  tag: string;
}

// drizzle-orm's migrate() runs every pending migration in one transaction (pg-core/dialect.ts), but
// Postgres refuses to use an enum value in the same transaction that added it. Migration 0010 adds
// 'muscle_focus_changed' to profile_event_type; migration 0015 deletes rows with that value five
// migrations later. Catching up from any database behind 0010 - a brand new one included - fails with
// "unsafe use of new value" unless 0010 is committed on its own first. This copies the migrations up to
// and including that tag into a throwaway folder and runs them first, reproducing that commit order
// without touching the generated migration files or meta/_journal.json drizzle-kit owns.
const ENUM_COMMIT_BOUNDARY_TAG = '0010_organic_la_nuit';

function migrateUpToBoundary(database: Database, boundaryTag: string) {
  const journalPath = path.join(MIGRATIONS_FOLDER, 'meta', '_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as { entries: JournalEntry[] };
  const boundaryIdx = journal.entries.find((entry) => entry.tag === boundaryTag)?.idx;
  if (boundaryIdx === undefined) throw new Error(`Unknown migration tag: ${boundaryTag}`);
  const entriesUpToBoundary = journal.entries.filter((entry) => entry.idx <= boundaryIdx);

  const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'cadence-migrate-phase-'));
  try {
    fs.mkdirSync(path.join(tempFolder, 'meta'));
    fs.writeFileSync(path.join(tempFolder, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries: entriesUpToBoundary }));
    for (const entry of entriesUpToBoundary) {
      const filename = `${entry.tag}.sql`;
      fs.copyFileSync(path.join(MIGRATIONS_FOLDER, filename), path.join(tempFolder, filename));
    }
    return migrate(database, { migrationsFolder: tempFolder });
  } finally {
    fs.rmSync(tempFolder, { recursive: true, force: true });
  }
}

export async function runMigrations(database: Database = db) {
  await migrateUpToBoundary(database, ENUM_COMMIT_BOUNDARY_TAG);
  await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
}
