'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-provider';

interface RouteErrorProps {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}

export function RouteError({ title, error, reset, homeHref }: RouteErrorProps) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageMessage title={title}>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={reset}>
          {t('Try again')}
        </Button>
        {homeHref && (
          <Button asChild variant="ghost">
            <Link href={homeHref}>{t('Go to the home page')}</Link>
          </Button>
        )}
      </div>
    </PageMessage>
  );
}
