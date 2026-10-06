'use client';

import { useQuery } from '@tanstack/react-query';
import { TrainerNotes } from '@/app/(member)/plan/trainer-notes';
import { PanelSection } from '@/components/panel-section';
import { useTRPC } from '@/lib/trpc';

// Only exists when a trainer wrote a note or changed today's plan: no placeholder when nothing happened.
// A note without an edit changes nothing in the list, so the title says which of the two it is.
export function TrainerChangeNotice() {
  const trpc = useTRPC();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());
  const plan = todayQuery.data;

  if (!plan || plan.trainerNotes.length === 0) return null;

  const wasEdited = plan.status === 'trainer_edited';

  return (
    <PanelSection
      title={wasEdited ? 'Your trainer changed this plan' : 'A note from your trainer'}
      description={wasEdited ? 'Your list already includes the change.' : undefined}
    >
      <TrainerNotes notes={plan.trainerNotes} className="px-5 py-4 sm:px-6" />
    </PanelSection>
  );
}
