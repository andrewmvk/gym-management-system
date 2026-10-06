import { Badge } from '@/components/ui/badge';

// Inactive is a setting staff can flip, not a settled negative, so it is the quiet Secondary badge and
// never the struck "out of service" form.
export function MembershipBadge({ status }: { status: 'active' | 'inactive' | null }) {
  if (status === 'active') return <Badge variant="live">Active</Badge>;
  if (status === 'inactive') return <Badge variant="secondary">Inactive</Badge>;
  return <Badge variant="pending">None</Badge>;
}
