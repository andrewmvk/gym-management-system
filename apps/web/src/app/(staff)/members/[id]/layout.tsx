import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Member' };

export default function MemberDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
