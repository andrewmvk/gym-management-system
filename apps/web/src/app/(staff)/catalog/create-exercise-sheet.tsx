'use client';

import { ExerciseMusclesSchema } from '@cadence/shared/schemas/muscles';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AiButton } from '@/components/ai-button';
import { Deferred } from '@/components/deferred';
import { MultiSelect } from '@/components/multi-select';
import { MuscleSelector } from '@/components/muscle-map/muscle-selector';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { serverMessage } from '@/lib/error-message';
import { useTRPC } from '@/lib/trpc';

const FORM_ID = 'create-exercise-form';

const CreateExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  instructions: z.string().trim().min(1, 'Instructions are required'),
  muscles: ExerciseMusclesSchema,
  equipmentIds: z.array(z.string()),
});
type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;

interface CreateExerciseSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated?: (name: string) => void;
  // A piece of equipment ticked each time the sheet opens, for exercises started from that piece's row.
  presetEquipmentId?: string | null;
}

// Rendered once by the section, never inside a button, a loading state or an empty state, so the draft survives
// the list finishing its load. Cancel discards it; Esc and the close button keep it for the next time it opens.
export function CreateExerciseSheet({
  isOpen,
  onOpenChange,
  onCreated,
  presetEquipmentId = null,
}: CreateExerciseSheetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const equipmentQuery = useQuery(trpc.catalog.listEquipment.queryOptions());
  const exercisesQuery = useQuery(trpc.catalog.list.queryOptions());
  const [isRestored, setIsRestored] = useState(false);
  const musclesRef = useRef<HTMLDivElement>(null);

  const form = useForm<CreateExerciseInput>({
    resolver: zodResolver(CreateExerciseSchema),
    defaultValues: { name: '', instructions: '', muscles: [], equipmentIds: [] },
  });
  const { isDirty } = form.formState;

  // Reopening onto a half-filled form says so, and leaves out the errors of the attempt that was interrupted.
  useEffect(() => {
    if (!isOpen) {
      setIsRestored(false);
      return;
    }
    if (form.formState.isDirty) {
      setIsRestored(true);
      form.clearErrors();
    }
  }, [isOpen, form]);

  useEffect(() => {
    if (!isOpen || !presetEquipmentId) return;
    const current = form.getValues('equipmentIds');
    if (!current.includes(presetEquipmentId)) {
      form.setValue('equipmentIds', [...current, presetEquipmentId]);
    }
  }, [isOpen, presetEquipmentId, form]);

  const create = useMutation(
    trpc.catalog.createExercise.mutationOptions({
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: trpc.catalog.list.queryKey() });
        form.reset();
        onOpenChange(false);
        toast.success(
          `${variables.name} added to the catalog.`,
          onCreated && { action: { label: 'Show it', onClick: () => onCreated(variables.name) } },
        );
      },
      onError: (error) => toast.error(serverMessage(error, "Couldn't add the exercise. Try again.")),
    }),
  );

  function submit(values: CreateExerciseInput) {
    const name = values.name.toLowerCase();
    if (exercisesQuery.data?.some((exercise) => exercise.name.trim().toLowerCase() === name)) {
      form.setError('name', { message: 'An exercise with this name is already in the catalog.' });
      form.setFocus('name');
      return;
    }
    create.mutate(values);
  }

  // The text fields take focus on their own; the muscle map has no input to hand it to, so its group does.
  function focusMuscles(errors: FieldErrors<CreateExerciseInput>) {
    if (!errors.name && !errors.instructions && errors.muscles) musclesRef.current?.focus();
  }

  const equipment = equipmentQuery.data ?? [];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full max-w-full sm:max-w-3xl"
        onInteractOutside={(event) => {
          if (isDirty) event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-1.5 border-b px-5 py-4 pr-16 sm:px-6">
          <SheetTitle>New exercise</SheetTitle>
          <SheetDescription>
            Stays in the catalog once added, so past plans keep resolving. Name, instructions and muscles are required.
          </SheetDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isRestored && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 text-sm"
            >
              <span className="py-2">Draft restored from where you left off.</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  form.reset();
                  setIsRestored(false);
                }}
              >
                Start over
              </Button>
            </div>
          )}
          <form id={FORM_ID} noValidate onSubmit={form.handleSubmit(submit, focusMuscles)}>
            <fieldset disabled={create.isPending} className="grid min-w-0 gap-6 md:grid-cols-2">
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
                        className="min-h-20"
                        placeholder="How to do it, in a few steps. Members and the coach read this."
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="equipmentIds"
                  control={form.control}
                  render={({ field }) => (
                    <fieldset className="flex min-w-0 flex-col gap-2">
                      <legend className="mb-2 text-sm font-medium">
                        Equipment needed{' '}
                        <span className="font-normal text-muted-foreground">(optional, none for bodyweight)</span>
                      </legend>
                      {equipmentQuery.isPending && (
                        <Deferred>
                          {Array.from({ length: 3 }, (_, index) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
                            <Skeleton key={index} className="h-11 w-full" />
                          ))}
                        </Deferred>
                      )}
                      {equipmentQuery.isError && (
                        <QueryError
                          title="We couldn't load the equipment"
                          onRetry={() => equipmentQuery.refetch()}
                          isRetrying={equipmentQuery.isRefetching}
                          className="py-6"
                        />
                      )}
                      {equipmentQuery.isSuccess && equipment.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No equipment in the gym yet. Add some on the Equipment tab, or save this as a bodyweight
                          exercise.
                        </p>
                      )}
                      {equipmentQuery.isSuccess && equipment.length > 0 && (
                        <MultiSelect
                          options={equipment.map((item) => ({ value: item.id, label: item.name }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select equipment"
                          searchPlaceholder="Search equipment"
                          emptyMessage="No equipment matches."
                          aria-label="Equipment needed"
                        />
                      )}
                    </fieldset>
                  )}
                />
              </FieldGroup>
              <div ref={musclesRef} tabIndex={-1} className="min-w-0 outline-none">
                <Controller
                  name="muscles"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel id="exercise-muscles-label">Muscles trained</FieldLabel>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      <MuscleSelector
                        value={field.value}
                        onChange={field.onChange}
                        labelledBy="exercise-muscles-label"
                      />
                    </Field>
                  )}
                />
              </div>
            </fieldset>
          </form>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t bg-muted/60 px-5 py-4 sm:flex sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <AiButton
            mark="tempo"
            type="submit"
            form={FORM_ID}
            isPending={create.isPending}
            pendingLabel="Adding..."
            disabled={!equipmentQuery.isSuccess}
          >
            Add to catalog
          </AiButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
