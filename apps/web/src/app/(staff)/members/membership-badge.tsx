'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-provider';

// Inactive is a setting staff can flip, not a settled negative, so it is the quiet Secondary badge and
// never the struck "out of service" form.
export function MembershipBadge({ status }: { status: 'active' | 'inactive' | null }) {
  const { t } = useI18n();
  if (status === 'active') return <Badge variant="live">{t('membership::Active')}</Badge>;
  if (status === 'inactive') return <Badge variant="secondary">{t('membership::Inactive')}</Badge>;
  return <Badge variant="pending">{t('membership::None')}</Badge>;
}
