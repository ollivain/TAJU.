import { contentCatalog } from "../../content/loadContent";
import { createConceptSearchIndex } from "../../domain/concepts/search";

export const conceptSearchIndex = createConceptSearchIndex(contentCatalog.concepts);
export const sortedConcepts = [...contentCatalog.concepts].sort((a, b) => a.name.localeCompare(b.name, "fi"));
export const conceptCategoryLabels = new Map(contentCatalog.conceptCategories.map((category) => [category.id, category.label]));
