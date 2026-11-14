import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Sign in') };
}

export default async function LoginPage() {
  const { t, tn } = await getI18n();

  return (
    <AuthShell
      tagline={t('Back on the floor.')}
      subline={t("Today's plan is waiting, and it already knows what you told your coach last week.")}
      footer={tn('New to Cadence? {link}', {
        link: (
          <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
            {t('Join the gym')}
          </Link>
        ),
      })}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
