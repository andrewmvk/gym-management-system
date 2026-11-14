import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupWizard } from '@/app/signup/signup-wizard';
import { AuthShell } from '@/components/auth-shell';
import { getI18n } from '@/lib/i18n/server';
import { LOGIN_PATH } from '@/lib/routes';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Join') };
}

export default async function SignupPage() {
  const { t, tn } = await getI18n();

  return (
    <AuthShell
      tagline={t('Join the club.')}
      subline={t(
        "Registration happens at the gym, after a staff member has checked your workout restrictions. A few details, a reference photo and a password, and you're in.",
      )}
      footer={tn('Already a member? {link}', {
        link: (
          <Link href={LOGIN_PATH} className="font-medium text-primary underline underline-offset-4">
            {t('Sign in')}
          </Link>
        ),
      })}
    >
      <SignupWizard />
    </AuthShell>
  );
}
