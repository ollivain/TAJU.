import type { Concept } from "./schema";
import { isInflectedForm, normalizeConceptText } from "./normalize";

export type ConceptMatch = { concept: Concept; kind: "exact" | "inflected" | "partial" | "keyword" | "fuzzy"; score: number };
export type ConceptSearchIndex = ReturnType<typeof createConceptSearchIndex>;

export function createConceptSearchIndex(concepts: readonly Concept[]) {
  return concepts.map((concept) => ({
    concept,
    names: [concept.name, concept.englishName ?? "", ...concept.aliases].filter(Boolean).map(normalizeConceptText),
    keywords: [...concept.tags, ...concept.searchKeywords].map(normalizeConceptText),
  }));
}

function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

export function searchConcepts(index: ConceptSearchIndex, input: string): ConceptMatch[] {
  const query = normalizeConceptText(input).slice(0, 300);
  if (!query) return [];
  const compact = query.replaceAll(" ", "");
  const tokens = query.split(" ");
  const matches: ConceptMatch[] = [];
  for (const { concept, names, keywords } of index) {
    let match: Omit<ConceptMatch, "concept"> | undefined;
    for (const name of names) {
      const words = name.split(" ");
      let candidate: typeof match;
      if (query === name || compact === name.replaceAll(" ", "")) candidate = { kind: "exact", score: 100 };
      else if (tokens.length === words.length && tokens.every((token, i) => isInflectedForm(token, words[i]))) candidate = { kind: "inflected", score: 95 };
      else if (name.includes(query)) candidate = { kind: "partial", score: 80 };
      else if (compact.length >= 5 && compact.length <= 80) {
        const normalized = name.replaceAll(" ", "");
        const limit = compact.length < 8 ? 1 : 2;
        if (Math.abs(compact.length - normalized.length) <= limit) {
          const difference = distance(compact, normalized);
          if (difference <= limit) candidate = { kind: "fuzzy", score: 60 - difference };
        }
      }
      if (candidate && (!match || candidate.score > match.score)) match = candidate;
    }
    if (!match && keywords.some((keyword) => keyword.includes(query))) match = { kind: "keyword", score: 65 };
    if (match) matches.push({ concept, ...match });
  }
  return matches.sort((a, b) => b.score - a.score || a.concept.name.localeCompare(b.concept.name, "fi"));
}
