import categoriesData from "../../content/fi/categories.json";
import manifestData from "../../content/fi/manifest.json";
import wordsData from "../../content/fi/words.json";
import type { Category, ContentManifest, WordEntry } from "../domain/content/types";
import type { ContentCatalog, ContentRepository } from "./ContentRepository";

const catalog: ContentCatalog = {
  manifest: manifestData as ContentManifest,
  words: wordsData as WordEntry[],
  categories: categoriesData as Category[],
  wordsById: new Map((wordsData as WordEntry[]).map((word) => [word.id, word])),
  wordsBySlug: new Map((wordsData as WordEntry[]).map((word) => [word.slug, word])),
};

export class StaticContentRepository implements ContentRepository {
  async loadCatalog(): Promise<ContentCatalog> {
    return catalog;
  }

  getWordById(id: string): WordEntry | undefined {
    return catalog.wordsById.get(id);
  }

  getWordBySlug(slug: string): WordEntry | undefined {
    return catalog.wordsBySlug.get(slug);
  }
}

export const contentRepository = new StaticContentRepository();
export const contentCatalog = catalog;
