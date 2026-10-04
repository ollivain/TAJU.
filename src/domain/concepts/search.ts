import type { Concept } from "./schema";
import { createNamedIndex, searchNamedEntries, type MatchKind } from "../search/searchNamedEntries";

export type ConceptMatch = { concept: Concept; kind: MatchKind; score: number };
export type ConceptSearchIndex = ReturnType<typeof createConceptSearchIndex>;

export function createConceptSearchIndex(concepts: readonly Concept[]) {
  return createNamedIndex(concepts.map((concept) => ({
    value: concept,
    names: [concept.name, concept.englishName ?? "", ...concept.aliases],
    keywords: [...concept.tags, ...concept.searchKeywords],
  })));
}

export function searchConcepts(index: ConceptSearchIndex, input: string): ConceptMatch[] {
  return searchNamedEntries(index, input)
    .map(({ value: concept, ...match }) => ({ concept, ...match }))
    .sort((a, b) => b.score - a.score || a.concept.name.localeCompare(b.concept.name, "fi"));
}
