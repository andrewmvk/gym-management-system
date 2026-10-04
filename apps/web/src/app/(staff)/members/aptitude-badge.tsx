import { Badge } from '@/components/ui/badge';

export function AptitudeBadge({ status }: { status: 'pending' | 'cleared' | 'rejected' | null }) {
  if (status === 'cleared') return <Badge variant="live">Cleared</Badge>;
  if (status === 'rejected') return <Badge variant="negative">Rejected</Badge>;
  return <Badge variant="pending">Pending</Badge>;
}
