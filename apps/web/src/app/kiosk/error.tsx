'use client';

import { RouteError } from '@/components/route-error';
import { useI18n } from '@/lib/i18n/i18n-provider';

export default function KioskError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <RouteError
      title={t('This check-in panel is not available right now. Please see the front desk.')}
      error={error}
      reset={reset}
    />
  );
}
