'use client';

import { RouteError } from '@/components/route-error';
import { useI18n } from '@/lib/i18n/i18n-provider';

export default function StaffError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return <RouteError title={t('Something went wrong in the staff app.')} error={error} reset={reset} />;
}
