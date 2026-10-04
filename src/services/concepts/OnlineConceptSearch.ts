import { z } from "zod";
import { cleanConceptText } from "../../domain/concepts/normalize";

export interface OnlineConceptResult {
  id: number;
  title: string;
  extract: string;
  url: string;
  language: "fi" | "en";
  disambiguation: boolean;
  match: "exact" | "redirect" | "related";
  redirectedFrom?: string;
  section?: string;
}

export interface OnlineConceptSearch {
  search(term: string, signal: AbortSignal): Promise<OnlineConceptResult[]>;
}

const responseSchema = z.object({
  batchcomplete: z.boolean().optional(),
  error: z.object({ code: z.string() }).optional(),
  query: z.object({
    redirects: z.array(z.object({ from: z.string(), to: z.string(), tofragment: z.string().optional() })).optional(),
    pages: z.array(z.object({
      pageid: z.number().int().positive().optional(),
      title: z.string().min(1),
      missing: z.boolean().optional(),
      invalid: z.boolean().optional(),
      index: z.number().optional(),
      extract: z.string().optional(),
      pageprops: z.object({ disambiguation: z.string().optional() }).optional(),
    }).refine((page) => page.pageid !== undefined || page.missing || page.invalid)),
  }).optional(),
}).refine((data) => data.batchcomplete !== undefined || data.query || data.error);

/** Public, anonymous API: no key, server, cookies or stored search history. */
export class WikipediaConceptSearch implements OnlineConceptSearch {
  constructor(private fetcher: typeof fetch = (...args) => fetch(...args)) {}

  async search(input: string, signal: AbortSignal): Promise<OnlineConceptResult[]> {
    const term = cleanConceptText(input).slice(0, 300);
    if (term.length < 3) return [];
    // Search ranking can prefer a narrower, related subject over the requested
    // concept. Resolve exact titles and aliases in both languages first.
    for (const mode of ["title", "search"] as const) {
      for (const language of ["fi", "en"] as const) {
        const results = await this.lookup(term, language, mode, signal);
        if (results.length) return results;
      }
    }
    return [];
  }

  private async lookup(term: string, language: "fi" | "en", mode: "title" | "search", signal: AbortSignal): Promise<OnlineConceptResult[]> {
    signal.throwIfAborted();
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", origin: "*",
      prop: "extracts|pageprops", exintro: "1", explaintext: "1", exchars: "600", exlimit: "3",
      ppprop: "disambiguation",
    });
    if (mode === "title") {
      params.set("titles", term);
      params.set("redirects", "1");
    } else {
      params.set("generator", "search");
      params.set("gsrsearch", `intitle:"${term}"`);
      params.set("gsrnamespace", "0");
      params.set("gsrlimit", "3");
    }
    // The caller cancels on a changed query/unmount. This deadline also covers
    // reading the body, and uses APIs available in older iPhone Safari versions.
    const request = new AbortController();
    const cancel = () => request.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, 8_000);
    try {
      const response = await this.fetcher(`https://${language}.wikipedia.org/w/api.php?${params}`, {
        signal: request.signal, credentials: "omit", referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("Wikipedia request failed");
      const data = responseSchema.parse(await response.json());
      signal.throwIfAborted();
      if (data.error) throw new Error("Wikipedia search is unavailable");
      const redirects = data.query?.redirects ?? [];
      const alias = mode === "title" ? redirects.find((redirect) => cleanConceptText(redirect.from) === term) : undefined;
      const section = mode === "title" ? redirects.find((redirect) => redirect.tofragment)?.tofragment : undefined;
      return (data.query?.pages ?? [])
        .filter((page) => page.pageid !== undefined && !page.missing && !page.invalid)
        .filter((page) => mode === "search" || alias || cleanConceptText(page.title) === term)
        .sort((a, b) => Number(cleanConceptText(b.title) === term) - Number(cleanConceptText(a.title) === term)
          || (a.index ?? Infinity) - (b.index ?? Infinity))
        .slice(0, 3)
        .map((page) => ({
          id: page.pageid!, title: page.title,
          // A section redirect must not show the whole article's introduction
          // as the definition of a more specific term.
          extract: section ? "" : page.extract?.trim() ?? "",
          // Build links from the known host and numeric page ID, never API HTML/URLs.
          url: `https://${language}.wikipedia.org/?curid=${page.pageid}${section ? `#${encodeURIComponent(section.replaceAll(" ", "_"))}` : ""}`,
          language, disambiguation: page.pageprops?.disambiguation !== undefined,
          match: alias ? "redirect" : cleanConceptText(page.title) === term ? "exact" : "related",
          redirectedFrom: alias?.from, section,
        }));
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
  }
}

export const onlineConceptSearch: OnlineConceptSearch = new WikipediaConceptSearch();
