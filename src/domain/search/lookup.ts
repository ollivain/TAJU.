import type { Concept } from "../concepts/schema";
import { normalizeConceptText } from "../concepts/normalize";
import type { WordEntry } from "../content/types";
import { capitalizeWord } from "../content/capitalizeWord";
import { createNamedIndex, searchNamedEntries, type NamedMatch } from "./searchNamedEntries";

export type LookupEntry = { type: "concept"; concept: Concept } | { type: "word"; word: WordEntry };
export type LookupMatch = NamedMatch<LookupEntry>;
export const lookupName = (entry: LookupEntry) => entry.type === "concept" ? entry.concept.name : capitalizeWord(entry.word.word);
export const lookupKey = (entry: LookupEntry) => entry.type === "concept" ? `concept:${entry.concept.id}` : `word:${entry.word.id}`;

export function createLookupIndex(concepts: Concept[], words: WordEntry[]) {
  return createNamedIndex<LookupEntry>([
    ...concepts.map((concept) => ({ value: { type: "concept" as const, concept }, names: [concept.name, concept.englishName ?? "", ...concept.aliases], keywords: [...concept.tags, ...concept.searchKeywords] })),
    ...words.map((word) => ({ value: { type: "word" as const, word }, names: [word.word], keywords: word.searchTerms ?? [] })),
  ]);
}

export function searchLookup(index: ReturnType<typeof createLookupIndex>, input: string): LookupMatch[] {
  const seen = new Set<string>();
  return searchNamedEntries(index, input)
    .sort((a, b) => b.score - a.score || lookupName(a.value).localeCompare(lookupName(b.value), "fi") || (a.value.type === b.value.type ? 0 : a.value.type === "concept" ? -1 : 1))
    .filter(({ value }) => {
      const name = normalizeConceptText(lookupName(value));
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

export function clearLookupMatch(matches: LookupMatch[], uncertain: boolean): LookupMatch | undefined {
  const first = matches[0];
  return !uncertain && first && ["exact", "inflected"].includes(first.kind) && first.score !== matches[1]?.score ? first : undefined;
}
