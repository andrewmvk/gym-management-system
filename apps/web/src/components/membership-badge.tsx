import { Badge } from '@/components/ui/badge';

interface MembershipBadgeProps {
  plan: string;
  status: 'active' | 'inactive' | null;
  className?: string;
}

// Inactive is a plain fact about the account, not something deleted, so it gets the neutral badge and no strikethrough.
export function MembershipBadge({ plan, status, className }: MembershipBadgeProps) {
  const isActive = status === 'active';
  return (
    <Badge variant={isActive ? 'live' : 'secondary'} className={className}>
      {plan} · {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
