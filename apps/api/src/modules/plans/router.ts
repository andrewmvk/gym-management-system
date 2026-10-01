import { todayLocal } from '@api/lib/dates';
import * as service from '@api/modules/plans/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const GenerateTodayInputSchema = z.object({ confirmOverwrite: z.boolean().default(false) });
const GetByDateInputSchema = z.object({ date: z.iso.date() });
const ListDatesInputSchema = z.object({ from: z.iso.date(), to: z.iso.date() });
const MarkExerciseCompletedInputSchema = z.object({ planExerciseId: z.uuid(), completed: z.boolean() });

export const plansRouter = router({
  // update_own_plans (scope self): generating/regenerating a plan is a write on the member's own
  // TrainingPlan, same policy the member-facing plan screen uses for marking exercises.
  generateToday: authedProcedure.input(GenerateTodayInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.generateForDate(ctx.user.id, todayLocal(), input.confirmOverwrite);
  }),

  getToday: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.getToday(ctx.user.id);
  }),

  getByDate: authedProcedure.input(GetByDateInputSchema).query(({ ctx, input }) => {
    assertCan(ctx.ability, 'read', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.getPlanForDate(ctx.user.id, input.date);
  }),

  listDates: authedProcedure.input(ListDatesInputSchema).query(({ ctx, input }) => {
    assertCan(ctx.ability, 'read', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.listPlanDates(ctx.user.id, input.from, input.to);
  }),

  // The owner is resolved from the database, never assumed to be the caller, before the ability check
  // runs - planExerciseId is a client-supplied id and proves nothing about who it belongs to on its own.
  markExerciseCompleted: authedProcedure.input(MarkExerciseCompletedInputSchema).mutation(async ({ ctx, input }) => {
    const owner = await service.getExerciseOwner(input.planExerciseId);
    if (!owner) throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
    assertCan(ctx.ability, 'update', subject('TrainingPlan', { userId: owner.userId }));
    return service.markExerciseCompleted(input.planExerciseId, input.completed);
  }),
});
