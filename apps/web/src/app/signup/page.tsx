import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupWizard } from '@/app/signup/signup-wizard';
import { AuthShell } from '@/components/auth-shell';
import { LOGIN_PATH } from '@/lib/routes';

export const metadata: Metadata = { title: 'Join' };

export default function SignupPage() {
  return (
    <AuthShell
      tagline="Join the club."
      subline="Registration happens at the gym, after a staff member has checked your workout restrictions. A few details, a reference photo and a password, and you're in."
      footer={
        <>
          Already a member?{' '}
          <Link href={LOGIN_PATH} className="font-medium text-primary underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <SignupWizard />
    </AuthShell>
  );
}
