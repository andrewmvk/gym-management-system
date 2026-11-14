'use client';

import { RouteError } from '@/components/route-error';
import { useI18n } from '@/lib/i18n/i18n-provider';

export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();
  return (
    <RouteError
      title={t('Something went wrong on our side. Try again, or head back home.')}
      error={error}
      reset={retry}
      homeHref="/"
    />
  );
}
