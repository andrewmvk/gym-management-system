// The kiosk is a separate, less-trusted surface: no user session, no AuthGuard (docs/04-architecture.md §5).
export default function KioskLayout({ children }: LayoutProps<'/kiosk'>) {
  return <div className="flex flex-1 flex-col bg-background">{children}</div>;
}
