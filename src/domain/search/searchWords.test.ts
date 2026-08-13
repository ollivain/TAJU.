import { describe, expect, it } from "vitest";
import { contentCatalog } from "../../content/loadContent";
import { normalizeFinnishText, searchWords } from "./searchWords";

describe("normalizeFinnishText", () => {
  it("normalisoi kirjainkoon ja Unicode-esityksen mutta säilyttää ääkköset", () => {
    expect(normalizeFinnishText("  ÄÄNI  ")).toBe("ääni");
    expect(normalizeFinnishText("aäoö")).toBe("aäoö");
  });
});

describe("searchWords", () => {
  it("priorisoi sanan tarkan osuman", () => {
    const results = searchWords(contentCatalog.words, contentCatalog.categories, "paradoksi");
    expect(results[0]?.word.word).toBe("paradoksi");
    expect(results[0]?.score).toBe(100);
  });

  it("löytää sanan hakutermistä ja määritelmästä", () => {
    expect(
      searchWords(contentCatalog.words, contentCatalog.categories, "yhteisymmärrys")[0]?.word.word,
    ).toBe("konsensus");
    expect(
      searchWords(contentCatalog.words, contentCatalog.categories, "tilastollinen yhteys")[0]?.word.word,
    ).toBe("korrelaatio");
  });

  it("vaatii usean hakutokenin löytymisen", () => {
    const results = searchWords(contentCatalog.words, contentCatalog.categories, "tiede oletus");
    expect(results.some((result) => result.word.word === "hypoteesi")).toBe(true);
    expect(results.every((result) => result.score > 0)).toBe(true);
  });
});
