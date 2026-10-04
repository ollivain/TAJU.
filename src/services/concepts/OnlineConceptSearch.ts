import { z } from "zod";
import { cleanConceptText } from "../../domain/concepts/normalize";

export interface OnlineConceptResult {
  id: number;
  title: string;
  extract: string;
  url: string;
  language: "fi" | "en";
  disambiguation: boolean;
}

export interface OnlineConceptSearch {
  search(term: string, signal: AbortSignal): Promise<OnlineConceptResult[]>;
}

const responseSchema = z.object({
  batchcomplete: z.boolean().optional(),
  error: z.object({ code: z.string() }).optional(),
  query: z.object({ pages: z.array(z.object({
    pageid: z.number().int().positive(),
    title: z.string().min(1),
    index: z.number().optional(),
    extract: z.string().optional(),
    pageprops: z.object({ disambiguation: z.string().optional() }).optional(),
  })) }).optional(),
}).refine((data) => data.batchcomplete !== undefined || data.query || data.error);

/** Public, anonymous API: no key, server, cookies or stored search history. */
export class WikipediaConceptSearch implements OnlineConceptSearch {
  constructor(private fetcher: typeof fetch = (...args) => fetch(...args)) {}

  async search(input: string, signal: AbortSignal): Promise<OnlineConceptResult[]> {
    const term = cleanConceptText(input).slice(0, 300);
    if (term.length < 3) return [];
    for (const language of ["fi", "en"] as const) {
      signal.throwIfAborted();
      const params = new URLSearchParams({
        action: "query", format: "json", formatversion: "2", origin: "*",
        generator: "search", gsrsearch: `intitle:"${term}"`, gsrnamespace: "0", gsrlimit: "3",
        prop: "extracts|pageprops", exintro: "1", explaintext: "1", exchars: "600", exlimit: "3",
        ppprop: "disambiguation",
      });
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
        const results = (data.query?.pages ?? [])
          .sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity))
          .slice(0, 3)
          .map((page) => ({
            id: page.pageid, title: page.title, extract: page.extract?.trim() ?? "",
            // Build links from the known host and numeric page ID, never API HTML/URLs.
            url: `https://${language}.wikipedia.org/?curid=${page.pageid}`,
            language, disambiguation: page.pageprops?.disambiguation !== undefined,
          }));
        if (results.length) return results;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
      }
    }
    return [];
  }
}

export const onlineConceptSearch: OnlineConceptSearch = new WikipediaConceptSearch();
