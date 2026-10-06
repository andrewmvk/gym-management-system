import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Metrics' };

export default function MetricsLayout({ children }: { children: ReactNode }) {
  return children;
}
