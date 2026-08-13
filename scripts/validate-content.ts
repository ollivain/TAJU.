import { readFile } from "node:fs/promises";
import { z } from "zod";

const categoryIds = [
  "tyoelama",
  "psykologia",
  "filosofia",
  "tiede",
  "yhteiskunta",
  "media",
  "kieli-ja-viestinta",
  "matematiikka",
] as const;

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  locale: z.literal("fi"),
});

const categorySchema = z.object({
  id: z.enum(categoryIds),
  label: z.string().trim().min(1),
});

const wordSchema = z.object({
  kind: z.literal("word"),
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.literal("fi"),
  word: z.string().trim().min(2),
  shortDefinition: z.string().trim().min(10),
  explanation: z.string().trim().min(30),
  example: z.string().trim().min(15),
  etymology: z.string().trim().min(10).optional(),
  categories: z.array(z.enum(categoryIds)).min(1),
  difficulty: z.enum(["familiar", "intermediate", "advanced"]),
  searchTerms: z.array(z.string().trim().min(2)).optional(),
});

const parseJson = async (relativePath: string): Promise<unknown> => {
  const url = new URL(`../${relativePath}`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8")) as unknown;
};

const normalize = (value: string): string =>
  value.normalize("NFC").toLocaleLowerCase("fi-FI").trim();

const assertUnique = (values: string[], label: string): void => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.map(normalize)) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) {
    throw new Error(`${label}: duplikaatit ${[...duplicates].join(", ")}`);
  }
};

const manifest = manifestSchema.parse(await parseJson("content/fi/manifest.json"));
const categories = z.array(categorySchema).parse(await parseJson("content/fi/categories.json"));
const words = z.array(wordSchema).min(25).parse(await parseJson("content/fi/words.json"));

assertUnique(categories.map((category) => category.id), "Kategoriat");
assertUnique(words.map((word) => word.id), "WordEntry ID:t");
assertUnique(words.map((word) => word.slug), "Slugit");
assertUnique(words.map((word) => word.word), "Sanat");

console.log(
  `Sisältö OK: ${words.length} sanaa, ${categories.length} kategoriaa, versio ${manifest.contentVersion}.`,
);
