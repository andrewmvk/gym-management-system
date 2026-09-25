'use client';

import { useEffect } from 'react';
import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';

interface RouteErrorProps {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ title, error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageMessage title={title}>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </PageMessage>
  );
}
