import { useState } from 'react';

// The queues and catalog come back whole from the API, so paging happens on the client.
export function usePagination<T>(items: readonly T[], pageSize: number) {
  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * pageSize;

  return {
    page,
    pageCount,
    pageSize,
    total: items.length,
    pageItems: items.slice(start, start + pageSize),
    setPage,
  };
}
