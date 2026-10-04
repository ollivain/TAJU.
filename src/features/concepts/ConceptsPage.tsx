import { useMemo, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Link, useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { SearchIcon } from "../../components/icons";
import { Squiggle } from "../../components/ui/Squiggle";
import { contentCatalog } from "../../content/loadContent";
import { parseConceptQuery } from "../../domain/concepts/query-parser";
import { searchConcepts } from "../../domain/concepts/search";
import type { VoiceStatus } from "../../services/speech/VoiceInput";
import { conceptSearchIndex, sortedConcepts } from "./catalog";
import { ConceptComparison } from "./ConceptComparison";
import { ConceptRow } from "./ConceptRow";
import { OnlineConceptFallback } from "./OnlineConceptFallback";
import { useVoiceInput } from "./useVoiceInput";
import { clearLookupMatch, createLookupIndex, lookupKey, lookupName, searchLookup } from "../../domain/search/lookup";
import { LookupResult } from "./LookupResult";
import { SavedLookups } from "./SavedLookups";

const lookupIndex = createLookupIndex(contentCatalog.concepts, contentCatalog.words);

const voiceMessages: Record<VoiceStatus, string> = {
  idle: "Sano sana tai kysy esimerkiksi: mitä tarkoittaa paradoksi?",
  starting: "Odotetaan mikrofonia. Salli käyttö selaimen lupapyynnössä.",
  listening: "Kuunnellaan… Sano kysymys ja paina lopuksi Lopeta ja hae.",
  processing: "Kuuntelu päättyi. Tunnistetaan puhetta…",
  result: "Puhe tunnistettu. Tarkista hakutulos alta.",
  "no-match": "Puhetta ei tunnistettu. Kokeile uudelleen tai sanele haku näppäimistön mikrofonilla.",
  "permission-denied": "Mikrofonin käyttö estettiin. Voit sallia sen selaimen sivustoasetuksista tai kirjoittaa haun.",
  unavailable: "Puhehaku ei ole käytettävissä. Tarkista selain ja mikrofoni tai kirjoita haku.",
  error: "Puheentunnistus ei onnistunut. Kokeile uudelleen tai kirjoita haku.",
};

export function ConceptsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  // Router navigation may be deferred. Keep keystrokes synchronous, and only
  // restore the URL's query on external/back navigation, not our own replaces.
  const [query, setQuery] = useState((params.get("q") ?? "").slice(0, 300));
  const [observedLocation, setObservedLocation] = useState(location.key);
  if (observedLocation !== location.key) {
    setObservedLocation(location.key);
    if (navigationType !== "REPLACE") setQuery((params.get("q") ?? "").slice(0, 300));
  }
  const category = params.get("category") ?? "";
  const [pageLimit, setPageLimit] = useState(30);
  const [compare, setCompare] = useState<[string, string]>(["", ""]);
  const voice = useVoiceInput();
  const busy = ["starting", "listening", "processing"].includes(voice.status);
  const parsed = useMemo(() => parseConceptQuery(query), [query]);
  const lookupMatches = useMemo(() => parsed.kind === "lookup" ? searchLookup(lookupIndex, parsed.term) : [], [parsed]);
  const matches = useMemo(() => parsed.kind === "lookup" ? searchConcepts(conceptSearchIndex, parsed.term) : [], [parsed]);
  const pairMatches = useMemo(() => parsed.kind === "compare" ? parsed.terms.map((term) => searchConcepts(conceptSearchIndex, term)) : [], [parsed]);
  const lowConfidence = voice.status === "result" && (voice.isFinal === false || ((voice.confidence ?? 0) > 0 && voice.confidence! < 0.6));
  const pairIsCertain = pairMatches.length === 2 && pairMatches.every((matches) => ["exact", "inflected"].includes(matches[0]?.kind) && matches[0]?.score !== matches[1]?.score) && !lowConfidence;
  const manualPair = compare.map((id) => contentCatalog.conceptsById.get(id));
  const pair = manualPair.every(Boolean) ? manualPair : pairIsCertain ? pairMatches.map((matches) => matches[0].concept) : [];
  const isComparison = parsed.kind === "compare";
  const searchResults = isComparison ? [...new Map(pairMatches.flat().map((match) => [match.concept.id, match])).values()] : matches;
  const filtered = (query.trim() ? searchResults.map((match) => match.concept) : sortedConcepts).filter((concept) => !category || concept.category === category);
  const isLookup = Boolean(query.trim()) && !isComparison;
  const visibleLookups = lookupMatches.filter(({ value }) => !category || (value.type === "concept" && value.concept.category === category));
  const quickAnswer = isLookup ? clearLookupMatch(lookupMatches, lowConfidence) : undefined;
  const visibleQuickAnswer = quickAnswer && visibleLookups.includes(quickAnswer) ? quickAnswer : undefined;
  const needsSuggestion = isLookup && (lowConfidence || lookupMatches[0]?.kind === "fuzzy");
  const resultCount = isLookup ? visibleLookups.length : filtered.length;
  // A category hiding an existing local hit is not a missing concept.
  const missingTerms = [...new Set(parsed.kind === "compare"
    ? parsed.terms.filter((_, position) => pairMatches[position]?.length === 0)
    : matches.length === 0 && !lookupMatches.some((match) => ["exact", "inflected", "fuzzy"].includes(match.kind))
      ? [parsed.term] : [])].filter((term) => term.length >= 3);

  function changeQuery(value: string) {
    setQuery(value);
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set("q", value); else next.delete("q");
      return next;
    }, { replace: true });
    setPageLimit(30);
    setCompare(["", ""]);
  }

  return (
    <div className="screen">
      <div className="screen__scroll">
        <div className="screen__inner screen__inner--concepts">
          <header className="concepts-header">
            <h1 className="display-heading concept-title">Käsitteet</h1>
            <p className="concepts-intro">Minkä sanan kuulit? Hae sanoista ja käsitteistä.</p>
          </header>
          <form role="search" aria-label="Käsitehaku" onSubmit={(event) => event.preventDefault()}>
            <div className="search-field concept-search">
              <SearchIcon />
              <label htmlFor="concept-search" className="sr-only">Hae sanoja ja käsitteitä</label>
              <input id="concept-search" type="search" inputMode="search" autoComplete="off" placeholder="Kirjoita sana tai kysymys…" value={query} maxLength={300} onChange={(event) => { voice.cancel(); changeQuery(event.target.value); }} />
            </div>
              <button type="button" className="concept-mic concept-mic--primary" disabled={voice.status === "processing"} aria-describedby="concept-voice-status" data-listening={voice.status === "listening"} onClick={() => voice.status === "listening" ? voice.stop() : voice.status === "starting" ? voice.cancel() : voice.start(({ transcript }) => {
                const text = transcript.slice(0, 300);
                setQuery(text);
                setParams({ q: text }, { replace: true });
                setPageLimit(30);
                setCompare(["", ""]);
              })}>
                {busy ? <Square size={18} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
                <span>{voice.status === "listening" ? "Lopeta ja hae" : voice.status === "starting" ? "Peruuta käynnistys" : voice.status === "processing" ? "Tunnistetaan…" : "Sano sana"}</span>
              </button>
            <div className="concept-voice-feedback">
              <p id="concept-voice-status" role="status" aria-live="polite">{voice.message ?? (voice.status === "result" && (isComparison ? searchResults.length : lookupMatches.length) === 0 ? "Puhe tunnistettu, mutta käsitettä ei löytynyt TAJUn aineistosta. Voit jatkaa verkkotuloksiin alla." : voiceMessages[voice.status])}</p>
              {voice.transcript && <p className="concept-transcript">{voice.isFinal === false ? "Kuultu (alustava): " : "Kuultu: "}<q>{voice.transcript}</q></p>}
              {busy && <div className="concept-voice-actions">
                <button type="button" className="text-button" onClick={voice.cancel}>Peruuta puhehaku</button>
              </div>}
              <details className="concept-voice-info"><summary>Tietoa puhehausta</summary><p>Selaimesi voi lähettää äänen puhepalveluunsa tunnistettavaksi. Puhehaku voi tarvita verkkoyhteyden. TAJU ei tallenna ääntä. iPhonen Safari voi tarvita myös Sirin ja puheentunnistuksen sallimisen. Voit myös sanella hakukenttään iPhonen näppäimistön mikrofonilla.</p></details>
            </div>
          </form>
          {visibleQuickAnswer && !busy && <LookupResult entry={visibleQuickAnswer.value} quick returnSearch={`?${params.toString()}`} />}
          {!busy && missingTerms.map((term) => <OnlineConceptFallback key={term} term={term} />)}
          {!query.trim() && <>
            <p className="lookup-shortcut-link"><Link to="/pikakomento">Hae iPhonen Toimintopainikkeella</Link></p>
            <SavedLookups />
          </>}
          <div className="concept-filter">
            <label className="settings-heading" htmlFor="concept-category">Aihe</label>
            <select id="concept-category" value={category} onChange={(event) => { setParams((previous) => {
              const next = new URLSearchParams(previous);
              if (event.target.value) next.set("category", event.target.value); else next.delete("category");
              return next;
            }, { replace: true }); setPageLimit(30); }}>
              <option value="">Kaikki aiheet</option>
              {contentCatalog.conceptCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </div>
          <details className="concept-compare-picker" open={(isComparison && !pairIsCertain) || undefined}>
            <summary>Vertaa kahta käsitettä</summary>
            <p>Valitse käsitteet tai kysy esimerkiksi: ”Mikä ero on Ponzi-huijauksella ja pyramidihuijauksella?”</p>
            <div className="concept-compare-selects">
              {[0, 1].map((position) => <label key={position}>{position === 0 ? "Ensimmäinen käsite" : "Toinen käsite"}<select value={compare[position]} onChange={(event) => setCompare((previous) => position === 0 ? [event.target.value, previous[1]] : [previous[0], event.target.value])}><option value="">Valitse käsite</option>{sortedConcepts.map((concept) => <option key={concept.id} value={concept.id} disabled={concept.id === compare[1 - position]}>{concept.name}</option>)}</select></label>)}
            </div>
          </details>
          {pair.length === 2 && pair[0] && pair[1] && pair[0].id !== pair[1].id ? <ConceptComparison concepts={[pair[0], pair[1]]} /> : isComparison ? <p className="empty-note">{pair.length === 2 ? "Valitse kaksi eri käsitettä." : "Tarkista vertailun käsitteet. Valitse molemmat yllä, jos haku jäi epävarmaksi."}</p> : null}
          <div className="section-rule concept-result-rule"><Squiggle weight={1.1} opacity={0.45} /><span role="status">{resultCount} {isLookup ? "osumaa" : "käsitettä"}{missingTerms.length > 0 ? " TAJUssa" : ""}</span><Squiggle weight={1.1} opacity={0.45} /></div>
          {needsSuggestion && visibleLookups.length > 0 ? <p className="concept-suggestion">Tarkoititko: {lookupName(visibleLookups[0].value)}? Valitse oikea sana tai käsite tuloksista.</p> : null}
          <div aria-label="Hakutulokset">{isLookup
            ? visibleLookups.slice(0, pageLimit).filter((match) => busy || match !== visibleQuickAnswer).map(({ value }) => <LookupResult key={lookupKey(value)} entry={value} returnSearch={`?${params.toString()}`} />)
            : filtered.slice(0, pageLimit).map((concept) => <ConceptRow key={concept.id} concept={concept} returnSearch={`?${params.toString()}`} />)}</div>
          {resultCount === 0 && <div className="empty-note"><p>{missingTerms.length > 0 ? "Ei hakutuloksia TAJUn aineistosta. Katso verkkotulokset yllä." : "Ei hakutuloksia. Kokeile lyhyempää hakua, suomen- tai englanninkielistä nimeä tai toista aihetta."}</p><button type="button" className="text-button text-button--accent" onClick={() => { voice.cancel(); setQuery(""); setParams({}); setCompare(["", ""]); }}>Näytä kaikki käsitteet</button></div>}
          {resultCount > pageLimit && <button type="button" className="text-button text-button--accent" onClick={() => setPageLimit((limit) => limit + 30)}>Näytä lisää ({resultCount - pageLimit})</button>}
        </div>
      </div>
    </div>
  );
}
