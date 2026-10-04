import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Turnstile' };

export default function TurnstileSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
