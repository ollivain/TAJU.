import { isInflectedForm, normalizeConceptText } from "../concepts/normalize";

export type MatchKind = "exact" | "inflected" | "partial" | "keyword" | "fuzzy";
export interface NamedEntry<T> { value: T; names: string[]; keywords: string[] }
export interface NamedMatch<T> { value: T; kind: MatchKind; score: number }

export function createNamedIndex<T>(entries: NamedEntry<T>[]): NamedEntry<T>[] {
  return entries.map((entry) => ({ ...entry, names: entry.names.filter(Boolean).map(normalizeConceptText), keywords: entry.keywords.map(normalizeConceptText) }));
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

export function searchNamedEntries<T>(index: NamedEntry<T>[], input: string): NamedMatch<T>[] {
  const query = normalizeConceptText(input).slice(0, 300);
  if (!query) return [];
  const compact = query.replaceAll(" ", "");
  const tokens = query.split(" ");
  const matches: NamedMatch<T>[] = [];
  for (const { value, names, keywords } of index) {
    let match: Omit<NamedMatch<T>, "value"> | undefined;
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
    if (match) matches.push({ value, ...match });
  }
  return matches.sort((a, b) => b.score - a.score);
}
