'use client';

import type { MuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useState } from 'react';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const VIEWS = [
  { value: 'plan', label: 'This plan' },
  { value: 'recent', label: 'Last 14 days' },
] as const;
type PreviewView = (typeof VIEWS)[number]['value'];

interface PlanMusclePreviewProps {
  planLoad: MuscleLoad;
  recentLoad: MuscleLoad;
  // Muscles the member reported as injured, so a trainer judges the exercises against the body, not a list.
  injured?: ReadonlyMap<MuscleId, string>;
}

function PlanMusclePreviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle balance</CardTitle>
      </CardHeader>
      <CardContent>
        <MuscleLoadView.Skeleton isPaired />
      </CardContent>
    </Card>
  );
}

// Reads from the exercises as the trainer edits them, so a change shows up on the body before it is saved.
function PlanMusclePreviewRoot({ planLoad, recentLoad, injured }: PlanMusclePreviewProps) {
  const [view, setView] = useState<PreviewView>('plan');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle balance</CardTitle>
        <CardDescription>
          Follows the exercises you are editing. Switch to see what this member completed before.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SegmentedFilter
          label="Muscle map source"
          value={view}
          options={VIEWS}
          onChange={setView}
          className="w-full sm:w-fit"
        />
        <MuscleLoadView
          isPaired
          includeUntrained
          load={view === 'plan' ? planLoad : recentLoad}
          injured={injured}
          label={view === 'plan' ? 'Muscles worked in this plan' : 'Muscles this member completed recently'}
          emptyNote={
            view === 'plan' ? 'Nothing in this plan trains a muscle yet.' : 'Nothing completed in the last 14 days.'
          }
        />
      </CardContent>
    </Card>
  );
}

export const PlanMusclePreview = Object.assign(PlanMusclePreviewRoot, { Skeleton: PlanMusclePreviewSkeleton });
