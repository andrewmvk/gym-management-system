export const STATUS_FILTERS = ['all', 'must_review', 'ai_published', 'trainer_edited'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const WHEN_FILTERS = ['upcoming', 'past', 'all'] as const;
export type WhenFilter = (typeof WHEN_FILTERS)[number];

export const WHEN_LABELS: Record<WhenFilter, string> = {
  upcoming: 'Today and later',
  past: 'Past',
  all: 'All dates',
};

// A link without a `when` parameter is "auto": the scope depends on the status tab. The Overview counts trainer
// activity over the last 7 days, and the plans it touched are often dated in the past, so the trainer tab opens
// on every date; every other tab opens on today and later. Picking an option writes it explicitly, so the
// control always shows the scope the list really uses.
export const WHEN_PARAMS = ['auto', ...WHEN_FILTERS] as const;
export type WhenParam = (typeof WHEN_PARAMS)[number];

export function resolveWhen(param: WhenParam, status: StatusFilter): WhenFilter {
  if (param !== 'auto') return param;
  return status === 'trainer_edited' ? 'all' : 'upcoming';
}

interface QueueEntryLike {
  planDate: string;
  status: 'ai_published' | 'trainer_edited';
  noteCount: number;
  needsReview: boolean;
  memberName: string;
}

// The queue's filters as a query string, so a plan opened from the queue can walk the same list.
export function queueSearch({ status, q, when }: { status: StatusFilter; q: string; when: WhenParam }) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q.trim()) params.set('q', q);
  if (when !== 'auto') params.set('when', when);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function matchesStatus(entry: QueueEntryLike, status: StatusFilter) {
  if (status === 'all') return true;
  if (status === 'must_review') return entry.needsReview;
  // The trainer tab holds every plan a trainer touched, by an edit or a note; AI holds the rest.
  const hasTrainerActivity = entry.status === 'trainer_edited' || entry.noteCount > 0;
  return status === 'trainer_edited' ? hasTrainerActivity : !hasTrainerActivity;
}

export function matchesWhen(entry: QueueEntryLike, when: WhenFilter, today: string) {
  if (when === 'all') return true;
  return when === 'upcoming' ? entry.planDate >= today : entry.planDate < today;
}

interface QueueFilters {
  status: StatusFilter;
  when: WhenFilter;
  term: string;
  today: string;
}

// The one place that decides which plans the queue lists and in which order, so the plan page's Previous and
// Next walk exactly the list the queue shows. The sort is stable, so inside the must-review group and the rest
// the queue keeps the order the server gave it.
export function filterQueue<T extends QueueEntryLike>(
  entries: readonly T[],
  { status, when, term, today }: QueueFilters,
) {
  const needle = term.trim().toLowerCase();
  return entries
    .filter(
      (entry) =>
        matchesStatus(entry, status) &&
        matchesWhen(entry, when, today) &&
        (!needle || entry.memberName.toLowerCase().includes(needle)),
    )
    .sort((a, b) => Number(b.needsReview) - Number(a.needsReview));
}
