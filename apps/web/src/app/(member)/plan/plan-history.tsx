'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/trpc';
import { ExerciseRow } from './exercise-row';

// Always read-only, regardless of which date is picked - history is for browsing, not editing.
export function PlanHistory() {
  const trpc = useTRPC();
  const [selectedDate, setSelectedDate] = useState('');

  const planQuery = useQuery({
    ...trpc.plans.getByDate.queryOptions({ date: selectedDate || '1970-01-01' }),
    enabled: selectedDate.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Browse a past plan by date.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="plan-history-date">Date</FieldLabel>
          <Input
            id="plan-history-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </Field>

        {selectedDate && planQuery.isPending && (
          <div>
            {Array.from({ length: 3 }, (_, index) => (
              <ExerciseRow.Skeleton key={index} />
            ))}
          </div>
        )}
        {selectedDate && planQuery.isError && <p className="text-sm text-destructive">We couldn&apos;t load that plan.</p>}
        {selectedDate && planQuery.isSuccess && planQuery.data === null && (
          <p className="text-sm text-muted-foreground">No plan for this date.</p>
        )}
        {selectedDate && planQuery.data && (
          <div>
            {planQuery.data.exercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                name={exercise.exerciseName}
                muscleGroup={exercise.muscleGroup}
                instructions={exercise.instructions}
                sets={exercise.sets}
                reps={exercise.reps}
                load={exercise.load}
                notes={exercise.notes}
                completed={exercise.completed}
                isPerformable={exercise.isPerformable}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
