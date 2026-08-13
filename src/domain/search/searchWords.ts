import type { Category, WordEntry } from "../content/types";

export interface SearchResult {
  word: WordEntry;
  score: number;
}

export const normalizeFinnishText = (value: string): string =>
  value
    .normalize("NFC")
    .toLocaleLowerCase("fi-FI")
    .replace(/[.,;:!?()[\]{}“”"'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreToken = (
  token: string,
  word: WordEntry,
  categoryLabels: string[],
): number => {
  const headword = normalizeFinnishText(word.word);
  if (headword === token) return 100;
  if (headword.startsWith(token)) return 80;
  if (headword.includes(token)) return 60;

  const terms = (word.searchTerms ?? []).map(normalizeFinnishText);
  if (terms.some((term) => term === token)) return 55;
  if (terms.some((term) => term.startsWith(token))) return 45;
  if (terms.some((term) => term.includes(token))) return 35;
  if (categoryLabels.some((category) => category.includes(token))) return 25;
  if (normalizeFinnishText(word.shortDefinition).includes(token)) return 20;
  if (normalizeFinnishText(word.explanation).includes(token)) return 10;
  if (normalizeFinnishText(word.example).includes(token)) return 5;
  return 0;
};

export const searchWords = (
  words: WordEntry[],
  categories: Category[],
  query: string,
): SearchResult[] => {
  const normalized = normalizeFinnishText(query);
  if (!normalized) return [];

  const tokens = normalized.split(" ").filter(Boolean);
  const categoryMap = new Map(categories.map((category) => [category.id, normalizeFinnishText(category.label)]));
  const collator = new Intl.Collator("fi", { sensitivity: "base" });

  return words
    .map((word) => {
      const categoryLabels = word.categories
        .map((categoryId) => categoryMap.get(categoryId))
        .filter((label): label is string => Boolean(label));
      const tokenScores = tokens.map((token) => scoreToken(token, word, categoryLabels));
      if (tokenScores.some((score) => score === 0)) return null;
      return { word, score: tokenScores.reduce((sum, score) => sum + score, 0) };
    })
    .filter((result): result is SearchResult => result !== null)
    .sort((left, right) => right.score - left.score || collator.compare(left.word.word, right.word.word));
};
