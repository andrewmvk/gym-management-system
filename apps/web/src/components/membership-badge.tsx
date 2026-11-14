'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-provider';

interface MembershipBadgeProps {
  plan: string;
  status: 'active' | 'inactive' | null;
  className?: string;
}

// Inactive is a plain fact about the account, not something deleted, so it gets the neutral badge and no strikethrough.
export function MembershipBadge({ plan, status, className }: MembershipBadgeProps) {
  const { t, tx } = useI18n();
  const isActive = status === 'active';
  return (
    <Badge variant={isActive ? 'live' : 'secondary'} className={className}>
      {tx(plan)} · {isActive ? t('Active') : t('Inactive')}
    </Badge>
  );
}
