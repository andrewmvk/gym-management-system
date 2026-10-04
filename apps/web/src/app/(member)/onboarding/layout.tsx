import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Health profile' };

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
