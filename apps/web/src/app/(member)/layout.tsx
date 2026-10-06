import { CoachProvider } from '@/app/(member)/coach/coach-context';
import { CoachPanel } from '@/app/(member)/coach/coach-panel';
import { AppHeader } from '@/components/app-header';
import { AuthGuard } from '@/components/auth-guard';
import { GuardedContent } from '@/components/guarded-content';
import { OnboardingGate } from '@/components/onboarding-gate';

export default function MemberLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppHeader area="member" />
      <AuthGuard action="read" subject="MemberApp">
        <CoachProvider>
          {/* FR-25: the chat is available "at any time," so it sits outside OnboardingGate rather than
              waiting for onboarding to complete like the rest of the member app. GuardedContent keeps it
              unmounted (not just hidden) until the session is ready, since it reads useAppAbility(). */}
          <GuardedContent skeleton={null}>
            <CoachPanel />
          </GuardedContent>
          <OnboardingGate>
            <div className="flex flex-1 flex-col">{children}</div>
          </OnboardingGate>
        </CoachProvider>
      </AuthGuard>
    </>
  );
}
