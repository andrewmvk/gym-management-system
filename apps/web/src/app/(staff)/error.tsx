'use client';

import { RouteError } from '@/components/route-error';

export default function StaffError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError title="Something went wrong in the staff app." error={error} reset={reset} />;
}
