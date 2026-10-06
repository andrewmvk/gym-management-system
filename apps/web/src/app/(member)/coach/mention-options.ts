import { MUSCLE_GROUPS, MUSCLES, muscleGroupLabel, muscleGroupOf } from '@cadence/shared/schemas/muscles';
import type { MentionChip } from '@/app/(member)/coach/coach-context';
import { mentionLabel } from '@/app/(member)/coach/mention-chips';

export type MentionSection = 'plan' | 'groups' | 'muscles';

const STATIC_SECTION_LABELS = { groups: 'Muscle groups', muscles: 'Muscles' } as const;

export interface MentionOption {
  chip: MentionChip;
  label: string;
  // The word beside the name: what kind of thing it is, or the group a muscle belongs to.
  hint: string;
  section: MentionSection;
  // The heading the menu shows above the first option of its section.
  sectionLabel: string;
}

// Everything the coach can be pointed at, wherever the member is in the app. The coach checks every id itself,
// so an exercise outside the plan on screen costs nothing worse than being ignored. `planDay` names the day of
// that plan when it is not today's.
export function buildMentionOptions(
  planExercises: readonly { exerciseId: string; name: string }[],
  planDay: string | null,
): MentionOption[] {
  const planLabel = planDay ? `Plan for ${planDay}` : "Today's plan";
  const distribution: MentionChip = { type: 'distribution' };
  return [
    {
      chip: distribution,
      label: mentionLabel(distribution),
      hint: 'whole plan',
      section: 'plan',
      sectionLabel: planLabel,
    },
    ...planExercises.map((exercise) => {
      const chip: MentionChip = { type: 'exercise', exerciseId: exercise.exerciseId, name: exercise.name };
      return { chip, label: exercise.name, hint: 'exercise', section: 'plan' as const, sectionLabel: planLabel };
    }),
    ...MUSCLE_GROUPS.map((group) => {
      const chip: MentionChip = { type: 'group', group: group.id };
      return {
        chip,
        label: group.label,
        hint: `${group.muscles.length} muscles`,
        section: 'groups' as const,
        sectionLabel: STATIC_SECTION_LABELS.groups,
      };
    }),
    ...MUSCLES.map((muscle) => {
      const chip: MentionChip = { type: 'muscle', muscle: muscle.id };
      return {
        chip,
        label: muscle.label,
        hint: muscleGroupLabel(muscleGroupOf(muscle.id)),
        section: 'muscles' as const,
        sectionLabel: STATIC_SECTION_LABELS.muscles,
      };
    }),
  ];
}

export function filterMentionOptions(options: readonly MentionOption[], query: string): MentionOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...options];
  return options.filter((option) => `${option.label} ${option.hint}`.toLowerCase().includes(needle));
}

// What a member is likely to ask about the thing they pointed at. Choosing one only fills the message box, so
// they read it, change it and send it themselves.
export function suggestionsFor(chip: MentionChip): string[] {
  switch (chip.type) {
    case 'exercise':
      return [`How do I do ${chip.name}?`, `Swap ${chip.name} for something else`, `Make ${chip.name} easier`];
    case 'muscle': {
      const name = mentionLabel(chip).toLowerCase();
      return [
        `Which exercises could I add for my ${name}?`,
        `I'd like more ${name} work in my next plans`,
        `Do I train my ${name} enough?`,
      ];
    }
    case 'group': {
      const name = mentionLabel(chip).toLowerCase();
      return [
        `Is my ${name} work balanced?`,
        `I'd like more ${name} work in my next plans`,
        `What should I add for my ${name}?`,
      ];
    }
    case 'distribution':
      return ['Is this plan balanced for my goals?', 'Rebalance it for me'];
  }
}
