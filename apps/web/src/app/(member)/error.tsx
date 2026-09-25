'use client';

import { RouteError } from '@/components/route-error';

export default function MemberError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError title="Something went wrong in the member app." error={error} reset={reset} />;
}
