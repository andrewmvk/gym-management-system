'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAppAbility } from '@/abilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useTRPC } from '@/lib/trpc';

const CreateEquipmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});
type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>;

function EquipmentSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EquipmentToggle({ id, name, isAvailable }: { id: string; name: string; isAvailable: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const toggle = useMutation(
    trpc.catalog.toggleEquipmentAvailability.mutationOptions({
      // Exercise availability is derived from equipment availability (FR-17 / RN-04), so a toggle here
      // must also invalidate the exercise list, not just the equipment list.
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.listEquipment.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.catalog.list.queryKey() });
      },
      onError: () => toast.error(`Couldn't update ${name}. Try again.`),
    }),
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <FieldLabel htmlFor={`equipment-${id}`} className="font-normal">
        {name}
      </FieldLabel>
      <Switch
        id={`equipment-${id}`}
        checked={isAvailable}
        disabled={toggle.isPending}
        onCheckedChange={() => toggle.mutate({ id })}
      />
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.listEquipment.queryKey() });
        form.reset();
      },
      onError: () => toast.error("Couldn't add the equipment. Try again."),
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
              <FieldLabel htmlFor="equipment-name">New equipment</FieldLabel>
              <Input {...field} id="equipment-name" placeholder="e.g. Battle ropes" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" variant="outline" disabled={create.isPending}>
          {create.isPending ? 'Adding...' : 'Add equipment'}
        </Button>
      </FieldGroup>
    </form>
  );
}

function EquipmentSectionRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'Catalog');
  const query = useQuery(trpc.catalog.listEquipment.queryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            ))}
          </div>
        )}
        {query.isError && <p className="text-sm text-destructive">We couldn't load the equipment list.</p>}
        {query.isSuccess && query.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No equipment yet.</p>
        )}
        {query.isSuccess &&
          query.data.map((item) =>
            canManage ? (
              <EquipmentToggle key={item.id} id={item.id} name={item.name} isAvailable={item.isAvailable} />
            ) : (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span>{item.name}</span>
                <span className="text-sm text-muted-foreground">{item.isAvailable ? 'Available' : 'Unavailable'}</span>
              </div>
            ),
          )}
        {canManage && <CreateEquipmentForm />}
      </CardContent>
    </Card>
  );
}

export const EquipmentSection = Object.assign(EquipmentSectionRoot, { Skeleton: EquipmentSectionSkeleton });
