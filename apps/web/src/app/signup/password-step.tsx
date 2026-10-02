'use client';

import { SetPasswordInputSchema } from '@cadence/shared/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheckIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/trpc';

interface PasswordStepProps {
  userId: string;
  onActivated: () => void;
}

const FormSchema = SetPasswordInputSchema.extend({
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type FormValues = z.input<typeof FormSchema>;

export function PasswordStep({ userId, onActivated }: PasswordStepProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { userId, password: '', confirmPassword: '' },
  });

  const setPassword = useMutation(
    trpc.auth.setPassword.mutationOptions({
      onSuccess: (session) => {
        if (!session) return;
        queryClient.setQueryData(trpc.auth.me.queryKey(), session);
        onActivated();
        router.replace('/onboarding');
      },
      onError: (error) => {
        if (error.data?.code === 'CONFLICT') {
          toast.error('This account is already activated. Try signing in instead.');
          return;
        }
        toast.error("We couldn't set your password. Try again.");
      },
    }),
  );

  return (
    <StepPanel
      icon={BadgeCheckIcon}
      title="You're cleared to train"
      description="Set a password to finish creating your account."
    >
      <div>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) =>
            setPassword.mutate({ userId: values.userId, password: values.password }),
          )}
        >
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
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
            <Button type="submit" size="lg" className="w-full mt-4" disabled={setPassword.isPending}>
              {setPassword.isPending ? 'Creating account...' : 'Create account'}
            </Button>
          </FieldGroup>
        </form>
      </div>
    </StepPanel>
  );
}
