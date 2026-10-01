'use client';

import { createContext, type ReactNode, use, useEffect, useState } from 'react';

export const LOADING_UI_DELAY_MS = 200;

const RevealedContext = createContext(false);

// Most loads finish within a few frames. Rendering a skeleton for those only to swap it out
// immediately makes the layout blink, so loading UI renders nothing until the load has lasted
// LOADING_UI_DELAY_MS. It mounts when loading starts and unmounts when the data lands, so the timer
// measures exactly that. Inside an already revealed Deferred it renders at once, so nested skeletons
// (a page skeleton built from component skeletons) don't stack their delays.
export function Deferred({ children }: { children: ReactNode }) {
  const isInsideRevealed = use(RevealedContext);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (isInsideRevealed) return;
    const timer = setTimeout(() => setIsRevealed(true), LOADING_UI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isInsideRevealed]);

  if (isInsideRevealed) return children;
  if (!isRevealed) return null;
  return <RevealedContext value={true}>{children}</RevealedContext>;
}
