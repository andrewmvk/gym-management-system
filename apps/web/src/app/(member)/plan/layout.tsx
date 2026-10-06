import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Plan' };

export default function PlanLayout({ children }: { children: ReactNode }) {
  return children;
}
