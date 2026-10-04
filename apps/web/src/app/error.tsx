'use client';

import { RouteError } from '@/components/route-error';

export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      title="Something went wrong on our side. Try again, or head back home."
      error={error}
      reset={retry}
      homeHref="/"
    />
  );
}
