export type Locale = "fi";

export type Difficulty = "familiar" | "intermediate" | "advanced";

export type CategoryId =
  | "tyoelama"
  | "psykologia"
  | "filosofia"
  | "tiede"
  | "yhteiskunta"
  | "media"
  | "kieli-ja-viestinta"
  | "matematiikka";

export interface Category {
  id: CategoryId;
  label: string;
}

export interface WordEntry {
  kind: "word";
  id: string;
  slug: string;
  locale: Locale;
  word: string;
  shortDefinition: string;
  explanation: string;
  example: string;
  etymology?: string;
  categories: CategoryId[];
  difficulty: Difficulty;
  searchTerms?: string[];
}

export interface ContentManifest {
  schemaVersion: 1;
  contentVersion: string;
  locale: Locale;
}

export interface FactSource {
  title: string;
  url?: string;
  accessedAt?: string;
}

/** Future model only. Phase 1 does not ship fact content. */
export interface FactEntry {
  kind: "fact";
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  shortFact: string;
  explanation: string;
  categories: CategoryId[];
  sources: FactSource[];
}
