import { describe, expect, it } from 'vitest';
import { appRouter } from '@api/trpc/app-router';
import type { Context } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';

describe('system.health', () => {
  it('answers ok', async () => {
    const caller = createCallerFactory(appRouter)({} as Context);

    const result = await caller.system.health();

    expect(result.status).toBe('ok');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
