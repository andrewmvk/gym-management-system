import { type DatabaseExecutor, db } from '@api/db/client';
import { fMemberMuscleFocus, fProfileEvents } from '@api/db/schema';
import type { MemberMuscleFocus, MuscleId } from '@cadence/shared/schemas/muscles';
import { and, eq } from 'drizzle-orm';

export async function findFocusByUserId(userId: string, executor: DatabaseExecutor = db): Promise<MemberMuscleFocus[]> {
  const rows = await executor.select().from(fMemberMuscleFocus).where(eq(fMemberMuscleFocus.userId, userId));
  return rows.map((row) => ({ muscle: row.muscle, bias: row.bias }));
}

export async function replaceFocus(
  input: { userId: string; muscle: MuscleId; bias: number; description: string; from: number },
  executor: DatabaseExecutor = db,
) {
  await executor.transaction(async (tx) => {
    if (input.bias === 0) {
      await tx
        .delete(fMemberMuscleFocus)
        .where(and(eq(fMemberMuscleFocus.userId, input.userId), eq(fMemberMuscleFocus.muscle, input.muscle)));
    } else {
      await tx
        .insert(fMemberMuscleFocus)
        .values({ userId: input.userId, muscle: input.muscle, bias: input.bias })
        .onConflictDoUpdate({
          target: [fMemberMuscleFocus.userId, fMemberMuscleFocus.muscle],
          set: { bias: input.bias, updatedAt: new Date() },
        });
    }
    await tx.insert(fProfileEvents).values({
      userId: input.userId,
      eventType: 'muscle_focus_changed',
      payload: { description: input.description, muscle: input.muscle, from: input.from, to: input.bias },
    });
  });
}
