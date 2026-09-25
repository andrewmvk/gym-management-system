import { AppHeader } from '@/components/app-header';
import { AuthGuard } from '@/components/auth-guard';

export default function MemberLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppHeader area="Member" />
      <AuthGuard action="read" subject="MemberApp">
        <div className="flex flex-1 flex-col">{children}</div>
      </AuthGuard>
    </>
  );
}
