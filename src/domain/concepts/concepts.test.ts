import { describe, expect, it } from "vitest";
import concepts from "../../../content/fi/concepts.json";
import categories from "../../../content/fi/concept-categories.json";
import { normalizeConceptText } from "./normalize";
import { parseConceptQuery } from "./query-parser";
import { createConceptSearchIndex, searchConcepts } from "./search";
import { validateConceptCatalog } from "./schema";

const catalog = validateConceptCatalog(concepts, categories);
const index = createConceptSearchIndex(catalog.concepts);

describe("concept content", () => {
  it("validates the seed and every category/related link", () => {
    expect(catalog.concepts.length).toBeGreaterThanOrEqual(40);
    expect(catalog.categories.length).toBeGreaterThanOrEqual(7);
  });
  it.each([
    { id: concepts[1].id }, { slug: concepts[1].slug }, { category: "missing" },
    { relatedConceptIds: ["missing"] }, { relatedConceptIds: [concepts[0].id] },
    { sources: [{ label: "Unsafe", url: "javascript:alert(1)" }] },
  ])("rejects invalid catalog data: %j", (change) => {
    expect(() => validateConceptCatalog([{ ...concepts[0], ...change }, ...concepts.slice(1)], categories)).toThrow();
  });
});

describe("concept search", () => {
  it.each([
    ["Overtonin ikkuna", "overton-window", "exact"],
    ["Overton window", "overton-window", "exact"],
    ["Ponzi", "ponzi", "exact"],
    ["vahvistusvinouma", "confirmation-bias", "exact"],
    ["confirmation bias", "confirmation-bias", "exact"],
    ["overton", "overton-window", "partial"],
    ["oiko fobia", "oikophobia", "exact"],
    ["oikofopia", "oikophobia", "fuzzy"],
    ["ponzi huijauksella", "ponzi", "inflected"],
    ["pyramidihuijauksen", "pyramid", "inflected"],
    ["OVERTONIN—IKKUNA?!", "overton-window", "exact"],
  ])("finds %s", (query, id, kind) => {
    expect(searchConcepts(index, query)[0]).toMatchObject({ concept: { id }, kind });
  });
  it.each(["", "???", "kvanttikirahvi", "qwertyuiopasdfgh", "a".repeat(1000)])("has no invented result for %s", (query) => {
    expect(searchConcepts(index, query)).toEqual([]);
  });
  it("uses content keywords", () => expect(searchConcepts(index, "sijoitushuijaus")[0].concept.id).toBe("ponzi"));
});

describe("query extraction", () => {
  it.each([
    ["Mikä on Ponzi-huijaus?", "ponzi"],
    ["Mitä tarkoittaa Overtonin ikkuna?", "overton-window"],
    ["Selitä oikofobia.", "oikophobia"],
    ["Mitä oikofobia tarkoittaa?", "oikophobia"],
  ])("resolves %s", (query, id) => {
    const parsed = parseConceptQuery(query);
    expect(parsed.kind).toBe("lookup");
    if (parsed.kind === "lookup") expect(searchConcepts(index, parsed.term)[0].concept.id).toBe(id);
  });
  it.each([
    "Mikä ero on Ponzi-huijauksella ja pyramidihuijauksella?",
    "Mikä ero on Ponzi:n ja pyramidihuijauksen välillä?",
    "Vertaa Ponzi ja pyramidihuijaus",
    "Ponzi vs pyramid scheme",
  ])("resolves comparison: %s", (query) => {
    const parsed = parseConceptQuery(query);
    expect(parsed.kind).toBe("compare");
    if (parsed.kind === "compare") expect(parsed.terms.map((term) => searchConcepts(index, term)[0]?.concept.id)).toEqual(["ponzi", "pyramid"]);
  });
  it("normalizes punctuation, accents, whitespace and speech word boundaries", () => {
    expect(normalizeConceptText("  VAHVISTUSHÄRHA?!  ")).toBe("vahvistusharha");
    expect(normalizeConceptText("Dunning–Kruger\n effect")).toBe("dunning kruger effect");
  });
  it("does not split ordinary lookup names on ja", () => {
    expect(parseConceptQuery("kysyntä ja tarjonta").kind).toBe("lookup");
  });
});
