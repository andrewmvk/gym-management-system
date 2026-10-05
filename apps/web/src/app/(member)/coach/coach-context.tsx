'use client';

import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

// What the member pointed at in the app. The name is only for display; the coach receives the id.
export type MentionChip = { type: 'exercise'; exerciseId: string; name: string } | { type: 'muscle'; muscle: MuscleId };

export function mentionKey(chip: MentionChip): string {
  return chip.type === 'exercise' ? `exercise:${chip.exerciseId}` : `muscle:${chip.muscle}`;
}

// An exercise picked on the plan screen: the coach bar offers to talk about it.
export interface ExerciseSelection {
  exerciseId: string;
  name: string;
}

// A question handed to the coach from somewhere else in the app. With a message it is sent at once;
// without one the chips wait in the composer for the member to type.
export interface CoachRequest {
  id: string;
  mentions: MentionChip[];
  message?: string;
}

interface CoachContextValue {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  mentions: MentionChip[];
  addMention: (chip: MentionChip) => void;
  removeMention: (key: string) => void;
  clearMentions: () => void;
  ask: (input: { mentions: MentionChip[]; message?: string }) => void;
  request: CoachRequest | null;
  consumeRequest: (id: string) => void;
  selection: ExerciseSelection | null;
  setSelection: (selection: ExerciseSelection | null) => void;
}

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mentions, setMentions] = useState<MentionChip[]>([]);
  const [request, setRequest] = useState<CoachRequest | null>(null);
  const [selection, setSelection] = useState<ExerciseSelection | null>(null);

  const addMention = useCallback((chip: MentionChip) => {
    setMentions((current) =>
      current.some((entry) => mentionKey(entry) === mentionKey(chip)) ? current : [...current, chip],
    );
  }, []);
  const removeMention = useCallback((key: string) => {
    setMentions((current) => current.filter((entry) => mentionKey(entry) !== key));
  }, []);
  const clearMentions = useCallback(() => setMentions([]), []);
  const ask = useCallback((input: { mentions: MentionChip[]; message?: string }) => {
    setIsOpen(true);
    setRequest({ id: crypto.randomUUID(), ...input });
  }, []);
  const consumeRequest = useCallback((id: string) => {
    setRequest((current) => (current?.id === id ? null : current));
  }, []);

  const value = useMemo<CoachContextValue>(
    () => ({
      isOpen,
      setIsOpen,
      mentions,
      addMention,
      removeMention,
      clearMentions,
      ask,
      request,
      consumeRequest,
      selection,
      setSelection,
    }),
    [isOpen, mentions, addMention, removeMention, clearMentions, ask, request, consumeRequest, selection],
  );

  return <CoachContext value={value}>{children}</CoachContext>;
}

export function useCoach() {
  const value = use(CoachContext);
  if (!value) throw new Error('useCoach needs a CoachProvider above it');
  return value;
}
