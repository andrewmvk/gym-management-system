import { countChanges, diffDraft } from '@cadence/shared/schemas/coach-draft';
import { PanelRightOpenIcon } from 'lucide-react';
import type { CoachDraftApi } from '@/app/(member)/coach/use-coach-draft';
import { Button } from '@/components/ui/button';
import { formatPlanDate } from '@/lib/format';

// A draft the member has not got open: it stays one tap away above the composer, so a proposal that arrived
// while the chat covered the screen, or an exercise added from a picker, is never lost from view.
export function DraftBar({ api }: { api: CoachDraftApi }) {
  const { openDraft } = api;
  if (!openDraft || api.isPanelOpen) return null;

  const changeCount = countChanges(diffDraft(openDraft.before, openDraft.rows));

  return (
    <div className="flex items-center justify-between gap-3 border-t bg-accent/60 px-4 py-2 text-accent-foreground">
      <p className="min-w-0 text-sm font-semibold text-pretty">
        Draft for {formatPlanDate(openDraft.date, { day: 'numeric', month: 'short' })}
        <span className="numerals pl-2 text-lg font-bold">{changeCount}</span>
        <span className="pl-1 font-normal">{changeCount === 1 ? 'change' : 'changes'}</span>
      </p>
      <Button type="button" size="sm" variant="outline" onClick={() => api.setIsPanelOpen(true)}>
        <PanelRightOpenIcon data-icon="inline-start" />
        Review and apply
      </Button>
    </div>
  );
}
