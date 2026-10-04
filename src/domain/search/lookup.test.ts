import { describe, expect, it } from "vitest";
import { contentCatalog } from "../../content/loadContent";
import { clearLookupMatch, createLookupIndex, lookupName, searchLookup } from "./lookup";

const index = createLookupIndex(contentCatalog.concepts, contentCatalog.words);

describe("shared word and concept lookup", () => {
  it("finds a word and a concept with the same ranking rules", () => {
    const word = searchLookup(index, "paradoksi");
    expect(lookupName(clearLookupMatch(word, false)!.value)).toBe("Paradoksi");
    expect(word[0].value.type).toBe("word");
    const concept = searchLookup(index, "Overton window");
    expect(lookupName(clearLookupMatch(concept, false)!.value)).toBe("Overtonin ikkuna");
  });

  it("does not present fuzzy, partial or uncertain speech as a certain explanation", () => {
    expect(clearLookupMatch(searchLookup(index, "paradokssi"), false)).toBeUndefined();
    expect(clearLookupMatch(searchLookup(index, "para"), false)).toBeUndefined();
    expect(clearLookupMatch(searchLookup(index, "paradoksi"), true)).toBeUndefined();
  });

  it("collapses matching word and concept names and keeps the richer concept", () => {
    const concept = contentCatalog.concepts[0];
    const word = { ...contentCatalog.words[0], word: concept.name };
    const matches = searchLookup(createLookupIndex([concept], [word]), concept.name);
    expect(matches).toHaveLength(1);
    expect(matches[0].value.type).toBe("concept");
  });

  it("keeps multiple exact meanings as choices", () => {
    const concepts = contentCatalog.concepts.slice(0, 2).map((concept) => ({ ...concept, aliases: ["yhteinen alias"] }));
    const matches = searchLookup(createLookupIndex(concepts, []), "yhteinen alias");
    expect(matches).toHaveLength(2);
    expect(clearLookupMatch(matches, false)).toBeUndefined();
  });
});
