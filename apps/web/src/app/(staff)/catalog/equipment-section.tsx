'use client';

import { computeEquipmentImpact } from '@cadence/shared/schemas/muscle-heat';
import { type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, SearchXIcon, WrenchIcon } from 'lucide-react';
import { type ComponentProps, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAppAbility } from '@/abilities';
import { CreateExerciseSheet } from '@/app/(staff)/catalog/create-exercise-sheet';
import { EquipmentLinksSheet } from '@/app/(staff)/catalog/equipment-links-sheet';
import { EquipmentToggle } from '@/app/(staff)/catalog/equipment-toggle';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUrlState } from '@/hooks/use-url-state';
import { serverMessage } from '@/lib/error-message';
import { useTRPC } from '@/lib/trpc';

const SHOWN_MUSCLES = 3;

const CreateEquipmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});
type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>;

type LinkableExercises = ComponentProps<typeof EquipmentLinksSheet>['exercises'];

// The first few muscles by name, with a count of the rest so the cell stays one line.
function describeMuscles(muscles: readonly MuscleId[]) {
  const shown = muscles.slice(0, SHOWN_MUSCLES).map(muscleLabel).join(', ');
  const rest = muscles.length - SHOWN_MUSCLES;
  return rest > 0 ? `${shown} + ${rest}` : shown;
}

