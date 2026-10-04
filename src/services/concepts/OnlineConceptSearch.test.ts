import { afterEach, describe, expect, it, vi } from "vitest";
import { WikipediaConceptSearch } from "./OnlineConceptSearch";

const page = { pageid: 13855, title: "Emergenssi", index: 1, extract: "Kokonaisuudesta syntyvä uusi ominaisuus." };
const reply = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
const signal = () => new AbortController().signal;

afterEach(() => vi.useRealTimers());

describe("Wikipedia concept search", () => {
  it("looks up the exact title anonymously with Finnish spelling and safe source links", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ query: { pages: [
      { ...page, title: "Sää", fullurl: "javascript:alert(1)" },
    ] } }));
    const results = await new WikipediaConceptSearch(fetcher).search("Sää?!", signal());
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(url).searchParams.get("titles")).toBe("sää");
    expect(new URL(url).searchParams.get("redirects")).toBe("1");
    expect(new URL(url).searchParams.get("origin")).toBe("*");
    expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer" });
    expect(results[0]).toMatchObject({ title: "Sää", url: "https://fi.wikipedia.org/?curid=13855", match: "exact", language: "fi", extract: page.extract, disambiguation: false });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("tries English only after an empty Finnish search", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply({ query: { pages: [{ title: "Bounded rationality", missing: true }] } }))
      .mockResolvedValueOnce(reply({ query: { pages: [{ ...page, title: "Bounded rationality" }] } }));
    const results = await new WikipediaConceptSearch(fetcher).search("bounded rationality", signal());
    expect(new URL(fetcher.mock.calls[0][0]).host).toBe("fi.wikipedia.org");
    expect(new URL(fetcher.mock.calls[1][0]).host).toBe("en.wikipedia.org");
    expect(results[0]).toMatchObject({ language: "en", url: "https://en.wikipedia.org/?curid=13855", match: "exact" });
    expect(fetcher.mock.calls.every(([url]) => new URL(url).searchParams.has("titles"))).toBe(true);
  });

  it("returns an honest empty result when neither language has a match", async () => {
    const fetcher = vi.fn().mockImplementation(async () => reply({ batchcomplete: true }));
    expect(await new WikipediaConceptSearch(fetcher).search("kvanttikirahvi", signal())).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("resolves the requested alias before broad search can return a related topic", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ query: {
      redirects: [{ from: "Diversiteetti", to: "Monimuotoisuus (sosiologia)" }],
      pages: [{ pageid: 1914137, title: "Monimuotoisuus (sosiologia)", extract: "Monimuotoisuus eli diversiteetti." }],
    } }));
    const results = await new WikipediaConceptSearch(fetcher).search("diversiteetti", signal());
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ title: "Monimuotoisuus (sosiologia)", redirectedFrom: "Diversiteetti", match: "redirect", extract: "Monimuotoisuus eli diversiteetti." });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("uses title search only after exact lookups, ranks exact matches first and labels other results", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply({ batchcomplete: true }))
      .mockResolvedValueOnce(reply({ batchcomplete: true }))
      .mockResolvedValueOnce(reply({ query: { pages: [
        { ...page, pageid: 2, title: "Sään ennustaminen", index: 1 },
        { ...page, title: "Sää", index: 2 },
      ] } }));
    const results = await new WikipediaConceptSearch(fetcher).search("sää", signal());
    expect(new URL(fetcher.mock.calls[2][0]).searchParams.get("gsrsearch")).toBe('intitle:"sää"');
    expect(results.map(({ title, match }) => ({ title, match }))).toEqual([
      { title: "Sää", match: "exact" }, { title: "Sään ennustaminen", match: "related" },
    ]);
  });

  it("does not present an article introduction as the definition of a redirected section", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ query: {
      redirects: [{ from: "Hakusana", to: "Laaja aihe", tofragment: "Tarkempi merkitys" }],
      pages: [{ ...page, title: "Laaja aihe", extract: "Tämä johdanto kertoo eri asiasta." }],
    } }));
    const results = await new WikipediaConceptSearch(fetcher).search("hakusana", signal());
    expect(results[0]).toMatchObject({ redirectedFrom: "Hakusana", section: "Tarkempi merkitys", extract: "", url: "https://fi.wikipedia.org/?curid=13855#Tarkempi_merkitys" });
  });

  it("marks disambiguation pages and tolerates missing extracts", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ query: { pages: [{ pageid: 1, title: "Merkitys", pageprops: { disambiguation: "" } }] } }));
    expect((await new WikipediaConceptSearch(fetcher).search("merkitys", signal()))[0]).toMatchObject({ disambiguation: true, extract: "" });
  });

  it.each([{}, { error: { code: "ratelimited" } }, { query: { pages: [{ pageid: -1, title: "Invalid" }] } }])("rejects invalid or failed API responses: %j", async (data) => {
    const fetcher = vi.fn().mockResolvedValue(reply(data));
    await expect(new WikipediaConceptSearch(fetcher).search("emergenssi", signal())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("does not turn an HTTP error into a false no-match", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(new WikipediaConceptSearch(fetcher).search("emergenssi", signal())).rejects.toThrow();
  });

  it("avoids empty, punctuation-only and very short requests", async () => {
    const fetcher = vi.fn();
    const search = new WikipediaConceptSearch(fetcher);
    for (const term of ["", "?!", "ab"]) expect(await search.search(term, signal())).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("cancels an in-flight request and never starts the English fallback", async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, options: RequestInit = {}) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const controller = new AbortController();
    const pending = new WikipediaConceptSearch(fetcher).search("emergenssi", controller.signal);
    const assertion = expect(pending).rejects.toThrow();
    controller.abort();
    await assertion;
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("times out even if the response body never completes", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, options: RequestInit = {}) => Promise.resolve({ ok: true, json: () => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }) } as Response));
    const pending = new WikipediaConceptSearch(fetcher).search("emergenssi", signal());
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(8_000);
    await assertion;
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
