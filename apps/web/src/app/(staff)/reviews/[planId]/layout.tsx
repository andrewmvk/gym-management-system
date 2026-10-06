import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Plan review' };

export default function PlanReviewLayout({ children }: { children: ReactNode }) {
  return children;
}
