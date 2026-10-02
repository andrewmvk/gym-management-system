'use client';

import { type BasicInfoInput, BasicInfoInputSchema } from '@cadence/shared/schemas/signup';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DatePicker } from '@/components/date-picker';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toIsoDate } from '@/lib/calendar-date';
import { useTRPC } from '@/lib/trpc';

const GENDER_LABELS = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
} as const;

interface BasicInfoStepProps {
  defaultValues: BasicInfoInput;
  onContinue: (values: BasicInfoInput) => void;
  onResume: (userId: string) => void;
}

export function BasicInfoStep({ defaultValues, onContinue, onResume }: BasicInfoStepProps) {
  const trpc = useTRPC();
  const form = useForm<BasicInfoInput>({
    resolver: zodResolver(BasicInfoInputSchema),
    defaultValues,
  });

  // Nothing is stored here: the check only rejects an unusable e-mail, or sends a returning applicant
  // straight to their verdict, before they fill in the rest of the signup.
  const checkEmail = useMutation(
    trpc.aptitude.checkEmail.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'email_blocked') {
          toast.error("This e-mail can't be used to sign up.");
          return;
        }
        if (result.status === 'already_registered') {
          toast.error('An account already exists for this e-mail. Try signing in instead.');
          return;
        }
        if (result.status === 'resumable') {
          toast.message('Welcome back! Picking up where you left off.');
          onResume(result.userId);
          return;
        }
        onContinue(form.getValues());
      },
      onError: () => toast.error("We couldn't check your e-mail. Try again."),
    }),
  );

  return (
    <StepPanel title="About you" description="Start with your basic information. We'll ask for a reference photo next.">
      <form noValidate onSubmit={form.handleSubmit((values) => checkEmail.mutate({ email: values.email }))}>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-name">Full name</FieldLabel>
                <Input {...field} id="signup-name" autoComplete="name" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>
                <Input
                  {...field}
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-phone">Phone</FieldLabel>
                  <Input {...field} id="signup-phone" type="tel" autoComplete="tel" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="birthdate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-birthdate">Birthdate</FieldLabel>
                  <DatePicker
                    id="signup-birthdate"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Select a date"
                    max={toIsoDate(new Date())}
                    captionLayout="dropdown"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <Controller
            name="gender"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="signup-gender">
                  Gender <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Select value={field.value ?? ''} onValueChange={(value) => field.onChange(value || undefined)}>
                  <SelectTrigger id="signup-gender" className="w-full">
                    <SelectValue placeholder="Prefer not to say" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={checkEmail.isPending}>
            {checkEmail.isPending ? 'Continuing...' : 'Continue'}
          </Button>
        </FieldGroup>
      </form>
    </StepPanel>
  );
}
