import { AppHeader } from '@/components/app-header';
import { AuthGuard } from '@/components/auth-guard';
import { GuardedContent } from '@/components/guarded-content';
import { OnboardingGate } from '@/components/onboarding-gate';
import { ChatPanel } from './chat-panel';

export default function MemberLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppHeader area="Member" />
      <AuthGuard action="read" subject="MemberApp">
        {/* FR-25: the chat is available "at any time," so it sits outside OnboardingGate rather than
            waiting for onboarding to complete like the rest of the member app. GuardedContent keeps it
            unmounted (not just hidden) until the session is ready, since it reads useAppAbility(). */}
        <GuardedContent skeleton={null}>
          <ChatPanel />
        </GuardedContent>
        <OnboardingGate>
          <div className="flex flex-1 flex-col">{children}</div>
        </OnboardingGate>
      </AuthGuard>
    </>
  );
}
