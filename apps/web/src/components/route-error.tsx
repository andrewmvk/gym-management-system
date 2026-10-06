'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';

interface RouteErrorProps {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}

export function RouteError({ title, error, reset, homeHref }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageMessage title={title}>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        {homeHref && (
          <Button asChild variant="ghost">
            <Link href={homeHref}>Go to the home page</Link>
          </Button>
        )}
      </div>
    </PageMessage>
  );
}
