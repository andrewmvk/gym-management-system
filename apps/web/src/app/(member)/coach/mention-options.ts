import { MUSCLE_GROUPS, MUSCLES, muscleGroupOf } from '@cadence/shared/schemas/muscles';
import type { MentionChip } from '@/app/(member)/coach/coach-context';
import { mentionLabel } from '@/app/(member)/coach/mention-chips';
import type { I18n } from '@/lib/i18n/i18n-provider';

export type MentionSection = 'plan' | 'groups' | 'muscles';

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
  i18n: I18n,
  planExercises: readonly { exerciseId: string; name: string }[],
  planDay: string | null,
): MentionOption[] {
  const { t, tx, muscleLabel, groupLabel } = i18n;
  const planLabel = planDay ? t('Plan for {day}', { day: planDay }) : t("Today's plan");
  const distribution: MentionChip = { type: 'distribution' };
  return [
    {
      chip: distribution,
      label: mentionLabel(i18n, distribution),
      hint: t('whole plan'),
      section: 'plan',
      sectionLabel: planLabel,
    },
    ...planExercises.map((exercise) => {
      const chip: MentionChip = { type: 'exercise', exerciseId: exercise.exerciseId, name: exercise.name };
      return {
        chip,
        label: tx(exercise.name),
        hint: t('exercise'),
        section: 'plan' as const,
        sectionLabel: planLabel,
      };
    }),
    ...MUSCLE_GROUPS.map((group) => {
      const chip: MentionChip = { type: 'group', group: group.id };
      return {
        chip,
        label: groupLabel(group.id),
        hint: t('{count} muscles', { count: group.muscles.length }),
        section: 'groups' as const,
        sectionLabel: t('Muscle groups'),
      };
    }),
    ...MUSCLES.map((muscle) => {
      const chip: MentionChip = { type: 'muscle', muscle: muscle.id };
      return {
        chip,
        label: muscleLabel(muscle.id),
        hint: groupLabel(muscleGroupOf(muscle.id)),
        section: 'muscles' as const,
        sectionLabel: t('Muscles'),
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
export function suggestionsFor(i18n: I18n, chip: MentionChip): string[] {
  const { t } = i18n;
  switch (chip.type) {
    case 'exercise': {
      const exercise = mentionLabel(i18n, chip);
      return [
        t('How do I do {exercise}?', { exercise }),
        t('Swap {exercise} for something else', { exercise }),
        t('Make {exercise} easier', { exercise }),
      ];
    }
    case 'muscle': {
      const name = mentionLabel(i18n, chip).toLowerCase();
      return [
        t('Which exercises could I add for my {name}?', { name }),
        t("I'd like more {name} work in my next plans", { name }),
        t('Do I train my {name} enough?', { name }),
      ];
    }
    case 'group': {
      const name = mentionLabel(i18n, chip).toLowerCase();
      return [
        t('Is my {name} work balanced?', { name }),
        t("I'd like more {name} work in my next plans", { name }),
        t('What should I add for my {name}?', { name }),
      ];
    }
    case 'distribution':
      return [t('Is this plan balanced for my goals?'), t('Rebalance it for me')];
  }
}
