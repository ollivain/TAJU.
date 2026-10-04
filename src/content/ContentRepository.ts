import type {
  Category,
  ContentManifest,
  FactEntry,
  WordEntry,
} from "../domain/content/types";
import type { Concept, ConceptCategory } from "../domain/concepts/schema";

export interface ContentCatalog {
  concepts: Concept[];
  conceptCategories: ConceptCategory[];
  conceptsById: ReadonlyMap<string, Concept>;
  conceptsBySlug: ReadonlyMap<string, Concept>;
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
  getConceptById(id: string): Concept | undefined;
  getConceptBySlug(slug: string): Concept | undefined;
  loadCatalog(): Promise<ContentCatalog>;
  getWordById(id: string): WordEntry | undefined;
  getWordBySlug(slug: string): WordEntry | undefined;
  getFactById(id: string): FactEntry | undefined;
  getFactBySlug(slug: string): FactEntry | undefined;
}
