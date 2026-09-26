import { AppHeader } from '@/components/app-header';
import { AuthGuard } from '@/components/auth-guard';
import { OnboardingGate } from '@/components/onboarding-gate';

export default function MemberLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppHeader area="Member" />
      <AuthGuard action="read" subject="MemberApp">
        <OnboardingGate>
          <div className="flex flex-1 flex-col">{children}</div>
        </OnboardingGate>
      </AuthGuard>
    </>
  );
}
