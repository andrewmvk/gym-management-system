import * as service from '@api/modules/catalog/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { ExerciseMusclesSchema } from '@cadence/shared/schemas/muscles';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const CreateExerciseInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  instructions: z.string().trim().min(1, 'Instructions are required'),
  muscles: ExerciseMusclesSchema,
  equipmentIds: z.array(z.uuid()).default([]),
});

const CreateEquipmentInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});

const SetEquipmentAvailabilityInputSchema = z.object({
  id: z.uuid(),
  isAvailable: z.boolean(),
});

const EquipmentImpactInputSchema = z.object({ equipmentId: z.uuid() });

const SetEquipmentLinksInputSchema = z.object({
  equipmentId: z.uuid(),
  exerciseIds: z.array(z.uuid()),
});

export const catalogRouter = router({
  // Signed-in only: no public screen shows the catalog, and READ_CATALOG is granted to member and staff alike.
  list: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'Catalog');
    return service.listExercises();
  }),
  listEquipment: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'Catalog');
    return service.listEquipment();
  }),

  equipmentImpact: authedProcedure.input(EquipmentImpactInputSchema).query(({ ctx, input }) => {
    assertCan(ctx.ability, 'read', 'Catalog');
    return service.getEquipmentImpact(input.equipmentId);
  }),

  createExercise: authedProcedure.input(CreateExerciseInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'Catalog');
    return service.createExercise(input);
  }),

  createEquipment: authedProcedure.input(CreateEquipmentInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'Catalog');
    return service.createEquipment(input);
  }),

  setEquipmentAvailability: authedProcedure
    .input(SetEquipmentAvailabilityInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'manage', 'Catalog');
      const equipment = await service.setEquipmentAvailability(input.id, input.isAvailable);
      if (!equipment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Equipment not found' });
      return equipment;
    }),

  setEquipmentLinks: authedProcedure.input(SetEquipmentLinksInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'Catalog');
    return service.setEquipmentLinks(input.equipmentId, input.exerciseIds);
  }),
});
