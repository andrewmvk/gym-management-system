'use client';

import { RouteError } from '@/components/route-error';

export default function KioskError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="This check-in panel is not available right now. Please see the front desk."
      error={error}
      reset={reset}
    />
  );
}
