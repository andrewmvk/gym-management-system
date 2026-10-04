import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Gym info' };

export default function GymLayout({ children }: { children: ReactNode }) {
  return children;
}