function EquipmentTableHead({ canManage }: { canManage: boolean }) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Equipment</TableHead>
        <TableHead className="hidden lg:table-cell">If out of service</TableHead>
        {canManage && <TableHead>Exercises</TableHead>}
        <TableHead className="text-right">Status</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function EquipmentTableSkeleton({ canManage = true }: { canManage?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <Skeleton className="h-10 w-full lg:w-72" />
        {canManage && (
          <FilterBar.Trailing>
            <Skeleton className="h-10 w-full lg:w-44" />
          </FilterBar.Trailing>
        )}
      </FilterBar>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <EquipmentTableHead canManage={canManage} />
          <TableBody>
            {Array.from({ length: 5 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-36" />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                )}
                <TableCell>
                  <Skeleton className="ml-auto h-6 w-24 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// The same top-right "Add" button as the Exercises tab. One field does not need a sheet, so it opens a small
// popover under the button; Enter adds, and the toast offers the next step (linking exercises).
function AddEquipmentButton({
  existingNames,
  onAdded,
}: {
  existingNames: readonly string[];
  onAdded: (piece: { id: string; name: string }) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<CreateEquipmentInput>({
    resolver: zodResolver(CreateEquipmentSchema),
    defaultValues: { name: '' },
  });

  const create = useMutation(
    trpc.catalog.createEquipment.mutationOptions({
      onSuccess: (piece) => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.listEquipment.queryKey() });
        form.reset();
        setIsOpen(false);
        toast.success(`${piece.name} added and in service.`, {
          action: { label: 'Link exercises', onClick: () => onAdded({ id: piece.id, name: piece.name }) },
        });
      },
      onError: (error) => toast.error(serverMessage(error, "Couldn't add the equipment. Try again.")),
    }),
  );

  function submit(values: CreateEquipmentInput) {
    const name = values.name.toLowerCase();
    if (existingNames.some((existing) => existing.trim().toLowerCase() === name)) {
      form.setError('name', { message: 'This equipment is already in the list.' });
      form.setFocus('name');
      return;
    }
    create.mutate(values);
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) form.reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add equipment
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)}>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="equipment-name">Name</FieldLabel>
                <Input
                  {...field}
                  id="equipment-name"
                  placeholder="e.g. Battle ropes"
                  disabled={create.isPending}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <p className="text-sm text-muted-foreground">It starts in service. Link its exercises once it is added.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function EquipmentRow({
  id,
  name,
  isAvailable,
  affects,
  exercises,
  canManage,
  onCreateExercise,
}: {
  id: string;
  name: string;
  isAvailable: boolean;
  affects: readonly MuscleId[] | undefined;
  exercises: LinkableExercises | undefined;
  canManage: boolean;
  onCreateExercise: () => void;
}) {
  const impactText = affects ? describeMuscles(affects) : 'Nothing, every exercise has another option';

  return (
    <TableRow>
      <TableCell>
        <p className="font-semibold">{name}</p>
        <p className="text-muted-foreground lg:hidden">
          {affects ? `Out of service takes out ${impactText}` : impactText}
        </p>
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">{impactText}</TableCell>
      {canManage && (
        <TableCell>
          {exercises ? (
            <EquipmentLinksSheet
              equipmentId={id}
              equipmentName={name}
              exercises={exercises}
              onCreateExercise={onCreateExercise}
            />
          ) : (
            <Skeleton className="h-8 w-20" />
          )}
        </TableCell>
      )}
      <TableCell className="text-right">
        {canManage ? (
          <div className="flex items-center justify-end gap-3">
            <span className="hidden text-muted-foreground sm:inline">
              {isAvailable ? 'In service' : 'Out of service'}
            </span>
            <EquipmentToggle id={id} name={name} isAvailable={isAvailable} />
          </div>
        ) : (
          <Badge variant={isAvailable ? 'live' : 'unavailable'}>{isAvailable ? 'Available' : 'Out of service'}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function EquipmentSectionRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'Catalog');
  const query = useQuery(trpc.catalog.listEquipment.queryOptions());
  const exercisesQuery = useQuery(trpc.catalog.list.queryOptions());
  const [createFor, setCreateFor] = useState<string | null>(null);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  // The piece whose links sheet the "Link exercises" toast of a fresh add opened.
  const [linking, setLinking] = useState<{ id: string; name: string } | null>(null);
  // Its own URL key: the Exercises tab keeps its search in "q", and a search for a bench should not filter it.
  const [search, setSearch] = useUrlState<string>('equipment-q', '');
  const term = search.trim().toLowerCase();
  const filtered = (query.data ?? []).filter((item) => !term || item.name.toLowerCase().includes(term));
  const startExercise = (equipmentId: string) => {
    setCreateFor(equipmentId);
    setIsCreatingExercise(true);
  };
  const impact = useMemo(() => computeEquipmentImpact(exercisesQuery.data ?? []), [exercisesQuery.data]);
  const affectsOf = (id: string) => {
    const muscles = impact.find((candidate) => candidate.equipmentId === id)?.muscles;
    return muscles && muscles.length > 0 ? muscles : undefined;
  };

  if (query.isPending) {
    return (
      <Deferred>
        <EquipmentTableSkeleton canManage={canManage} />
      </Deferred>
    );
  }

  if (query.isError) {
    return (
      <QueryError
        title="We couldn't load the equipment"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const addAction = canManage ? (
    <AddEquipmentButton existingNames={query.data.map((item) => item.name)} onAdded={(piece) => setLinking(piece)} />
  ) : undefined;

  if (query.data.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={WrenchIcon}
          title="No equipment yet"
          description={
            canManage
              ? 'Add the first piece. Bodyweight exercises work without any.'
              : 'Bodyweight exercises work without any.'
          }
          action={addAction}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search equipment" className="w-full lg:w-72" />
        {addAction && <FilterBar.Trailing>{addAction}</FilterBar.Trailing>}
      </FilterBar>
      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState icon={SearchXIcon} title="No matches" description="Try another name." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <EquipmentTableHead canManage={canManage} />
            <TableBody>
              {filtered.map((item) => (
                <EquipmentRow
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  isAvailable={item.isAvailable}
                  affects={affectsOf(item.id)}
                  exercises={exercisesQuery.data}
                  canManage={canManage}
                  onCreateExercise={() => startExercise(item.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {canManage && exercisesQuery.data && linking && (
        <EquipmentLinksSheet
          equipmentId={linking.id}
          equipmentName={linking.name}
          exercises={exercisesQuery.data}
          isOpen
          onOpenChange={(open) => !open && setLinking(null)}
          onCreateExercise={() => {
            setLinking(null);
            startExercise(linking.id);
          }}
        />
      )}
      {canManage && (
        <CreateExerciseSheet
          isOpen={isCreatingExercise}
          onOpenChange={setIsCreatingExercise}
          presetEquipmentId={createFor}
        />
      )}
    </div>
  );
}

export const EquipmentSection = Object.assign(EquipmentSectionRoot, { Skeleton: EquipmentTableSkeleton });
