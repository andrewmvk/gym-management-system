'use client';

import { computeEquipmentImpact } from '@cadence/shared/schemas/muscle-heat';
import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, WrenchIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAppAbility } from '@/abilities';
import { EquipmentLinksSheet } from '@/app/(staff)/catalog/equipment-links-sheet';
import { EquipmentToggle } from '@/app/(staff)/catalog/equipment-toggle';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';

const CreateEquipmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});
type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>;

function EquipmentListSkeleton() {
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      {Array.from({ length: 5 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <li key={index} className="flex min-h-15 items-center justify-between gap-4 px-5 sm:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-11 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

function EquipmentRow({
  id,
  name,
  isAvailable,
  affects,
  exercises,
}: {
  id: string;
  name: string;
  isAvailable: boolean;
  affects?: string;
  exercises: ComponentProps<typeof EquipmentLinksSheet>['exercises'] | undefined;
}) {
  return (
    <div className="flex min-h-15 items-center justify-between gap-4 px-5 py-2 transition-colors hover:bg-muted/60 sm:px-6">
      <label htmlFor={`equipment-${id}`} className="flex min-w-0 flex-col">
        <span className="font-semibold">{name}</span>
        <span className="text-sm text-muted-foreground">
          {isAvailable ? 'In service' : 'Out of service'}
          {affects && (isAvailable ? ` · out of service it would take out ${affects}` : ` · takes out ${affects}`)}
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-3">
        {exercises && <EquipmentLinksSheet equipmentId={id} equipmentName={name} exercises={exercises} />}
        <EquipmentToggle id={id} name={name} isAvailable={isAvailable} />
      </div>
    </div>
  );
}

function CreateEquipmentForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const form = useForm<CreateEquipmentInput>({
    resolver: zodResolver(CreateEquipmentSchema),
    defaultValues: { name: '' },
  });

  const create = useMutation(
    trpc.catalog.createEquipment.mutationOptions({
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.listEquipment.queryKey() });
        form.reset();
        toast.message(`${variables.name} added.`);
      },
      onError: () => toast.error("Couldn't add the equipment. Try again."),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add equipment</CardTitle>
        <CardDescription>
          A new piece starts in service. Link it to its exercises afterwards with Linked exercises.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
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
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button type="submit" disabled={create.isPending}>
            <PlusIcon data-icon="inline-start" />
            {create.isPending ? 'Adding...' : 'Add equipment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EquipmentSectionRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'Catalog');
  const query = useQuery(trpc.catalog.listEquipment.queryOptions());
  const exercisesQuery = useQuery(trpc.catalog.list.queryOptions());
  const impact = useMemo(() => computeEquipmentImpact(exercisesQuery.data ?? []), [exercisesQuery.data]);
  const affectsOf = (id: string) => {
    const entry = impact.find((candidate) => candidate.equipmentId === id);
    return entry ? entry.muscles.map((muscle) => muscleLabel(muscle).toLowerCase()).join(', ') : undefined;
  };

  let list: ReactNode;
  if (query.isPending) {
    list = (
      <Deferred>
        <EquipmentListSkeleton />
      </Deferred>
    );
  } else if (query.isError) {
    list = (
      <QueryError
        title="We couldn't load the equipment"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  } else if (query.data.length === 0) {
    list = (
      <div className="rounded-lg border bg-card">
        <EmptyState icon={WrenchIcon} title="No equipment yet" description="Bodyweight exercises work without any." />
      </div>
    );
  } else {
    list = (
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {query.data.map((item) =>
          canManage ? (
            <li key={item.id}>
              <EquipmentRow
                id={item.id}
                name={item.name}
                isAvailable={item.isAvailable}
                affects={affectsOf(item.id)}
                exercises={exercisesQuery.data}
              />
            </li>
          ) : (
            <li key={item.id} className="flex min-h-15 items-center justify-between gap-4 px-5 sm:px-6">
              <span className="flex flex-col">
                <span className="font-semibold">{item.name}</span>
                {affectsOf(item.id) && (
                  <span className="text-sm text-muted-foreground">Takes out {affectsOf(item.id)}</span>
                )}
              </span>
              <Badge variant={item.isAvailable ? 'live' : 'unavailable'}>
                {item.isAvailable ? 'Available' : 'Out of service'}
              </Badge>
            </li>
          ),
        )}
      </ul>
    );
  }

  return (
    <div className={canManage ? 'grid items-start gap-6 lg:grid-cols-3' : undefined}>
      <div className="min-w-0 lg:col-span-2">{list}</div>
      {canManage && <CreateEquipmentForm />}
    </div>
  );
}

export const EquipmentSection = Object.assign(EquipmentSectionRoot, { Skeleton: EquipmentListSkeleton });
