import { useEffect, useState } from 'react';
import { LOADING_UI_DELAY_MS } from '@/components/deferred';

// For loads triggered by changing a parameter (a date, a filter) while a result is already on screen:
// keeps returning the last settled value while the new one loads, so the current view stays put instead
// of being torn down. It switches to the new value as soon as it has loaded, or once the load has lasted
// LOADING_UI_DELAY_MS, which is when the caller's skeleton should take over.
export function useLaggedValue<T>(value: T, isLoading: boolean): T {
  const [settled, setSettled] = useState(value);
  const [isSlow, setIsSlow] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new value restarts the slow-load timer.
  useEffect(() => {
    setIsSlow(false);
    if (!isLoading) return;
    const timer = setTimeout(() => setIsSlow(true), LOADING_UI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, value]);

  const isCurrent = !isLoading || isSlow;

  useEffect(() => {
    if (isCurrent) setSettled(value);
  }, [isCurrent, value]);

  return isCurrent ? value : settled;
}
