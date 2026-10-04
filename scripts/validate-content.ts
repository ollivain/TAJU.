import { readFile } from "node:fs/promises";
import { z } from "zod";
import { validateConceptCatalog } from "../src/domain/concepts/schema";
import {
  assertUnique,
  categorySchema,
  manifestSchema,
  validateFacts,
  wordSchema,
} from "./content-schemas";

const parseJson = async (relativePath: string): Promise<unknown> => {
  const url = new URL(`../${relativePath}`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8")) as unknown;
};

const manifest = manifestSchema.parse(await parseJson("content/fi/manifest.json"));
const categories = z.array(categorySchema).parse(await parseJson("content/fi/categories.json"));
const words = z.array(wordSchema).min(25).parse(await parseJson("content/fi/words.json"));
const facts = validateFacts(await parseJson("content/fi/facts.json"));
const { concepts } = validateConceptCatalog(
  await parseJson("content/fi/concepts.json"),
  await parseJson("content/fi/concept-categories.json"),
);

assertUnique(categories.map((category) => category.id), "Kategoriat");
assertUnique(words.map((word) => word.id), "WordEntry ID:t");
assertUnique(words.map((word) => word.slug), "Slugit");
assertUnique(words.map((word) => word.word), "Sanat");

console.log(
  `Sisältö OK: ${words.length} sanaa, ${facts.length} faktaa, ${concepts.length} käsitettä, ${categories.length} sanakategoriaa, versio ${manifest.contentVersion}.`,
);
