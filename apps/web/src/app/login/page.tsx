import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthShell
      tagline="Back on the floor."
      subline="Today's plan is waiting, and it already knows what you told your coach last week."
      footer={
        <>
          New to Cadence?{' '}
          <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
            Join the gym
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
