import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Opening hours' };

export default function OpeningHoursLayout({ children }: { children: ReactNode }) {
  return children;
}
