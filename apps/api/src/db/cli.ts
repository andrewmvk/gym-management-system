import { sql } from 'drizzle-orm';
import { env } from '@api/config/env';
import { db, pool, runMigrations } from '@api/db/client';
import { seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';

const COMMANDS = {
  migrate: async () => {
    await runMigrations();
    logger.info('migrations applied');
  },
  seed: async () => {
    await seedBase();
    logger.info('base seed applied');
  },
  reset: async () => {
    if (env.NODE_ENV === 'production') {
      throw new Error('db:reset refuses to run when NODE_ENV is production');
    }
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    logger.info('local database wiped');
    await runMigrations();
    await seedBase();
    logger.info('local database migrated and seeded');
  },
} satisfies Record<string, () => Promise<void>>;

const command = process.argv[2];

if (!command || !(command in COMMANDS)) {
  console.error(`Usage: tsx src/db/cli.ts <${Object.keys(COMMANDS).join('|')}>`);
  process.exit(1);
}

try {
  await COMMANDS[command as keyof typeof COMMANDS]();
} catch (error) {
  logger.error({ err: error, command }, 'database command failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
