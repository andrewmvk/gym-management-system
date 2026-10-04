import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Access' };

export default function PoliciesLayout({ children }: { children: ReactNode }) {
  return children;
}
