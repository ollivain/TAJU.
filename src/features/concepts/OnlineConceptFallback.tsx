import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { onlineConceptSearch, type OnlineConceptResult } from "../../services/concepts/OnlineConceptSearch";
import { SpeakButton } from "./SpeakButton";

type SearchState = { status: "waiting" | "loading" | "error" } | { status: "done"; results: OnlineConceptResult[] };

/** Mounted with the term as its key: a new query cannot inherit old results. */
export function OnlineConceptFallback({ term }: { term: string }) {
  const [state, setState] = useState<SearchState>({ status: "waiting" });
  const [attempt, setAttempt] = useState(0);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const connected = () => { setState({ status: "waiting" }); setOnline(true); };
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: "loading" });
      void onlineConceptSearch.search(term, controller.signal).then((results) => {
        if (!controller.signal.aborted) setState({ status: "done", results });
      }, () => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, attempt, online]);

  const results = online && state.status === "done" ? state.results : [];
  const message = !online ? "Verkkohaku tarvitsee internetyhteyden. TAJUn omat käsitteet toimivat myös offline-tilassa."
    : state.status === "waiting" || state.status === "loading" ? "Etsitään Wikipediasta…"
      : state.status === "error" ? "Verkkohaku ei onnistunut. Kokeile uudelleen tai jatka Googleen."
        : results.some((result) => result.match !== "related") ? "Kysytty käsite löytyi Wikipediasta."
          : results.length ? "Täsmällistä käsitettä ei löytynyt. Alla on aiheeseen liittyviä hakutuloksia."
          : "Wikipediasta ei löytynyt osumaa. Kokeile toista nimeä tai jatka Googleen.";

  return (
    <section className="concept-online" aria-label={`Verkosta: ${term}`}>
      <h2 className="settings-heading">Verkosta: {term}</h2>
      <p className="concept-online__status" role="status">{message}</p>
      {results.map((result) => <article className="concept-online__result" key={`${result.language}:${result.id}`}>
        <p className="concept-meta">Wikipedia · {result.language === "fi" ? "Suomi" : "Englanti"}</p>
        <h3><a href={result.url} target="_blank" rel="noreferrer"><span lang={result.language}>{result.redirectedFrom ?? result.title}</span><ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only"> (avautuu uuteen välilehteen)</span></a></h3>
        {result.redirectedFrom && <p className="concept-meta">Wikipedian ohjaus · Lähdeartikkeli: {result.title}</p>}
        {result.disambiguation ? <p>Termillä on useita merkityksiä. Valitse oikea Wikipediassa.</p>
          : result.section ? <p>Käsite löytyy lähdeartikkelin osiosta ”{result.section.replaceAll("_", " ")}”. Avaa lähde lukeaksesi sen.</p>
            : result.extract ? <p lang={result.language}>{result.extract}</p>
            : <p>Avaa lähde lukeaksesi lisää.</p>}
        {result.extract && !result.disambiguation && !result.section && <SpeakButton text={`${result.title}. ${result.extract}`} lang={result.language === "en" ? "en-US" : "fi-FI"} />}
      </article>)}
      <div className="concept-online__actions">
        {online && state.status === "error" && <button type="button" className="text-button text-button--accent" onClick={() => { setState({ status: "waiting" }); setAttempt((value) => value + 1); }}>Yritä verkkohakua uudelleen</button>}
        <a className="text-button text-button--accent" href={`https://www.google.com/search?${new URLSearchParams({ q: term })}`} target="_blank" rel="noreferrer">Hae Googlesta<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (avautuu uuteen välilehteen)</span></a>
      </div>
      {results.length > 0 && <p className="concept-online__credit">Katkelmat: Wikipedia ja sen kirjoittajat · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0<span className="sr-only"> (avautuu uuteen välilehteen)</span></a>. Verkkotulokset eivät kuulu TAJUn omaan aineistoon.</p>}
    </section>
  );
}
