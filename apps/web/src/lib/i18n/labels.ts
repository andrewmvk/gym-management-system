import { WEEKDAYS, type Weekday } from '@cadence/shared/schemas/gym';
import type { Locale } from '@cadence/shared/schemas/locale';
import {
  muscleGroupLabel as englishGroupLabel,
  muscleLabel as englishMuscleLabel,
  type MuscleGroupId,
  type MuscleId,
} from '@cadence/shared/schemas/muscles';
import { PROFILE_EVENT_LABELS, type ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { intlLocale } from '@/lib/i18n/translate';

// Keyed by id, not by the English label: "Back" is a muscle group here and a button elsewhere, so a lookup by
// text could pick the wrong Portuguese word. Record<Id, string> also makes a missing entry a type error.
const MUSCLE_PT: Record<MuscleId, string> = {
  neck: 'Pescoço',
  chest: 'Peito',
  'front-deltoid': 'Deltoide anterior',
  'lateral-deltoid': 'Deltoide lateral',
  'rear-deltoid': 'Deltoide posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  'forearm-flexors': 'Flexores do antebraço',
  'forearm-extensors': 'Extensores do antebraço',
  abs: 'Abdômen',
  'abs-lower': 'Abdômen inferior',
  obliques: 'Oblíquos',
  trapezius: 'Trapézio',
  'rotator-cuff': 'Manguito rotador',
  lats: 'Dorsais',
  'lower-back': 'Lombar',
  glutes: 'Glúteos',
  abductors: 'Abdutores',
  quads: 'Quadríceps',
  'quads-outer': 'Quadríceps lateral',
  hamstrings: 'Posteriores da coxa',
  calves: 'Panturrilhas',
};

const GROUP_PT: Record<MuscleGroupId, string> = {
  chest: 'Peito',
  shoulders: 'Ombros',
  back: 'Costas',
  arms: 'Braços',
  core: 'Core',
  legs: 'Pernas',
};

const FACT_TYPE_PT: Record<ProfileEventType, string> = {
  injury: 'Lesão',
  skipped_exercise: 'Exercício pulado',
  medication_change: 'Mudança de medicação',
  life_event: 'Acontecimento',
  state_update: 'Atualização',
  plan_adjustment_request: 'Pedido de treino',
  manual_plan_edit: 'Edição manual',
};

export function muscleLabel(locale: Locale, muscle: MuscleId): string {
  return locale === 'pt' ? MUSCLE_PT[muscle] : englishMuscleLabel(muscle);
}

export function groupLabel(locale: Locale, group: MuscleGroupId): string {
  return locale === 'pt' ? GROUP_PT[group] : englishGroupLabel(group);
}

// "monday" as the API sends it, written as the language writes weekdays mid-sentence: "Monday", "segunda-feira".
// 1 January 2023 was a Sunday, the first entry of WEEKDAYS.
export function weekdayLabel(locale: Locale, day: Weekday): string {
  const date = new Date(2023, 0, 1 + WEEKDAYS.indexOf(day));
  return date.toLocaleDateString(intlLocale(locale), { weekday: 'long' });
}

export function factTypeLabel(locale: Locale, eventType: ProfileEventType): string {
  return locale === 'pt' ? FACT_TYPE_PT[eventType] : PROFILE_EVENT_LABELS[eventType];
}
