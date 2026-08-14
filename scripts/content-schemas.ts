import { z } from "zod";

export const categoryIds = [
  "tyoelama",
  "psykologia",
  "filosofia",
  "tiede",
  "yhteiskunta",
  "media",
  "kieli-ja-viestinta",
  "matematiikka",
] as const;

export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  locale: z.literal("fi"),
});

export const categorySchema = z.object({
  id: z.enum(categoryIds),
  label: z.string().trim().min(1),
});

export const wordSchema = z.object({
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

export const factSchema = z.object({
  kind: z.literal("fact"),
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.literal("fi"),
  fact: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  category: z.string().trim().min(1),
  sourceLabel: z.string().trim().min(1),
  sourceUrl: z.url(),
});

const normalize = (value: string): string =>
  value.normalize("NFC").toLocaleLowerCase("fi-FI").trim();

export const assertUnique = (values: string[], label: string): void => {
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

export const validateFacts = (value: unknown) => {
  const facts = z.array(factSchema).length(30).parse(value);
  assertUnique(facts.map((fact) => fact.id), "FactEntry ID:t");
  assertUnique(facts.map((fact) => fact.slug), "Faktojen slugit");
  return facts;
};
