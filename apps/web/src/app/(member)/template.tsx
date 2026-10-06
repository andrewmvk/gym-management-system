import type { ReactNode } from 'react';

// A template remounts on every move between pages, so the new page settles in instead of cutting. The header
// and the coach sit in the layout and stay put.
export default function MemberTemplate({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col animate-page-in">{children}</div>;
}
