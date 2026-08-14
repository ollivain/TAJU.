import {
  createEmptyUserState,
  type PersistedUserState,
  type UserFactState,
  type UserWordState,
} from "../domain/user-state/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWordState = (value: unknown): value is UserWordState => {
  if (!isRecord(value)) return false;
  return (
    typeof value.wordId === "string" &&
    typeof value.saved === "boolean" &&
    typeof value.known === "boolean" &&
    typeof value.seenCount === "number" &&
    typeof value.updatedAt === "string"
  );
};

const isFactState = (value: unknown): value is UserFactState => {
  if (!isRecord(value)) return false;
  return (
    typeof value.factId === "string" &&
    typeof value.saved === "boolean" &&
    typeof value.known === "boolean" &&
    typeof value.seenCount === "number" &&
    typeof value.updatedAt === "string"
  );
};

const recentIds = (value: unknown, key: string): string[] => {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key].filter((id): id is string => typeof id === "string").slice(-20);
};

export const migrateUserState = (value: unknown): PersistedUserState => {
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2)) {
    return createEmptyUserState();
  }

  const wordsValue = isRecord(value.words) ? value.words : {};
  const words = Object.fromEntries(
    Object.entries(wordsValue).filter(([, wordState]) => isWordState(wordState)),
  ) as Record<string, UserWordState>;

  const factsValue = isRecord(value.facts) ? value.facts : {};
  const facts = Object.fromEntries(
    Object.entries(factsValue).filter(([, factState]) => isFactState(factState)),
  ) as Record<string, UserFactState>;

  const feedValue = isRecord(value.feed) ? value.feed : {};
  const factFeedValue = isRecord(value.factFeed) ? value.factFeed : {};

  return {
    schemaVersion: 2,
    words,
    facts,
    feed: {
      currentWordId:
        typeof feedValue.currentWordId === "string" ? feedValue.currentWordId : undefined,
      recentWordIds: recentIds(feedValue, "recentWordIds"),
    },
    factFeed: {
      currentFactId:
        typeof factFeedValue.currentFactId === "string"
          ? factFeedValue.currentFactId
          : undefined,
      recentFactIds: recentIds(factFeedValue, "recentFactIds"),
    },
  };
};
