import { z } from 'zod';

export const MUSCLE_VIEWS = ['front', 'back'] as const;
export type MuscleView = (typeof MUSCLE_VIEWS)[number];

interface MuscleDefinition {
  id: string;
  label: string;
  views: readonly MuscleView[];
}

// The ids are the group ids drawn in the body illustrations. A muscle visible from both sides is one
// muscle: it is painted on both views and always carries the same weight. Left and right never differ.
export const MUSCLES = [
  { id: 'neck', label: 'Neck', views: ['front', 'back'] },
  { id: 'chest', label: 'Chest', views: ['front'] },
  { id: 'front-deltoid', label: 'Front delts', views: ['front'] },
  { id: 'lateral-deltoid', label: 'Side delts', views: ['front', 'back'] },
  { id: 'rear-deltoid', label: 'Rear delts', views: ['back'] },
  { id: 'biceps', label: 'Biceps', views: ['front'] },
  { id: 'triceps', label: 'Triceps', views: ['back'] },
  { id: 'forearm-flexors', label: 'Forearm flexors', views: ['front'] },
  { id: 'forearm-extensors', label: 'Forearm extensors', views: ['back'] },
  { id: 'abs', label: 'Abs', views: ['front'] },
  { id: 'abs-lower', label: 'Lower abs', views: ['front'] },
  { id: 'obliques', label: 'Obliques', views: ['front'] },
  { id: 'trapezius', label: 'Traps', views: ['back'] },
  { id: 'rotator-cuff', label: 'Rotator cuff', views: ['back'] },
  { id: 'lats', label: 'Lats', views: ['back'] },
  { id: 'lower-back', label: 'Lower back', views: ['back'] },
  { id: 'glutes', label: 'Glutes', views: ['back'] },
  { id: 'abductors', label: 'Abductors', views: ['front', 'back'] },
  { id: 'quads', label: 'Quads', views: ['front'] },
  { id: 'quads-outer', label: 'Outer quads', views: ['front', 'back'] },
  { id: 'hamstrings', label: 'Hamstrings', views: ['back'] },
  { id: 'calves', label: 'Calves', views: ['front', 'back'] },
] as const satisfies readonly MuscleDefinition[];

export type MuscleId = (typeof MUSCLES)[number]['id'];

export const MUSCLE_IDS = MUSCLES.map((muscle) => muscle.id) as [MuscleId, ...MuscleId[]];

export const MuscleIdSchema = z.enum(MUSCLE_IDS);

interface MuscleGroupDefinition {
  id: string;
  label: string;
  muscles: readonly MuscleId[];
}

// Six regions a member thinks in. Every muscle belongs to exactly one, so a group's load is the plain sum
// of its muscles'.
export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', muscles: ['chest'] },
  {
    id: 'shoulders',
    label: 'Shoulders',
    muscles: ['front-deltoid', 'lateral-deltoid', 'rear-deltoid', 'rotator-cuff'],
  },
  { id: 'back', label: 'Back', muscles: ['neck', 'trapezius', 'lats', 'lower-back'] },
  { id: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearm-flexors', 'forearm-extensors'] },
  { id: 'core', label: 'Core', muscles: ['abs', 'abs-lower', 'obliques'] },
  { id: 'legs', label: 'Legs', muscles: ['glutes', 'abductors', 'quads', 'quads-outer', 'hamstrings', 'calves'] },
] as const satisfies readonly MuscleGroupDefinition[];

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id'];

export const MUSCLE_GROUP_IDS = MUSCLE_GROUPS.map((group) => group.id) as [MuscleGroupId, ...MuscleGroupId[]];

export const MuscleGroupIdSchema = z.enum(MUSCLE_GROUP_IDS);

export function muscleGroupLabel(group: MuscleGroupId): string {
  return MUSCLE_GROUPS.find((entry) => entry.id === group)?.label ?? group;
}

const GROUP_OF_MUSCLE = Object.fromEntries(
  MUSCLE_GROUPS.flatMap((group) => group.muscles.map((muscle) => [muscle, group.id])),
) as Record<MuscleId, MuscleGroupId>;

export function muscleGroupOf(muscle: MuscleId): MuscleGroupId {
  return GROUP_OF_MUSCLE[muscle];
}

const MUSCLE_LABELS: Record<MuscleId, string> = Object.fromEntries(
  MUSCLES.map((muscle) => [muscle.id, muscle.label]),
) as Record<MuscleId, string>;

export function muscleLabel(muscle: MuscleId): string {
  return MUSCLE_LABELS[muscle];
}

export const MUSCLE_ROLES = ['primary', 'secondary'] as const;
export type MuscleRole = (typeof MUSCLE_ROLES)[number];
export const MuscleRoleSchema = z.enum(MUSCLE_ROLES);

// A primary muscle carries the movement; a secondary one assists, so it counts for about half.
export const ROLE_WEIGHT: Record<MuscleRole, number> = { primary: 1, secondary: 0.5 };

export const ExerciseMuscleSchema = z.object({ muscle: MuscleIdSchema, role: MuscleRoleSchema });
export type ExerciseMuscle = z.infer<typeof ExerciseMuscleSchema>;

export const ExerciseMusclesSchema = z
  .array(ExerciseMuscleSchema)
  .refine((muscles) => muscles.some((entry) => entry.role === 'primary'), {
    message: 'Choose at least one primary muscle',
  })
  .refine((muscles) => new Set(muscles.map((entry) => entry.muscle)).size === muscles.length, {
    message: 'A muscle can only be listed once',
  });
