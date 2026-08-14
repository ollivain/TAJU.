import type {
  Category,
  ContentManifest,
  FactEntry,
  WordEntry,
} from "../domain/content/types";

export interface ContentCatalog {
  manifest: ContentManifest;
  words: WordEntry[];
  facts: FactEntry[];
  categories: Category[];
  wordsById: ReadonlyMap<string, WordEntry>;
  wordsBySlug: ReadonlyMap<string, WordEntry>;
  factsById: ReadonlyMap<string, FactEntry>;
  factsBySlug: ReadonlyMap<string, FactEntry>;
}

export interface ContentRepository {
  loadCatalog(): Promise<ContentCatalog>;
  getWordById(id: string): WordEntry | undefined;
  getWordBySlug(slug: string): WordEntry | undefined;
  getFactById(id: string): FactEntry | undefined;
  getFactBySlug(slug: string): FactEntry | undefined;
}
