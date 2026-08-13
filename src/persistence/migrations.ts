import {
  createEmptyUserState,
  type PersistedUserState,
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

export const migrateUserState = (value: unknown): PersistedUserState => {
  if (!isRecord(value) || value.schemaVersion !== 1) return createEmptyUserState();

  const wordsValue = isRecord(value.words) ? value.words : {};
  const words = Object.fromEntries(
    Object.entries(wordsValue).filter(([, wordState]) => isWordState(wordState)),
  ) as Record<string, UserWordState>;

  const feedValue = isRecord(value.feed) ? value.feed : {};
  const recentWordIds = Array.isArray(feedValue.recentWordIds)
    ? feedValue.recentWordIds.filter((id): id is string => typeof id === "string").slice(-20)
    : [];

  return {
    schemaVersion: 1,
    words,
    feed: {
      currentWordId:
        typeof feedValue.currentWordId === "string" ? feedValue.currentWordId : undefined,
      recentWordIds,
    },
  };
};
