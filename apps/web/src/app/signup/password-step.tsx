'use client';

import { PASSWORD_MIN_LENGTH, PasswordSchema } from '@cadence/shared/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyholeIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface PasswordStepProps {
  onSubmit: (password: string) => void;
  isSubmitting: boolean;
}

const FormSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.input<typeof FormSchema>;

// The last step: submitting it is the one request that creates the account (FR-9).
export function PasswordStep({ onSubmit, isSubmitting }: PasswordStepProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <StepPanel
      icon={LockKeyholeIcon}
      title="Choose a password"
      description="Last step. Your account is created when you submit, and you can sign in right away."
    >
      <form noValidate onSubmit={form.handleSubmit((values) => onSubmit(values.password))}>
        <FieldGroup>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                <FieldDescription id="signup-password-rules">
                  Use at least {PASSWORD_MIN_LENGTH} characters.
                </FieldDescription>
                <Input
                  {...field}
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="signup-password-rules"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="signup-confirm-password">Confirm password</FieldLabel>
                <Input
                  {...field}
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </FieldGroup>
      </form>
    </StepPanel>
  );
}
