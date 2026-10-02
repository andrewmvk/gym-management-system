import { db } from '@api/db/client';
import { dTurnstileConfig, TURNSTILE_CONFIG_ID, type TurnstileConfig } from '@api/db/schema';
import type { TurnstileHeader, TurnstileMethod } from '@cadence/shared/schemas/turnstile';
import { eq } from 'drizzle-orm';

export async function getOrCreateConfig(): Promise<TurnstileConfig> {
  await db.insert(dTurnstileConfig).values({ id: TURNSTILE_CONFIG_ID }).onConflictDoNothing();
  const [config] = await db.select().from(dTurnstileConfig).where(eq(dTurnstileConfig.id, TURNSTILE_CONFIG_ID));
  return config!;
}

export async function updateConfig(input: {
  method: TurnstileMethod;
  url: string;
  headers: TurnstileHeader[];
  bodyTemplate: string;
  updatedByUserId: string;
}): Promise<TurnstileConfig> {
  await getOrCreateConfig();
  const [config] = await db
    .update(dTurnstileConfig)
    .set(input)
    .where(eq(dTurnstileConfig.id, TURNSTILE_CONFIG_ID))
    .returning();
  return config!;
}
