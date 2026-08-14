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

export interface UserFactState {
  factId: string;
  saved: boolean;
  known: boolean;
  seenCount: number;
  lastSeenAt?: string;
  savedAt?: string;
  knownAt?: string;
  updatedAt: string;
}

export interface PersistedUserState {
  schemaVersion: 2;
  words: Record<string, UserWordState>;
  facts: Record<string, UserFactState>;
  feed: {
    currentWordId?: string;
    recentWordIds: string[];
  };
  factFeed: {
    currentFactId?: string;
    recentFactIds: string[];
  };
}

export const createEmptyUserState = (): PersistedUserState => ({
  schemaVersion: 2,
  words: {},
  facts: {},
  feed: { recentWordIds: [] },
  factFeed: { recentFactIds: [] },
});

export const getWordState = (
  state: PersistedUserState,
  wordId: string,
): UserWordState | undefined => state.words[wordId];
