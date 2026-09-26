'use client';

import { StartSignupInputSchema, type StartSignupInput } from '@cadence/shared/schemas/signup';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/trpc';

interface BasicInfoStepProps {
  onResolved: (result: { userId: string; nextStep: 'photo' | 'done' }) => void;
}

export function BasicInfoStep({ onResolved }: BasicInfoStepProps) {
  const trpc = useTRPC();
  const form = useForm<StartSignupInput>({
    resolver: zodResolver(StartSignupInputSchema),
    defaultValues: { name: '', phone: '', email: '', birthdate: '' },
  });

  const startSignup = useMutation(
    trpc.aptitude.startSignup.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'email_blocked') {
          toast.error("This e-mail can't be used to sign up.");
          return;
        }
        if (result.status === 'already_registered') {
          toast.error('An account already exists for this e-mail. Try signing in instead.');
          return;
        }
        if (result.status === 'resumed') {
          toast.message('Welcome back! Picking up where you left off.');
        }
        onResolved({ userId: result.userId, nextStep: result.nextStep });
      },
      onError: () => toast.error("We couldn't submit your information. Try again."),
    }),
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Join Cadence</CardTitle>
        <CardDescription>Start with your basic information. We&apos;ll ask for a reference photo next.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={form.handleSubmit((values) => startSignup.mutate(values))}>
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
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>
                  <Input {...field} id="signup-email" type="email" autoComplete="email" aria-invalid={fieldState.invalid} />
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
                  <Input
                    {...field}
                    id="signup-birthdate"
                    type="date"
                    autoComplete="bday"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" className="w-full" disabled={startSignup.isPending}>
              {startSignup.isPending ? 'Continuing...' : 'Continue'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
