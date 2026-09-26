'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAppAbility } from '@/abilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';

const CreateExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  muscleGroup: z.string().trim().min(1, 'Muscle group is required'),
  instructions: z.string().trim().min(1, 'Instructions are required'),
  equipmentIds: z.array(z.string()),
});
type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;

function ExerciseSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercises</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CreateExerciseForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const equipmentQuery = useQuery(trpc.catalog.listEquipment.queryOptions());

  const form = useForm<CreateExerciseInput>({
    resolver: zodResolver(CreateExerciseSchema),
    defaultValues: { name: '', muscleGroup: '', instructions: '', equipmentIds: [] },
  });

  const create = useMutation(
    trpc.catalog.createExercise.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.list.queryKey() });
        form.reset();
      },
      onError: () => toast.error("Couldn't add the exercise. Try again."),
    }),
  );

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => create.mutate(values))}>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="exercise-name">New exercise</FieldLabel>
              <Input {...field} id="exercise-name" placeholder="e.g. Incline Dumbbell Press" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="muscleGroup"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="exercise-muscle-group">Muscle group</FieldLabel>
              <Input {...field} id="exercise-muscle-group" placeholder="e.g. chest" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="instructions"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="exercise-instructions">Instructions</FieldLabel>
              <Input {...field} id="exercise-instructions" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="equipmentIds"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Equipment needed (none for bodyweight)</FieldLabel>
              <div className="flex flex-col gap-2">
                {equipmentQuery.isPending && <Skeleton className="h-5 w-32" />}
                {equipmentQuery.isSuccess &&
                  equipmentQuery.data.map((item) => (
                    <FieldLabel key={item.id} htmlFor={`exercise-equipment-${item.id}`} className="font-normal">
                      <Checkbox
                        id={`exercise-equipment-${item.id}`}
                        checked={field.value.includes(item.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked ? [...field.value, item.id] : field.value.filter((id) => id !== item.id),
                          )
                        }
                      />
                      {item.name}
                    </FieldLabel>
                  ))}
              </div>
            </Field>
          )}
        />
        <Button type="submit" variant="outline" disabled={create.isPending}>
          {create.isPending ? 'Adding...' : 'Add exercise'}
        </Button>
      </FieldGroup>
    </form>
  );
}

function ExerciseSectionRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'Catalog');
  const query = useQuery(trpc.catalog.list.queryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercises</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        )}
        {query.isError && <p className="text-sm text-destructive">We couldn't load the exercise list.</p>}
        {query.isSuccess && query.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No exercises yet.</p>
        )}
        {query.isSuccess &&
          query.data.map((exercise) => (
            <div key={exercise.id} className="flex items-center justify-between gap-2">
              <div>
                <p>{exercise.name}</p>
                <p className="text-sm text-muted-foreground">{exercise.muscleGroup}</p>
              </div>
              <Badge variant={exercise.isAvailable ? 'default' : 'outline'}>
                {exercise.isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          ))}
        {canManage && <CreateExerciseForm />}
      </CardContent>
    </Card>
  );
}

export const ExerciseSection = Object.assign(ExerciseSectionRoot, { Skeleton: ExerciseSectionSkeleton });
