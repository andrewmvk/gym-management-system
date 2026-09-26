import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import * as service from '@api/modules/catalog/service';
import { assertCan, authedProcedure, publicProcedure, router } from '@api/trpc/procedures';

const CreateExerciseInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  muscleGroup: z.string().trim().min(1, 'Muscle group is required'),
  instructions: z.string().trim().min(1, 'Instructions are required'),
  equipmentIds: z.array(z.uuid()).default([]),
});

const CreateEquipmentInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});

const ToggleEquipmentInputSchema = z.object({
  id: z.uuid(),
});

export const catalogRouter = router({
  // Public read: browsing the catalog (READ_CATALOG) is granted to both member and staff policy sets.
  list: publicProcedure.query(() => service.listExercises()),
  listEquipment: publicProcedure.query(() => service.listEquipment()),

  createExercise: authedProcedure.input(CreateExerciseInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'Catalog');
    return service.createExercise(input);
  }),

  createEquipment: authedProcedure.input(CreateEquipmentInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'Catalog');
    return service.createEquipment(input);
  }),

  toggleEquipmentAvailability: authedProcedure.input(ToggleEquipmentInputSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'Catalog');
    const equipment = await service.toggleEquipmentAvailability(input.id);
    if (!equipment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Equipment not found' });
    return equipment;
  }),
});
