'use client';

import type { MuscleGroupId, MuscleId } from '@cadence/shared/schemas/muscles';
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

// Everything the member can point the coach at. The name is only for display; the coach receives the id.
export type MentionChip =
  | { type: 'exercise'; exerciseId: string; name: string }
  | { type: 'muscle'; muscle: MuscleId }
  | { type: 'group'; group: MuscleGroupId }
  | { type: 'distribution' };

export function mentionKey(chip: MentionChip): string {
  switch (chip.type) {
    case 'exercise':
      return `exercise:${chip.exerciseId}`;
    case 'muscle':
      return `muscle:${chip.muscle}`;
    case 'group':
      return `group:${chip.group}`;
    case 'distribution':
      return 'distribution';
  }
}

interface CoachContextValue {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  mentions: MentionChip[];
  addMention: (chip: MentionChip) => void;
  removeMention: (key: string) => void;
  toggleMention: (chip: MentionChip) => void;
  clearMentions: () => void;
  // Pointing mode: the chat steps aside, everything on the page the coach can be asked about lights up, and a
  // tap on it adds it to the message. It only exists on a screen that has something to point at.
  isPointing: boolean;
  canPoint: boolean;
  startPointing: () => void;
  stopPointing: () => void;
  // A screen calls this while it shows things the member can point at, and the returned function when it goes.
  registerTargets: () => () => void;
  // The day of the plan the member has on screen (YYYY-MM-DD), or null when no plan that can still be done is
  // shown. The coach reads the plan, the pointed-at exercises and the muscle distribution against this day.
  viewedDate: string | null;
  setViewedDate: (date: string | null) => void;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mentions, setMentions] = useState<MentionChip[]>([]);
  const [isPointing, setIsPointing] = useState(false);
  const [targetScreens, setTargetScreens] = useState(0);
  const [viewedDate, setViewedDate] = useState<string | null>(null);

  const addMention = useCallback((chip: MentionChip) => {
    setMentions((current) =>
      current.some((entry) => mentionKey(entry) === mentionKey(chip)) ? current : [...current, chip],
    );
  }, []);
  const removeMention = useCallback((key: string) => {
    setMentions((current) => current.filter((entry) => mentionKey(entry) !== key));
  }, []);
  const toggleMention = useCallback((chip: MentionChip) => {
    const key = mentionKey(chip);
    setMentions((current) =>
      current.some((entry) => mentionKey(entry) === key)
        ? current.filter((entry) => mentionKey(entry) !== key)
        : [...current, chip],
    );
  }, []);
  const clearMentions = useCallback(() => setMentions([]), []);

  const startPointing = useCallback(() => {
    setIsOpen(false);
    setIsPointing(true);
  }, []);
  const stopPointing = useCallback(() => {
    setIsPointing(false);
    setIsOpen(true);
  }, []);
  const registerTargets = useCallback(() => {
    setTargetScreens((count) => count + 1);
    return () => {
      setTargetScreens((count) => count - 1);
      setIsPointing(false);
    };
  }, []);

  const canPoint = targetScreens > 0;
  const value = useMemo<CoachContextValue>(
    () => ({
      isOpen,
      setIsOpen,
      mentions,
      addMention,
      removeMention,
      toggleMention,
      clearMentions,
      isPointing,
      canPoint,
      startPointing,
      stopPointing,
      registerTargets,
      viewedDate,
      setViewedDate,
    }),
    [
      isOpen,
      mentions,
      addMention,
      removeMention,
      toggleMention,
      clearMentions,
      isPointing,
      canPoint,
      startPointing,
      stopPointing,
      registerTargets,
      viewedDate,
    ],
  );

  return <CoachContext value={value}>{children}</CoachContext>;
}

export function useCoach() {
  const value = use(CoachContext);
  if (!value) throw new Error('useCoach needs a CoachProvider above it');
  return value;
}
