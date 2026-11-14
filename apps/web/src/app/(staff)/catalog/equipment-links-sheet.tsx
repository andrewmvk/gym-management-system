'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinkIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { serverMessage } from '@/lib/error-message';
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

interface LinkableExercise {
  id: string;
  name: string;
  equipment: readonly { id: string }[];
}

interface EquipmentLinksSheetProps {
  equipmentId: string;
  equipmentName: string;
  exercises: readonly LinkableExercise[];
  // Hands over to the New exercise sheet with this piece already ticked, for an exercise that is not in the list.
  onCreateExercise?: () => void;
  // Given together, the caller opens and closes the sheet and no trigger button is drawn.
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

function exerciseCount({ t }: I18n, count: number) {
  return count === 1 ? t('1 exercise') : t('{count} exercises', { count });
}

function LinksForm({
  equipmentId,
  equipmentName,
  exercises,
  onCreateExercise,
  onDone,
}: EquipmentLinksSheetProps & { onDone: () => void }) {
  const { t, tn, tx } = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const initial = exercises.filter((exercise) => exercise.equipment.some((piece) => piece.id === equipmentId));
  const [selected, setSelected] = useState(() => new Set(initial.map((exercise) => exercise.id)));
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const matches = exercises.filter((exercise) => !term || tx(exercise.name).toLowerCase().includes(term));

  // An exercise with no equipment at all counts as bodyweight, so it is always available. Unlinking a piece
  // from an exercise that only used this piece turns the exercise into one, which is worth saying out loud.
  const losingAllEquipment = exercises.filter(
    (exercise) =>
      !selected.has(exercise.id) &&
      exercise.equipment.length > 0 &&
      exercise.equipment.every((piece) => piece.id === equipmentId),
  );
  const isChanged = selected.size !== initial.length || initial.some((exercise) => !selected.has(exercise.id));

  const save = useMutation(
    trpc.catalog.setEquipmentLinks.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.catalog.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.reviews.queue.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.reviews.overview.queryKey() });
        toast.success(t('Linked exercises of {name} saved.', { name: tx(equipmentName) }));
        onDone();
      },
      onError: (error) =>
        toast.error(
          tx(serverMessage(error, t("We couldn't save the links of {name}. Try again.", { name: tx(equipmentName) }))),
        ),
    }),
  );

  function toggle(exerciseId: string, isChecked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (isChecked) next.add(exerciseId);
      else next.delete(exerciseId);
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b px-5 py-4 pr-16">
        <div>
          <SheetTitle>{t('Linked exercises')}</SheetTitle>
          <SheetDescription>
            {t(
              'The exercises that use {name}. An exercise can be done while at least one of its linked pieces is in service.',
              { name: tx(equipmentName) },
            )}
          </SheetDescription>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder={t('Search exercises')} />
        <p className="text-sm text-muted-foreground">
          {tn('{selected} of {total} exercises linked.', {
            selected: <span className="numerals text-base font-semibold text-foreground">{selected.size}</span>,
            total: <span className="numerals text-base font-semibold text-foreground">{exercises.length}</span>,
          })}
        </p>
      </div>
      <ul aria-label={t('Exercises')} className="min-h-0 flex-1 divide-y overflow-y-auto">
        {matches.length === 0 && (
          <li className="flex flex-col items-start gap-3 px-5 py-4 text-sm text-muted-foreground">
            {t('No exercise matches.')}
            {onCreateExercise && (
              <Button variant="outline" size="sm" onClick={onCreateExercise}>
                <PlusIcon data-icon="inline-start" />
                {t('New exercise with {name}', { name: tx(equipmentName) })}
              </Button>
            )}
          </li>
        )}
        {matches.map((exercise) => (
          <li key={exercise.id}>
            <label
              htmlFor={`link-${exercise.id}`}
              className="flex min-h-11 items-center gap-3 px-5 py-2 hover:bg-muted/60"
            >
              <Checkbox
                id={`link-${exercise.id}`}
                checked={selected.has(exercise.id)}
                onCheckedChange={(checked) => toggle(exercise.id, checked === true)}
              />
              <span className="text-sm font-semibold">{tx(exercise.name)}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 border-t bg-muted/60 px-5 py-4">
        {losingAllEquipment.length > 0 && (
          <div role="status" className="flex gap-2 text-sm text-pretty">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              {tn(
                losingAllEquipment.length === 1
                  ? '{count} exercise would have no equipment at all and count as always available, even if this piece is out of service: {names}.'
                  : '{count} exercises would have no equipment at all and count as always available, even if this piece is out of service: {names}.',
                {
                  count: <span className="numerals text-base font-semibold">{losingAllEquipment.length}</span>,
                  names: losingAllEquipment.map((exercise) => tx(exercise.name)).join(', '),
                },
              )}
            </p>
          </div>
        )}
        <div className="grid gap-2 sm:flex sm:justify-end">
          {onCreateExercise && (
            <Button variant="outline" onClick={onCreateExercise} disabled={save.isPending}>
              <PlusIcon data-icon="inline-start" />
              {t('New exercise')}
            </Button>
          )}
          <Button
            disabled={!isChanged || save.isPending}
            onClick={() => save.mutate({ equipmentId, exerciseIds: [...selected] })}
          >
            {save.isPending ? t('Saving...') : t('Save links')}
          </Button>
        </div>
      </div>
    </>
  );
}

// The editor that decides which exercises depend on a piece of equipment; only users who manage the catalog see it.
export function EquipmentLinksSheet({
  equipmentId,
  equipmentName,
  exercises,
  onCreateExercise,
  isOpen: controlledIsOpen,
  onOpenChange,
}: EquipmentLinksSheetProps) {
  const i18n = useI18n();
  const { t, tx } = i18n;
  const [ownIsOpen, setOwnIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? controlledIsOpen : ownIsOpen;
  const setIsOpen = isControlled ? onOpenChange : setOwnIsOpen;
  const linkedCount = exercises.filter((exercise) =>
    exercise.equipment.some((piece) => piece.id === equipmentId),
  ).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={t('Linked exercises of {name}, {exercises}', {
              name: tx(equipmentName),
              exercises: exerciseCount(i18n, linkedCount),
            })}
          >
            <LinkIcon data-icon="inline-start" />
            <span className="numerals text-base">{linkedCount}</span>
            <span className="hidden sm:inline">{t('linked')}</span>
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="w-full sm:max-w-md">
        <LinksForm
          equipmentId={equipmentId}
          equipmentName={equipmentName}
          exercises={exercises}
          onCreateExercise={
            onCreateExercise &&
            (() => {
              setIsOpen(false);
              onCreateExercise();
            })
          }
          onDone={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
