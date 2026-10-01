import { CheckIcon, RotateCwIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AptitudeResultBadgeProps {
  result: 'cleared' | 'not_cleared' | 'pending_retry';
  source: 'AI' | 'Admin';
}

// pending_retry is a technical failure, so it gets the dashed retry form, never the solid "not cleared" one.
export function AptitudeResultBadge({ result, source }: AptitudeResultBadgeProps) {
  if (result === 'cleared') {
    return (
      <Badge variant="live">
        <CheckIcon data-icon="inline-start" />
        {source}: cleared
      </Badge>
    );
  }
  if (result === 'not_cleared') {
    return (
      <Badge variant="negative">
        <XIcon data-icon="inline-start" />
        {source}: not cleared
      </Badge>
    );
  }
  return (
    <Badge variant="retry">
      <RotateCwIcon data-icon="inline-start" />
      {source}: couldn&apos;t evaluate
    </Badge>
  );
}
