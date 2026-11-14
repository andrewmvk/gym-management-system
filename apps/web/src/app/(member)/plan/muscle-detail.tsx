'use client';

import type { ExerciseMuscle, MuscleId } from '@cadence/shared/schemas/muscles';
import { TriangleAlertIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

export interface PanelExercise {
  id: string;
  exerciseName: string;
  sets: number;
  isPerformable: boolean;
  muscles: readonly ExerciseMuscle[];
}

interface MuscleDetailProps {
  muscle: MuscleId;
  exercises: readonly PanelExercise[];
  // What the member reported about this muscle, when an injury names it.
  injury?: string;
}

// What one muscle does in a plan: the exercises that hit it.
export function MuscleDetail({ muscle, exercises, injury }: MuscleDetailProps) {
  const { t, tx, muscleLabel } = useI18n();
  const hits = exercises.flatMap((exercise) => {
    const entry = exercise.muscles.find((candidate) => candidate.muscle === muscle);
    return entry ? [{ exercise, role: entry.role }] : [];
  });

  return (
    <section aria-label={muscleLabel(muscle)} className="flex flex-col gap-3 border-t py-4">
      <h3 className="font-display text-xl font-bold tracking-wide uppercase">{muscleLabel(muscle)}</h3>
      {injury && (
        <p className="flex items-start gap-2 rounded-sm bg-tape/20 px-3 py-2 text-sm text-pretty">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">{t('You reported:')} </span>
            {injury}
          </span>
        </p>
      )}
      {hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('Nothing in this plan trains it.')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {hits.map(({ exercise, role }) => (
            <li key={exercise.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={cn('font-semibold', !exercise.isPerformable && 'text-muted-foreground line-through')}>
                {tx(exercise.exerciseName)}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant={role === 'primary' ? 'default' : 'outline'}>
                  {role === 'primary' ? t('role::primary') : t('role::secondary')}
                </Badge>
                <span className="numerals text-lg leading-none font-bold">{exercise.sets}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
