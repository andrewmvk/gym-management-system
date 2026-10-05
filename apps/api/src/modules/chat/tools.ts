import { localDateString, shiftLocalDate, startOfLocalDay } from '@api/lib/dates';
import type { AiTool } from '@api/modules/ai';
import type { ChatContext } from '@api/modules/chat/context';
import { findCheckInTimes } from '@api/modules/metrics/repository';
import * as plansRepository from '@api/modules/plans/repository';
import { buildPlanHistoryLines, buildTrainerNoteLines, formatCatalogLine } from '@api/modules/plans/service';
import { MuscleIdSchema, muscleLabel } from '@cadence/shared/schemas/muscles';
import { z } from 'zod';

const TRAINER_NOTES_LIMIT = 5;

// Everything the coach may look up on demand. Each tool only reads, and each is bound to the signed-in member
// here, so what the model asks for can never name another member or change anything.
export function buildChatTools(userId: string, context: ChatContext): AiTool[] {
  const catalogById = new Map(context.catalog.map((entry) => [entry.id, entry]));

  return [
    {
      name: 'getExerciseDetails',
      description: 'The full instructions, muscles and equipment status of one catalog exercise.',
      input: z.object({ exerciseId: z.uuid() }),
      run: async (args) => {
        const { exerciseId } = args as { exerciseId: string };
        const entry = catalogById.get(exerciseId);
        if (!entry) return 'No exercise with that id.';
        const equipment =
          entry.equipment.length === 0
            ? 'none (bodyweight)'
            : entry.equipment.map((piece) => `${piece.name}${piece.isAvailable ? '' : ' (out of service)'}`).join(', ');
        return [
          `${entry.name} | ${entry.isAvailable ? 'available' : 'cannot be done right now'}`,
          `Instructions: ${entry.instructions}`,
          formatCatalogLine(entry),
          `Equipment: ${equipment}`,
        ].join('\n');
      },
    },
    {
      name: 'searchExercises',
      description: 'Available catalog exercises that train a muscle, primary ones first.',
      input: z.object({ muscle: MuscleIdSchema, limit: z.number().int().min(1).max(15).optional() }),
      run: async (args) => {
        const { muscle, limit = 8 } = args as { muscle: z.infer<typeof MuscleIdSchema>; limit?: number };
        const roleOf = (exercise: (typeof context.availableExercises)[number]) =>
          exercise.muscles.find((entry) => entry.muscle === muscle)?.role;
        const matches = context.availableExercises
          .filter((exercise) => roleOf(exercise) !== undefined)
          .sort(
            (a, b) => Number(roleOf(b) === 'primary') - Number(roleOf(a) === 'primary') || a.name.localeCompare(b.name),
          )
          .slice(0, limit);
        return matches.length > 0
          ? [`Exercises for ${muscleLabel(muscle)}:`, ...matches.map(formatCatalogLine)].join('\n')
          : `No available exercise trains ${muscleLabel(muscle)}.`;
      },
    },
    {
      name: 'getWorkoutHistory',
      description: "The member's recent plans with what was done and not done, and their gym check-in dates.",
      input: z.object({ days: z.number().int().min(1).max(60).optional() }),
      run: async (args) => {
        const { days = 14 } = args as { days?: number };
        const since = shiftLocalDate(context.today, -days);
        const [rows, checkInTimes] = await Promise.all([
          plansRepository.findPlanHistory(userId, since, context.today),
          findCheckInTimes(userId, startOfLocalDay(since), startOfLocalDay(context.today)),
        ]);
        const checkInDates = [...new Set(checkInTimes.map((time) => localDateString(time)))].sort().reverse();
        return buildPlanHistoryLines(rows, checkInDates, context.today).join('\n');
      },
    },
    {
      name: 'getTrainerNotes',
      description: "The latest notes and edits the member's trainers left on their plans.",
      input: z.object({}),
      run: async () => {
        const reviews = await plansRepository.findRecentReviewsForMember(userId, TRAINER_NOTES_LIMIT);
        const lines = buildTrainerNoteLines(reviews);
        return lines.length > 0 ? lines.join('\n') : 'No trainer notes yet.';
      },
    },
    {
      name: 'getEquipmentStatus',
      description: 'Which gym equipment is out of service, and which catalog exercises that rules out.',
      input: z.object({}),
      run: async () => {
        const down = new Map<string, string[]>();
        for (const exercise of context.catalog) {
          for (const piece of exercise.equipment) {
            if (piece.isAvailable) continue;
            down.set(piece.name, [...(down.get(piece.name) ?? []), exercise.isAvailable ? '' : exercise.name]);
          }
        }
        if (down.size === 0) return 'All equipment is working.';
        return [...down]
          .map(([name, names]) => {
            const lost = names.filter(Boolean);
            return `${name} is out of service${lost.length > 0 ? `; rules out: ${lost.join(', ')}` : ''}`;
          })
          .join('\n');
      },
    },
  ];
}
