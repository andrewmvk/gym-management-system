'use client';

import { useQuery } from '@tanstack/react-query';
import { PanelSection } from '@/components/panel-section';
import { Badge } from '@/components/ui/badge';
import { useTRPC } from '@/lib/trpc';

// Only exists when a trainer changed today's plan: no placeholder when nothing happened.
export function SinceLastVisit() {
  const trpc = useTRPC();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());
  const plan = todayQuery.data;

  if (plan?.status !== 'trainer_edited' || !plan.lastEditedAt) return null;

  const time = new Date(plan.lastEditedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <PanelSection title="Since your last visit">
      <div className="flex flex-col items-start gap-2 px-5 py-4 sm:px-6">
        <Badge variant="tape">Trainer edited</Badge>
        <p className="text-sm text-pretty">
          <span className="font-semibold">{plan.lastEditedByName ?? 'A trainer'}</span> edited today&apos;s plan at{' '}
          <span className="numerals text-base font-semibold">{time}</span>.
        </p>
      </div>
    </PanelSection>
  );
}
