import categoriesData from "../../content/fi/categories.json";
import conceptsData from "../../content/fi/concepts.json";
import conceptCategoriesData from "../../content/fi/concept-categories.json";
import type { Concept, ConceptCategory } from "../domain/concepts/schema";
import factsData from "../../content/fi/facts.json";
import manifestData from "../../content/fi/manifest.json";
import wordsData from "../../content/fi/words.json";
import type {
  Category,
  ContentManifest,
  FactEntry,
  WordEntry,
} from "../domain/content/types";
import type { ContentCatalog, ContentRepository } from "./ContentRepository";

const catalog: ContentCatalog = {
  concepts: conceptsData as Concept[],
  conceptCategories: conceptCategoriesData as ConceptCategory[],
  conceptsById: new Map((conceptsData as Concept[]).map((concept) => [concept.id, concept])),
  conceptsBySlug: new Map((conceptsData as Concept[]).map((concept) => [concept.slug, concept])),
  manifest: manifestData as ContentManifest,
  words: wordsData as WordEntry[],
  facts: factsData as FactEntry[],
  categories: categoriesData as Category[],
  wordsById: new Map((wordsData as WordEntry[]).map((word) => [word.id, word])),
  wordsBySlug: new Map((wordsData as WordEntry[]).map((word) => [word.slug, word])),
  factsById: new Map((factsData as FactEntry[]).map((fact) => [fact.id, fact])),
  factsBySlug: new Map((factsData as FactEntry[]).map((fact) => [fact.slug, fact])),
};

export class StaticContentRepository implements ContentRepository {
  getConceptById(id: string): Concept | undefined {
    return catalog.conceptsById.get(id);
  }

  getConceptBySlug(slug: string): Concept | undefined {
    return catalog.conceptsBySlug.get(slug);
  }

  async loadCatalog(): Promise<ContentCatalog> {
    return catalog;
  }

  getWordById(id: string): WordEntry | undefined {
    return catalog.wordsById.get(id);
  }

  getWordBySlug(slug: string): WordEntry | undefined {
    return catalog.wordsBySlug.get(slug);
  }

  getFactById(id: string): FactEntry | undefined {
    return catalog.factsById.get(id);
  }

  getFactBySlug(slug: string): FactEntry | undefined {
    return catalog.factsBySlug.get(slug);
  }
}

export const contentRepository = new StaticContentRepository();
export const contentCatalog = catalog;
