import { describe, expect, it } from "vitest";
import { factSchema, validateFacts } from "./content-schemas";

const validFact = {
  kind: "fact" as const,
  id: "20000000-0000-4000-8000-000000000001",
  slug: "testifakta",
  locale: "fi" as const,
  fact: "Tiivis ja tarkistettu fakta.",
  explanation: "Selitys antaa väitteelle hyödyllisen asiayhteyden.",
  category: "tiede",
  sourceLabel: "Luotettava lähde",
  sourceUrl: "https://example.com/source",
};

const factSet = () =>
  Array.from({ length: 30 }, (_, index) => ({
    ...validFact,
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    slug: `testifakta-${index + 1}`,
  }));

describe("FactEntry validation", () => {
  it("hyväksyy täydellisen faktan", () => {
    expect(factSchema.parse(validFact)).toEqual(validFact);
  });

  it.each([
    ["tyhjä fakta", { fact: "" }],
    ["tyhjä selitys", { explanation: "" }],
    ["puuttuva lähde", { sourceLabel: "" }],
    ["virheellinen URL", { sourceUrl: "ei-verkko-osoite" }],
    ["virheellinen skeema", { locale: "en" }],
  ])("hylkää virheen: %s", (_label, replacement) => {
    expect(factSchema.safeParse({ ...validFact, ...replacement }).success).toBe(false);
  });

  it("hylkää päällekkäiset ID:t", () => {
    const facts = factSet();
    facts[1].id = facts[0].id;

    expect(() => validateFacts(facts)).toThrow("FactEntry ID:t: duplikaatit");
  });

  it("hylkää päällekkäiset slugit", () => {
    const facts = factSet();
    facts[1].slug = facts[0].slug;

    expect(() => validateFacts(facts)).toThrow("Faktojen slugit: duplikaatit");
  });
});
