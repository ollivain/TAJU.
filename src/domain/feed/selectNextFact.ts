import type { FactEntry } from "../content/types";
import type { UserFactState } from "../user-state/types";

type FactStates = Record<string, UserFactState>;

const pickRandom = <T>(items: T[], random: () => number): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
};

const seenAt = (fact: FactEntry, states: FactStates): number => {
  const lastSeenAt = states[fact.id]?.lastSeenAt;
  return lastSeenAt ? Date.parse(lastSeenAt) : 0;
};

export const selectNextFact = (
  facts: FactEntry[],
  states: FactStates,
  recentFactIds: string[],
  currentFactId?: string,
  includeKnown = false,
  random: () => number = Math.random,
): FactEntry | undefined => {
  const recent = new Set(recentFactIds);
  const eligible = facts.filter(
    (fact) => fact.id !== currentFactId && (includeKnown || !states[fact.id]?.known),
  );

  const withoutRecent = eligible.filter((fact) => !recent.has(fact.id));
  const primaryPool = withoutRecent.length > 0 ? withoutRecent : eligible;
  const unseen = primaryPool.filter((fact) => !states[fact.id]?.seenCount);
  const unseenPick = pickRandom(unseen, random);
  if (unseenPick) return unseenPick;

  const oldestFirst = [...primaryPool].sort(
    (left, right) => seenAt(left, states) - seenAt(right, states),
  );
  return pickRandom(oldestFirst.slice(0, Math.min(5, oldestFirst.length)), random);
};
