import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Members' };

export default function MembersLayout({ children }: { children: ReactNode }) {
  return children;
}
