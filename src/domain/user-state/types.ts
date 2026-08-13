export interface UserWordState {
  wordId: string;
  saved: boolean;
  known: boolean;
  seenCount: number;
  lastSeenAt?: string;
  savedAt?: string;
  knownAt?: string;
  updatedAt: string;
}

export interface PersistedUserState {
  schemaVersion: 1;
  words: Record<string, UserWordState>;
  feed: {
    currentWordId?: string;
    recentWordIds: string[];
  };
}

export const createEmptyUserState = (): PersistedUserState => ({
  schemaVersion: 1,
  words: {},
  feed: { recentWordIds: [] },
});

export const getWordState = (
  state: PersistedUserState,
  wordId: string,
): UserWordState | undefined => state.words[wordId];
