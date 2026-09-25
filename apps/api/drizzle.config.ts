import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Invalid environment configuration: DATABASE_URL is missing');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: databaseUrl },
});
