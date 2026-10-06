'use client';

import {
  DEFAULT_OPENING_HOURS,
  type OpeningHours,
  OpeningHoursSchema,
  WEEKDAYS,
  type Weekday,
} from '@cadence/shared/schemas/gym';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { TimePicker } from '@/components/time-picker';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { serverMessage } from '@/lib/error-message';
import { useTRPC } from '@/lib/trpc';

const DAY_LABELS: Record<Weekday, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

// The week reads Monday to Sunday even though the shared list follows Date#getDay (Sunday first).
const DISPLAY_DAYS: readonly Weekday[] = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

const OPEN_FALLBACK = DEFAULT_OPENING_HOURS.monday!;

function OpeningHoursFormSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {DISPLAY_DAYS.map((day) => (
          <li key={day} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <div className="ml-auto flex gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-3 border-t pt-6">
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

function OpeningHoursFormRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'GymSettings');

  const hoursQuery = useQuery({ ...trpc.gym.getHours.queryOptions(), enabled: canManage });
  const hours = hoursQuery.data;

  const form = useForm<OpeningHours>({
    resolver: zodResolver(OpeningHoursSchema),
    defaultValues: DEFAULT_OPENING_HOURS,
  });

  useEffect(() => {
    if (hours) form.reset(hours);
  }, [hours, form]);

  const save = useMutation(
    trpc.gym.updateHours.mutationOptions({
      onSuccess: (_saved, values) => {
        queryClient.setQueryData(trpc.gym.getHours.queryKey(), values);
        queryClient.invalidateQueries({ queryKey: trpc.gym.info.queryKey() });
        form.reset(values);
        toast.success('Opening hours saved.');
      },
      onError: (error) => toast.error(serverMessage(error, "We couldn't save the opening hours. Try again.")),
    }),
  );

  if (!canManage) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title="No access"
          description="Your account doesn't include gym settings. Ask an admin if you need it."
        />
      </div>
    );
  }

  if (hoursQuery.isError) {
    return (
      <QueryError
        title="We couldn't load the opening hours"
        onRetry={() => hoursQuery.refetch()}
        isRetrying={hoursQuery.isRefetching}
      />
    );
  }

  if (hoursQuery.isPending) {
    return (
      <Deferred>
        <OpeningHoursFormSkeleton />
      </Deferred>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      className="flex max-w-3xl flex-col gap-8"
    >
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {DISPLAY_DAYS.map((day) => (
          <li key={day}>
            <Controller
              name={day}
              control={form.control}
              render={({ field }) => {
                const isClosed = field.value === null;
                const dayErrors = form.formState.errors[day];
                return (
                  <div className="flex flex-col gap-2 px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      <span className="w-28 font-display text-xl font-bold tracking-wide uppercase">
                        {DAY_LABELS[day]}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`closed-${day}`}
                          checked={isClosed}
                          onCheckedChange={(checked) => field.onChange(checked ? null : OPEN_FALLBACK)}
                        />
                        <label htmlFor={`closed-${day}`} className="text-sm">
                          Closed
                        </label>
                      </div>
                      {field.value ? (
                        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                          <Controller
                            name={`${day}.open`}
                            control={form.control}
                            render={({ field: openField }) => (
                              <TimePicker
                                value={openField.value}
                                onChange={openField.onChange}
                                onBlur={openField.onBlur}
                                aria-label={`${DAY_LABELS[day]} opens`}
                                aria-invalid={Boolean(dayErrors?.open)}
                              />
                            )}
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Controller
                            name={`${day}.close`}
                            control={form.control}
                            render={({ field: closeField }) => (
                              <TimePicker
                                value={closeField.value}
                                onChange={closeField.onChange}
                                onBlur={closeField.onBlur}
                                aria-label={`${DAY_LABELS[day]} closes`}
                                aria-invalid={Boolean(dayErrors?.close)}
                              />
                            )}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground sm:ml-auto">Closed all day</span>
                      )}
                    </div>
                    {(dayErrors?.open || dayErrors?.close) && <FieldError errors={[dayErrors.open, dayErrors.close]} />}
                  </div>
                );
              }}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center">
        <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
          {save.isPending ? 'Saving...' : 'Save opening hours'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Times use the gym's local clock. The public gym page and the open or closed state follow these hours.
        </p>
      </div>
    </form>
  );
}

export const OpeningHoursForm = Object.assign(OpeningHoursFormRoot, { Skeleton: OpeningHoursFormSkeleton });
