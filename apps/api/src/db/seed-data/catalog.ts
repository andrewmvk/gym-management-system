import type { Transaction } from '@api/db/client';
import { dExerciseEquipment, dExerciseMuscles, dExercises, dGymEquipment } from '@api/db/schema';
import type { ExerciseMuscle, MuscleId } from '@cadence/shared/schemas/muscles';
import { eq } from 'drizzle-orm';

interface EquipmentSeed {
  name: string;
  isAvailable: boolean;
}

interface ExerciseSeed {
  name: string;
  muscles: readonly ExerciseMuscle[];
  instructions: string;
  equipment: readonly string[];
}

function tag(primary: readonly MuscleId[], secondary: readonly MuscleId[] = []): ExerciseMuscle[] {
  return [
    ...primary.map((muscle): ExerciseMuscle => ({ muscle, role: 'primary' })),
    ...secondary.map((muscle): ExerciseMuscle => ({ muscle, role: 'secondary' })),
  ];
}

// Rowing Machine and Stationary Bike start unavailable on purpose, so the seeded data shows both
// outcomes of the FR-17 availability rule (RN-04) without anyone having to toggle anything by hand.
const EQUIPMENT: readonly EquipmentSeed[] = [
  { name: 'Barbell', isAvailable: true },
  { name: 'Dumbbells', isAvailable: true },
  { name: 'Leg Press Machine', isAvailable: true },
  { name: 'Squat Rack', isAvailable: true },
  { name: 'Bench', isAvailable: true },
  { name: 'Cable Machine', isAvailable: true },
  { name: 'Lat Pulldown Machine', isAvailable: true },
  { name: 'Treadmill', isAvailable: true },
  { name: 'Stationary Bike', isAvailable: false },
  { name: 'Rowing Machine', isAvailable: false },
  { name: 'Pull-up Bar', isAvailable: true },
  { name: 'Kettlebell', isAvailable: true },
];

// About a third need no equipment at all; a few (back squat, chest press, chest fly) link more than
// one piece, and the two unavailable machines above each back exactly one exercise, so both branches
// of the availability rule show up in the seeded catalog. The muscle maps leave neck, rotator cuff and
// forearm extensors untrained on purpose, so the staff coverage map has real gaps to show.
const EXERCISES: readonly ExerciseSeed[] = [
  {
    name: 'Bodyweight Squat',
    muscles: tag(['quads'], ['glutes', 'hamstrings', 'calves']),
    instructions: 'Feet shoulder-width apart, lower until thighs are parallel to the floor, drive back up.',
    equipment: [],
  },
  {
    name: 'Barbell Back Squat',
    muscles: tag(['quads', 'glutes'], ['hamstrings', 'lower-back', 'abductors']),
    instructions: 'Bar racked across the upper back, squat to depth, drive up through the heels.',
    equipment: ['Barbell', 'Squat Rack'],
  },
  {
    name: 'Leg Press',
    muscles: tag(['quads'], ['glutes', 'hamstrings', 'quads-outer']),
    instructions: 'Feet on the platform shoulder-width apart, lower under control, press back to start.',
    equipment: ['Leg Press Machine'],
  },
  {
    name: 'Walking Lunge',
    muscles: tag(['quads', 'glutes'], ['hamstrings', 'abductors', 'calves']),
    instructions: 'Step forward into a lunge, alternate legs while moving across the floor.',
    equipment: [],
  },
  {
    name: 'Push-Up',
    muscles: tag(['chest'], ['front-deltoid', 'triceps', 'abs']),
    instructions: 'Hands under shoulders, lower the chest to the floor, press back up.',
    equipment: [],
  },
  {
    name: 'Barbell Bench Press',
    muscles: tag(['chest'], ['triceps', 'front-deltoid']),
    instructions: 'Lie on the bench, lower the bar to the chest, press to full extension.',
    equipment: ['Barbell', 'Bench'],
  },
  {
    name: 'Dumbbell Chest Fly',
    muscles: tag(['chest'], ['front-deltoid']),
    instructions: 'Lie on the bench, arc the dumbbells out and back with a slight elbow bend.',
    equipment: ['Dumbbells', 'Bench'],
  },
  {
    name: 'Cable Chest Press',
    muscles: tag(['chest'], ['triceps', 'front-deltoid']),
    instructions: 'Set cables at chest height, press both handles forward until arms extend.',
    equipment: ['Cable Machine'],
  },
  {
    name: 'Pull-Up',
    muscles: tag(['lats'], ['biceps', 'rear-deltoid', 'forearm-flexors']),
    instructions: 'Grip the bar shoulder-width, pull the chin above the bar, lower under control.',
    equipment: ['Pull-up Bar'],
  },
  {
    name: 'Bent-Over Barbell Row',
    muscles: tag(['lats', 'trapezius'], ['rear-deltoid', 'biceps', 'lower-back']),
    instructions: 'Hinge at the hips, pull the bar to the lower ribs, lower with control.',
    equipment: ['Barbell'],
  },
  {
    name: 'Lat Pulldown',
    muscles: tag(['lats'], ['biceps', 'rear-deltoid']),
    instructions: 'Grip the bar wide, pull down to the upper chest, control the return.',
    equipment: ['Lat Pulldown Machine'],
  },
  {
    name: 'Superman Hold',
    muscles: tag(['lower-back'], ['glutes', 'trapezius', 'rear-deltoid']),
    instructions: 'Lie face down, lift arms and legs off the floor, hold briefly.',
    equipment: [],
  },
  {
    name: 'Overhead Dumbbell Press',
    muscles: tag(['front-deltoid', 'lateral-deltoid'], ['triceps', 'trapezius']),
    instructions: 'Press dumbbells from shoulder height to full overhead extension.',
    equipment: ['Dumbbells'],
  },
  {
    name: 'Pike Push-Up',
    muscles: tag(['front-deltoid'], ['triceps', 'lateral-deltoid', 'chest']),
    instructions: 'Hips high in a pike position, lower the head toward the floor, press back up.',
    equipment: [],
  },
  {
    name: 'Cable Lateral Raise',
    muscles: tag(['lateral-deltoid'], ['trapezius']),
    instructions: 'Raise the cable handle out to shoulder height, lower under control.',
    equipment: ['Cable Machine'],
  },
  {
    name: 'Diamond Push-Up',
    muscles: tag(['triceps'], ['chest', 'front-deltoid']),
    instructions: 'Hands together under the chest forming a diamond, lower and press up.',
    equipment: [],
  },
  {
    name: 'Barbell Bicep Curl',
    muscles: tag(['biceps'], ['forearm-flexors']),
    instructions: 'Curl the bar from thighs to shoulders, keeping the elbows fixed.',
    equipment: ['Barbell'],
  },
  {
    name: 'Dumbbell Hammer Curl',
    muscles: tag(['biceps'], ['forearm-flexors']),
    instructions: 'Curl the dumbbells with a neutral grip from thighs to shoulders.',
    equipment: ['Dumbbells'],
  },
  {
    name: 'Kettlebell Overhead Tricep Extension',
    muscles: tag(['triceps'], ['abs']),
    instructions: 'Hold the kettlebell overhead, lower behind the head, extend back up.',
    equipment: ['Kettlebell'],
  },
  {
    name: 'Plank',
    muscles: tag(['abs'], ['obliques', 'lower-back', 'front-deltoid']),
    instructions: 'Forearms and toes on the floor, hold a straight line from head to heels.',
    equipment: [],
  },
  {
    name: 'Bicycle Crunch',
    muscles: tag(['abs', 'obliques'], ['abs-lower']),
    instructions: 'Alternate bringing elbow to opposite knee in a pedaling motion.',
    equipment: [],
  },
  {
    name: 'Cable Woodchopper',
    muscles: tag(['obliques'], ['abs', 'lateral-deltoid']),
    instructions: 'Pull the cable diagonally across the body from high to low, or low to high.',
    equipment: ['Cable Machine'],
  },
  {
    name: 'Treadmill Run',
    muscles: tag(['quads', 'hamstrings', 'calves'], ['glutes']),
    instructions: 'Sustained run at a steady, conversational pace.',
    equipment: ['Treadmill'],
  },
  {
    name: 'Stationary Bike Ride',
    muscles: tag(['quads'], ['calves', 'hamstrings', 'glutes']),
    instructions: 'Steady-state cycling at a moderate, sustainable resistance.',
    equipment: ['Stationary Bike'],
  },
  {
    name: 'Rowing Machine Sprint',
    muscles: tag(['lats', 'quads'], ['hamstrings', 'glutes', 'biceps', 'lower-back', 'rear-deltoid']),
    instructions: 'Alternate short, hard rowing intervals with easy recovery strokes.',
    equipment: ['Rowing Machine'],
  },
];

