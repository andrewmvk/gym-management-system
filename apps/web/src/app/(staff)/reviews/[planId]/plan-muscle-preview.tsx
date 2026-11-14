'use client';

import type { MuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useState } from 'react';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/i18n-provider';
import type { LabelKey } from '@/lib/i18n/translate';

const VIEWS = [
  { value: 'plan', label: 'This plan' },
  { value: 'recent', label: 'Last 14 days' },
] as const satisfies readonly { value: string; label: LabelKey }[];
type PreviewView = (typeof VIEWS)[number]['value'];

interface PlanMusclePreviewProps {
  planLoad: MuscleLoad;
  recentLoad: MuscleLoad;
  // Muscles the member reported as injured, so a trainer judges the exercises against the body, not a list.
  injured?: ReadonlyMap<MuscleId, string>;
}

function PlanMusclePreviewSkeleton() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Muscle balance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <MuscleLoadView.Skeleton isPaired />
      </CardContent>
    </Card>
  );
}

// Reads from the exercises as the trainer edits them, so a change shows up on the body before it is saved.
function PlanMusclePreviewRoot({ planLoad, recentLoad, injured }: PlanMusclePreviewProps) {
  const { t } = useI18n();
  const [view, setView] = useState<PreviewView>('plan');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Muscle balance')}</CardTitle>
        <CardDescription>
          {t('Follows the exercises you are editing. Switch to see what this member completed before.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SegmentedFilter
          label={t('Muscle map source')}
          value={view}
          options={VIEWS.map((option) => ({ value: option.value, label: t(option.label) }))}
          onChange={setView}
          className="w-full sm:w-fit"
        />
        <MuscleLoadView
          isPaired
          includeUntrained
          load={view === 'plan' ? planLoad : recentLoad}
          injured={injured}
          label={view === 'plan' ? t('Muscles worked in this plan') : t('Muscles this member completed recently')}
          emptyNote={
            view === 'plan'
              ? t('Nothing in this plan trains a muscle yet.')
              : t('Nothing completed in the last 14 days.')
          }
        />
      </CardContent>
    </Card>
  );
}

export const PlanMusclePreview = Object.assign(PlanMusclePreviewRoot, { Skeleton: PlanMusclePreviewSkeleton });
