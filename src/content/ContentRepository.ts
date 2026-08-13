import type { Category, ContentManifest, WordEntry } from "../domain/content/types";

export interface ContentCatalog {
  manifest: ContentManifest;
  words: WordEntry[];
  categories: Category[];
  wordsById: ReadonlyMap<string, WordEntry>;
  wordsBySlug: ReadonlyMap<string, WordEntry>;
}

export interface ContentRepository {
  loadCatalog(): Promise<ContentCatalog>;
  getWordById(id: string): WordEntry | undefined;
  getWordBySlug(slug: string): WordEntry | undefined;
}
