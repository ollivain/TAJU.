import { z } from "zod";

const text = z.string().trim().min(1);
const key = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const conceptCategorySchema = z.object({ id: key, label: text });
export const conceptSchema = z.object({
  id: key,
  slug: key,
  name: text,
  englishName: text.optional(),
  shortDefinition: text,
  explanation: text,
  simpleExplanation: text,
  example: text,
  category: key,
  tags: z.array(text),
  relatedConceptIds: z.array(key),
  aliases: z.array(text),
  searchKeywords: z.array(text),
  sources: z.array(z.object({ label: text, url: z.url().regex(/^https?:\/\//) })).optional(),
  nuanceNote: text.optional(),
  comparison: z.object({
    mechanism: text,
    moneySource: text.optional(),
    participantStructure: text.optional(),
    distinctiveFeature: text,
  }).optional(),
});

export type Concept = z.infer<typeof conceptSchema>;
export type ConceptCategory = z.infer<typeof conceptCategorySchema>;

export function validateConceptCatalog(conceptData: unknown, categoryData: unknown) {
  const concepts = z.array(conceptSchema).min(1).parse(conceptData);
  const categories = z.array(conceptCategorySchema).min(1).parse(categoryData);
  const unique = (values: string[], label: string) => {
    const normalized = values.map((value) => value.normalize("NFC").toLocaleLowerCase("fi"));
    if (new Set(normalized).size !== values.length) throw new Error(`Duplicate ${label}`);
  };
  unique(concepts.map((c) => c.id), "concept ID");
  unique(concepts.map((c) => c.slug), "concept slug");
  unique(concepts.map((c) => c.name), "concept name");
  unique(categories.map((c) => c.id), "category ID");
  const ids = new Set(concepts.map((c) => c.id));
  const categoryIds = new Set(categories.map((c) => c.id));
  for (const concept of concepts) {
    if (!categoryIds.has(concept.category)) throw new Error(`Unknown category: ${concept.category}`);
    unique(concept.relatedConceptIds, "related concept");
    for (const id of concept.relatedConceptIds) {
      if (!ids.has(id) || id === concept.id) throw new Error(`Invalid related concept: ${id}`);
    }
  }
  return { concepts, categories };
}
