'use client';

import { RouteError } from '@/components/route-error';

export default function KioskError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError title="The check-in panel hit a problem." error={error} reset={reset} />;
}
