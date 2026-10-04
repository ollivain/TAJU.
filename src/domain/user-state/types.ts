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
  schemaVersion: 3;
  words: Record<string, UserWordState>;
  facts: Record<string, UserFactState>;
  savedConcepts: string[];
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
  schemaVersion: 3,
  words: {},
  facts: {},
  savedConcepts: [],
  feed: { recentWordIds: [] },
  factFeed: { recentFactIds: [] },
});

export const getWordState = (
  state: PersistedUserState,
  wordId: string,
): UserWordState | undefined => state.words[wordId];
