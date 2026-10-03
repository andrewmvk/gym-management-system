'use client';

import type { MuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import { type MemberMuscleFocus, MUSCLE_IDS, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useState } from 'react';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { focusToMap } from '@/components/muscle-map/muscle-marks';
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
  focus: readonly MemberMuscleFocus[];
}

function PlanMusclePreviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle balance</CardTitle>
      </CardHeader>
      <CardContent>
        <MuscleLoadView.Skeleton isSingleView />
      </CardContent>
    </Card>
  );
}

// Reads from the exercises as the trainer edits them, so a change shows up on the body before it is saved.
function PlanMusclePreviewRoot({ planLoad, recentLoad, focus }: PlanMusclePreviewProps) {
  const [view, setView] = useState<PreviewView>('plan');

  // Muscles the member asked for more of that this plan does not train at all.
  const missed = MUSCLE_IDS.filter(
    (muscle) => !planLoad[muscle] && focus.some((entry) => entry.muscle === muscle && entry.bias > 0),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle balance</CardTitle>
        <CardDescription>
          Follows the exercises you are editing. Switch to see what this member completed before.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SegmentedFilter label="Muscle map source" value={view} options={VIEWS} onChange={setView} className="w-full" />
        {missed.length > 0 && (
          <p role="status" className="text-sm text-pretty">
            <span className="font-semibold">Asked for more, not in this plan: </span>
            {missed.map(muscleLabel).join(', ')}.
          </p>
        )}
        <MuscleLoadView
          isSingleView
          includeUntrained
          load={view === 'plan' ? planLoad : recentLoad}
          focus={focusToMap(focus)}
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
