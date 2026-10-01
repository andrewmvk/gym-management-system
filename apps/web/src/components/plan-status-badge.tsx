import { PencilLineIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function PlanStatusBadge({ status }: { status: 'ai_published' | 'trainer_edited' }) {
  return status === 'trainer_edited' ? (
    <Badge variant="tape">
      <PencilLineIcon data-icon="inline-start" />
      Trainer edited
    </Badge>
  ) : (
    <Badge variant="outline">
      <SparklesIcon data-icon="inline-start" />
      AI published
    </Badge>
  );
}
