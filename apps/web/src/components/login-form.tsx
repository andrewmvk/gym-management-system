'use client';

import { createAppAbility } from '@cadence/shared/auth';
import { LoginInputSchema, type LoginInput } from '@cadence/shared/schemas/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { homePathFor, safeReturnPath } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

export function LoginForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const returnPath = safeReturnPath(useSearchParams().get('next'));

  const me = useQuery(trpc.auth.me.queryOptions());
  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: (session) => {
        queryClient.setQueryData(trpc.auth.me.queryKey(), session);
      },
      onError: (error) => {
        toast.error(error.data?.code === 'UNAUTHORIZED' ? error.message : "We couldn't sign you in. Try again.");
      },
    }),
  );

  const session = me.data;
  useEffect(() => {
    if (!session) return;
    router.replace(returnPath ?? homePathFor(createAppAbility(session.rules)) ?? '/');
  }, [session, returnPath, router]);

  return (
    <StepPanel title="Sign in" description="Use the e-mail and password of your Cadence account.">
      <form noValidate onSubmit={form.handleSubmit((values) => login.mutate(values))}>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
                <Input {...field} id="login-email" type="email" autoComplete="email" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <Input
                  {...field}
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={login.isPending || Boolean(session)}>
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </FieldGroup>
      </form>
    </StepPanel>
  );
}
