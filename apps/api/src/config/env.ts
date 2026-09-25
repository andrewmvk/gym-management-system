import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

// Host processes read the repo-root .env; inside the container the file is absent and compose injects the variables.
config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)), quiet: true });

const requiredText = z.string().trim().min(1, 'missing');
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: requiredText.pipe(z.url()),
  DATABASE_URL: requiredText.pipe(z.url()),
  TEST_DATABASE_URL: optionalText.pipe(z.url().optional()),
  SEED_TRAINER_PASSWORD: requiredText.pipe(z.string().min(8, 'must be at least 8 characters')),
  SEED_ADMIN_PASSWORD: requiredText.pipe(z.string().min(8, 'must be at least 8 characters')),
  JWT_SECRET: requiredText.pipe(z.string().min(32, 'must be at least 32 characters')),
  KIOSK_API_KEY: requiredText.pipe(z.string().min(16, 'must be at least 16 characters')),
  UPLOADS_DIR: requiredText,
  OPENROUTER_API_KEY: optionalText,
  OPENROUTER_MODEL: optionalText,
  RESEND_API_KEY: optionalText,
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const message = issue.code === 'invalid_type' ? 'missing' : issue.message;
    return `  - ${issue.path.join('.')}: ${message}`;
  });
  throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

export const env = loadEnv();