// Insert-if-missing, like ensureStaffAccount in seed.ts: re-running the seed must not undo an admin's
// later edits (a renamed exercise, a manually toggled equipment item). An exercise that already exists
// without any muscle map (a database from before muscle maps) only gets the map filled in.
export async function seedCatalog(tx: Transaction) {
  const equipmentIdByName = new Map<string, string>();

  for (const item of EQUIPMENT) {
    const [existing] = await tx.select().from(dGymEquipment).where(eq(dGymEquipment.name, item.name));
    if (existing) {
      equipmentIdByName.set(item.name, existing.id);
      continue;
    }
    const [inserted] = await tx
      .insert(dGymEquipment)
      .values({ name: item.name, isAvailable: item.isAvailable })
      .returning();
    equipmentIdByName.set(item.name, inserted!.id);
  }

  for (const item of EXERCISES) {
    const [existing] = await tx.select({ id: dExercises.id }).from(dExercises).where(eq(dExercises.name, item.name));
    if (existing) {
      const [hasMuscles] = await tx
        .select({ muscle: dExerciseMuscles.muscle })
        .from(dExerciseMuscles)
        .where(eq(dExerciseMuscles.exerciseId, existing.id))
        .limit(1);
      if (!hasMuscles) {
        await tx
          .insert(dExerciseMuscles)
          .values(item.muscles.map(({ muscle, role }) => ({ exerciseId: existing.id, muscle, role })));
      }
      continue;
    }

    const [exercise] = await tx
      .insert(dExercises)
      .values({ name: item.name, instructions: item.instructions })
      .returning();

    await tx
      .insert(dExerciseMuscles)
      .values(item.muscles.map(({ muscle, role }) => ({ exerciseId: exercise!.id, muscle, role })));

    if (item.equipment.length > 0) {
      await tx.insert(dExerciseEquipment).values(
        item.equipment.map((equipmentName) => {
          const equipmentId = equipmentIdByName.get(equipmentName);
          if (!equipmentId) throw new Error(`Seed equipment "${equipmentName}" not found for exercise "${item.name}"`);
          return { exerciseId: exercise!.id, equipmentId };
        }),
      );
    }
  }
}
