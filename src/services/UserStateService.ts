import type { PersistedUserState, UserWordState } from "../domain/user-state/types";

const existingOrDefault = (
  state: PersistedUserState,
  wordId: string,
  now: string,
): UserWordState =>
  state.words[wordId] ?? {
    wordId,
    saved: false,
    known: false,
    seenCount: 0,
    updatedAt: now,
  };

export const toggleSaved = (
  state: PersistedUserState,
  wordId: string,
  now: string,
): PersistedUserState => {
  const current = existingOrDefault(state, wordId, now);
  const saved = !current.saved;
  return {
    ...state,
    words: {
      ...state.words,
      [wordId]: {
        ...current,
        saved,
        savedAt: saved ? now : undefined,
        updatedAt: now,
      },
    },
  };
};

export const setKnown = (
  state: PersistedUserState,
  wordId: string,
  known: boolean,
  now: string,
): PersistedUserState => {
  const current = existingOrDefault(state, wordId, now);
  return {
    ...state,
    words: {
      ...state.words,
      [wordId]: {
        ...current,
        known,
        knownAt: known ? now : undefined,
        updatedAt: now,
      },
    },
  };
};

export const advanceFeed = (
  state: PersistedUserState,
  currentWordId: string,
  nextWordId: string | undefined,
  now: string,
): PersistedUserState => {
  const current = existingOrDefault(state, currentWordId, now);
  const recentWordIds = [
    ...state.feed.recentWordIds.filter((id) => id !== currentWordId),
    currentWordId,
  ].slice(-20);

  return {
    ...state,
    words: {
      ...state.words,
      [currentWordId]: {
        ...current,
        seenCount: current.seenCount + 1,
        lastSeenAt: now,
        updatedAt: now,
      },
    },
    feed: { currentWordId: nextWordId, recentWordIds },
  };
};

export const setCurrentWord = (
  state: PersistedUserState,
  wordId: string,
): PersistedUserState => ({
  ...state,
  feed: { ...state.feed, currentWordId: wordId },
});
