'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

export function oneOf<const T extends readonly string[]>(values: T) {
  return (raw: string): raw is T[number] => values.includes(raw);
}

// The value is also kept in local state so a controlled input never waits on the router; the URL is only read once, on mount.
// replaceState rather than pushState: a filter change shouldn't add a back-button stop. Next.js syncs it into useSearchParams.
export function useUrlState<T extends string>(key: string, defaultValue: T, isValid?: (raw: string) => raw is T) {
  const raw = useSearchParams().get(key);
  const [value, setValue] = useState<T>(raw !== null && (!isValid || isValid(raw)) ? (raw as T) : defaultValue);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      const params = new URLSearchParams(window.location.search);
      if (next === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, next);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
      );
    },
    [key, defaultValue],
  );

  return [value, update] as const;
}
