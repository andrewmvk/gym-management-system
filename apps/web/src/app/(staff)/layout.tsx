import { AppHeader } from '@/components/app-header';
import { AuthGuard } from '@/components/auth-guard';

export default function StaffLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppHeader area="Staff" />
      <AuthGuard action="read" subject="StaffApp">
        <div className="flex flex-1 flex-col">{children}</div>
      </AuthGuard>
    </>
  );
}
