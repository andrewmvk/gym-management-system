'use client';

import { MessageSquareIcon, PencilLineIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/i18n-provider';

interface PlanStatusBadgeProps {
  status: 'ai_published' | 'trainer_edited';
  // A trainer left a note but did not change the exercises.
  hasNote?: boolean;
}

export function PlanStatusBadge({ status, hasNote }: PlanStatusBadgeProps) {
  const { t } = useI18n();

  if (status === 'trainer_edited') {
    return (
      <Badge variant="tape">
        <PencilLineIcon data-icon="inline-start" />
        {t('Trainer edited')}
      </Badge>
    );
  }
  if (hasNote) {
    return (
      <Badge variant="secondary">
        <MessageSquareIcon data-icon="inline-start" />
        {t('Trainer note')}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <SparklesIcon data-icon="inline-start" />
      {t('AI published')}
    </Badge>
  );
}
