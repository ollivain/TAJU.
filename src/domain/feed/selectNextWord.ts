import type { WordEntry } from "../content/types";
import type { UserWordState } from "../user-state/types";

type WordStates = Record<string, UserWordState>;

const pickRandom = <T>(items: T[], random: () => number): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
};

const seenAt = (word: WordEntry, states: WordStates): number => {
  const lastSeenAt = states[word.id]?.lastSeenAt;
  return lastSeenAt ? Date.parse(lastSeenAt) : 0;
};

export const selectNextWord = (
  words: WordEntry[],
  states: WordStates,
  recentWordIds: string[],
  currentWordId?: string,
  random: () => number = Math.random,
): WordEntry | undefined => {
  const recent = new Set(recentWordIds);
  const eligible = words.filter(
    (word) => word.id !== currentWordId && !states[word.id]?.known,
  );

  const withoutRecent = eligible.filter((word) => !recent.has(word.id));
  const primaryPool = withoutRecent.length > 0 ? withoutRecent : eligible;
  const unseen = primaryPool.filter((word) => !states[word.id]?.seenCount);
  const unseenPick = pickRandom(unseen, random);
  if (unseenPick) return unseenPick;

  const seen = [...primaryPool].sort(
    (left, right) => seenAt(left, states) - seenAt(right, states),
  );
  if (seen.length > 0) {
    const oldestCohort = seen.slice(0, Math.min(5, seen.length));
    return pickRandom(oldestCohort, random);
  }

  const knownFallback = words
    .filter((word) => word.id !== currentWordId)
    .sort((left, right) => seenAt(left, states) - seenAt(right, states));
  return pickRandom(knownFallback.slice(0, Math.min(5, knownFallback.length)), random);
};
