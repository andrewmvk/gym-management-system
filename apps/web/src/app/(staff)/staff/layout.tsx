import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Overview' };

export default function StaffOverviewLayout({ children }: { children: ReactNode }) {
  return children;
}
