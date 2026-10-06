import type { ReactNode } from 'react';

// A template remounts on every move between pages, so the new page settles in instead of cutting. The header
// sits in the layout and stays put.
export default function StaffTemplate({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col animate-page-in">{children}</div>;
}
