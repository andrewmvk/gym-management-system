'use client';

import {
  queueSearch,
  resolveWhen,
  STATUS_FILTERS,
  type StatusFilter,
  WHEN_PARAMS,
  type WhenParam,
} from '@/app/(staff)/reviews/queue-filter';
import { oneOf, useUrlState } from '@/hooks/use-url-state';

// The queue's filters as the URL holds them. The plan page reads the same parameters, so its Previous and Next
// links walk the list the queue was showing.
export function useQueueFilters() {
  const [status] = useUrlState<StatusFilter>('status', 'all', oneOf(STATUS_FILTERS));
  const [whenParam] = useUrlState<WhenParam>('when', 'auto', oneOf(WHEN_PARAMS));
  const [term] = useUrlState<string>('q', '');
  return {
    status,
    term,
    when: resolveWhen(whenParam, status),
    search: queueSearch({ status, q: term, when: whenParam }),
  };
}
