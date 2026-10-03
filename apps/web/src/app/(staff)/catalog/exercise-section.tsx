'use client';

import { type ExerciseMuscle, ExerciseMusclesSchema, muscleLabel } from '@cadence/shared/schemas/muscles';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DumbbellIcon, PlusIcon, SearchXIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAppAbility } from '@/abilities';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleSelector } from '@/components/muscle-map/muscle-selector';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 12;

const CreateExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  instructions: z.string().trim().min(1, 'Instructions are required'),
  muscles: ExerciseMusclesSchema,
  equipmentIds: z.array(z.string()),
});
type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;

// Primary muscles by name, with a count of the supporting ones so the cell stays one line.
function describeMuscles(muscles: readonly ExerciseMuscle[]) {
  const primary = muscles.filter((entry) => entry.role === 'primary').map((entry) => muscleLabel(entry.muscle));
  const supporting = muscles.length - primary.length;
  if (primary.length === 0) return 'No muscles tagged';
  return supporting > 0 ? `${primary.join(', ')} + ${supporting}` : primary.join(', ');
}

function ExerciseTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Exercise</TableHead>
        <TableHead className="hidden sm:table-cell">Muscles</TableHead>
        <TableHead className="text-right">Status</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ExerciseTableSkeleton() {
  return (
    <Table>
      <ExerciseTableHead />
      <TableBody>
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-5 w-44" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto h-6 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CreateExerciseForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const equipmentQuery = useQuery(trpc.catalog.listEquipment.queryOptions());

  const form = useForm<CreateExerciseInput>({
    resolver: zodResolver(CreateExerciseSchema),
    defaultValues: { name: '', instructions: '', muscles: [], equipmentIds: [] },
  });

  const create = useMutation(
    trpc.catalog.createExercise.mutationOptions({
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.list.queryKey() });
        form.reset();
        toast.message(`${variables.name} added to the catalog.`);
      },
      onError: () => toast.error("Couldn't add the exercise. Try again."),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add exercise</CardTitle>
        <CardDescription>Exercises can't be deleted later, so past plans always resolve.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="exercise-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="exercise-name"
                    placeholder="e.g. Incline dumbbell press"
                    aria-invalid={fieldState.invalid}
                  />
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
                  <Textarea
                    {...field}
                    id="exercise-instructions"
                    className="min-h-16"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="muscles"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel id="exercise-muscles-label">Muscles trained</FieldLabel>
                  <MuscleSelector
                    value={field.value}
                    onChange={field.onChange}
                    isInvalid={fieldState.invalid}
                    labelledBy="exercise-muscles-label"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="equipmentIds"
              control={form.control}
              render={({ field }) => (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">
                    Equipment needed <span className="font-normal text-muted-foreground">(none for bodyweight)</span>
                  </legend>
                  {equipmentQuery.isPending && (
                    <Deferred>
                      {Array.from({ length: 3 }, (_, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
                        <Skeleton key={index} className="h-5 w-32" />
                      ))}
                    </Deferred>
                  )}
                  {equipmentQuery.isError && (
                    <p className="text-sm text-destructive">We couldn&apos;t load the equipment list.</p>
                  )}
                  {equipmentQuery.isSuccess && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {equipmentQuery.data.map((item) => (
                        <label
                          key={item.id}
                          htmlFor={`exercise-equipment-${item.id}`}
                          className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/60 has-data-checked:border-primary/50 has-data-checked:bg-accent/50"
                        >
                          <Checkbox
                            id={`exercise-equipment-${item.id}`}
                            checked={field.value.includes(item.id)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked ? [...field.value, item.id] : field.value.filter((id) => id !== item.id),
                              )
                            }
                          />
                          <span className="truncate">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}
            />
            <Button type="submit" disabled={create.isPending}>
              <PlusIcon data-icon="inline-start" />
              {create.isPending ? 'Adding...' : 'Add exercise'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function ExerciseSectionSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>
      <ExerciseTableSkeleton />
    </div>
  );
}

function ExerciseSectionRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'Catalog');
  const query = useQuery(trpc.catalog.list.queryOptions());
  const [search, setSearch] = useUrlState<string>('q', '');

  const term = search.trim().toLowerCase();
  const filtered = (query.data ?? []).filter(
    (exercise) =>
      !term ||
      exercise.name.toLowerCase().includes(term) ||
      exercise.muscles.some((entry) => muscleLabel(entry.muscle).toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, PAGE_SIZE);

  let list: ReactNode;
  if (query.isPending) {
    list = (
      <Deferred>
        <ExerciseSectionSkeleton />
      </Deferred>
    );
  } else if (query.isError) {
    list = (
      <QueryError
        title="We couldn't load the exercises"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  } else if (query.data.length === 0) {
    list = (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={DumbbellIcon}
          title="No exercises yet"
          description={canManage ? 'Add the first one with the form.' : 'An admin adds exercises here.'}
        />
      </div>
    );
  } else {
    list = (
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-5 py-4 sm:px-6">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                pagination.setPage(1);
              }}
              placeholder="Search exercises or muscles"
              className="sm:w-80"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={SearchXIcon} title="No matches" description="Try another name or muscle." />
          ) : (
            <Table>
              <ExerciseTableHead />
              <TableBody>
                {pagination.pageItems.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell>
                      <p className="font-semibold">{exercise.name}</p>
                      <p className="text-muted-foreground sm:hidden">{describeMuscles(exercise.muscles)}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{describeMuscles(exercise.muscles)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={exercise.isAvailable ? 'live' : 'unavailable'}>
                        {exercise.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.setPage}
          noun="exercises"
        />
      </div>
    );
  }

  return (
    <div className={canManage ? 'grid items-start gap-6 lg:grid-cols-3' : undefined}>
      <div className="min-w-0 lg:col-span-2">{list}</div>
      {canManage && <CreateExerciseForm />}
    </div>
  );
}

export const ExerciseSection = Object.assign(ExerciseSectionRoot, { Skeleton: ExerciseSectionSkeleton });
