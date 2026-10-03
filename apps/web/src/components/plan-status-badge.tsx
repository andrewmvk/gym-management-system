import { MessageSquareIcon, PencilLineIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanStatusBadgeProps {
  status: 'ai_published' | 'trainer_edited';
  // A trainer left a note but did not change the exercises.
  hasNote?: boolean;
}

export function PlanStatusBadge({ status, hasNote }: PlanStatusBadgeProps) {
  if (status === 'trainer_edited') {
    return (
      <Badge variant="tape">
        <PencilLineIcon data-icon="inline-start" />
        Trainer edited
      </Badge>
    );
  }
  if (hasNote) {
    return (
      <Badge variant="secondary">
        <MessageSquareIcon data-icon="inline-start" />
        Trainer note
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <SparklesIcon data-icon="inline-start" />
      AI published
    </Badge>
  );
}
