import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Check-ins' };

export default function CheckInsLayout({ children }: { children: ReactNode }) {
  return children;
}
