'use client';

import { type BasicInfoInput, BasicInfoInputSchema, type GENDER_OPTIONS } from '@cadence/shared/schemas/signup';
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
import { useI18n } from '@/lib/i18n/i18n-provider';
import type { LabelKey } from '@/lib/i18n/translate';
import { useTRPC } from '@/lib/trpc';

const GENDER_LABELS: Record<(typeof GENDER_OPTIONS)[number], LabelKey> = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
};

interface BasicInfoStepProps {
  defaultValues: BasicInfoInput;
  onContinue: (values: BasicInfoInput) => void;
  // Set when the final registration found the email already registered.
  emailError?: string | null;
}

// Kept in English in the form state: FieldError translates it where it shows.
const EMAIL_TAKEN_MESSAGE = 'An account already exists for this email. Try signing in instead.';

export function BasicInfoStep({ defaultValues, onContinue, emailError }: BasicInfoStepProps) {
  const { t } = useI18n();
  const trpc = useTRPC();
  const form = useForm<BasicInfoInput>({
    resolver: zodResolver(BasicInfoInputSchema),
    defaultValues,
    errors: emailError ? { email: { type: 'server', message: emailError } } : undefined,
  });

  // Nothing is stored here: the check only refuses an already registered email before the person fills
  // in the rest of the registration.
  const checkEmail = useMutation(
    trpc.auth.checkEmail.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'already_registered') {
          form.setError('email', { message: EMAIL_TAKEN_MESSAGE });
          return;
        }
        onContinue(form.getValues());
      },
      onError: () => toast.error(t("We couldn't check your email. Try again.")),
    }),
  );

  return (
    <StepPanel
      title={t('About you')}
      description={t("Start with your basic information. We'll ask for your consent and a reference photo next.")}
    >
      <form noValidate onSubmit={form.handleSubmit((values) => checkEmail.mutate({ email: values.email }))}>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-name">{t('Full name')}</FieldLabel>
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
                <FieldLabel htmlFor="signup-email">{t('Email')}</FieldLabel>
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
                  <FieldLabel htmlFor="signup-phone">{t('Phone')}</FieldLabel>
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
                  <FieldLabel htmlFor="signup-birthdate">{t('Birthdate')}</FieldLabel>
                  <DatePicker
                    id="signup-birthdate"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={t('Select a date')}
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
                  {t('Gender')} <span className="font-normal text-muted-foreground">{t('(optional)')}</span>
                </FieldLabel>
                <Select value={field.value ?? ''} onValueChange={(value) => field.onChange(value || undefined)}>
                  <SelectTrigger id="signup-gender" className="w-full">
                    <SelectValue placeholder={t('Prefer not to say')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {t(label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={checkEmail.isPending}>
            {checkEmail.isPending ? t('Continuing...') : t('Continue')}
          </Button>
        </FieldGroup>
      </form>
    </StepPanel>
  );
}
