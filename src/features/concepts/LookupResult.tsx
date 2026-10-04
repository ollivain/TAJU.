import { Link } from "react-router-dom";
import { useUserState } from "../../app/providers/UserStateContext";
import { ArrowRightIcon, BookmarkIcon } from "../../components/icons";
import { lookupName, type LookupEntry } from "../../domain/search/lookup";

export function SaveConceptButton({ conceptId }: { conceptId: string }) {
  const user = useUserState();
  const saved = user.data.savedConcepts.includes(conceptId);
  return <button className="text-button lookup-save" type="button" disabled={!user.ready} aria-pressed={saved} onClick={() => user.toggleConceptSaved(conceptId)}>
    <BookmarkIcon filled={saved} />{saved ? "Tallennettu" : "Tallenna myöhemmäksi"}
  </button>;
}

export function LookupResult({ entry, quick = false, returnSearch = "" }: { entry: LookupEntry; quick?: boolean; returnSearch?: string }) {
  const user = useUserState();
  const item = entry.type === "concept" ? entry.concept : entry.word;
  const saved = entry.type === "concept" ? user.data.savedConcepts.includes(item.id) : Boolean(user.data.words[item.id]?.saved);
  const path = entry.type === "concept" ? `/kasitteet/${item.slug}` : `/sana/${item.slug}`;
  return <article className={quick ? "quick-answer" : "lookup-result"} aria-label={quick ? "Nopea selitys" : undefined}>
    <Link className={`word-row ${entry.type === "concept" ? "concept-row" : "lookup-word-row"}`} to={path} state={{ returnSearch, fromLookup: true }}>
      <div className="concept-row__body">
        {quick ? <h2 className="word-row__word">{lookupName(entry)}</h2> : <span className="word-row__word">{lookupName(entry)}</span>}
        <span className="concept-row__definition">{item.shortDefinition}</span>
        {quick && <span className="lookup-example"><span>Esimerkki</span>{item.example}</span>}
        {quick && entry.type === "concept" && entry.concept.nuanceNote && <span className="concept-meta">{entry.concept.nuanceNote}</span>}
        <span className="concept-meta">{quick ? "Lue lisää" : entry.type === "concept" ? "Käsite" : "Sana"}</span>
      </div>
      <ArrowRightIcon />
    </Link>
    {quick && <button className="text-button lookup-save" type="button" disabled={!user.ready} aria-pressed={saved} onClick={() => entry.type === "concept" ? user.toggleConceptSaved(item.id) : user.toggleSaved(item.id)}>
      <BookmarkIcon filled={saved} />{saved ? "Tallennettu" : "Tallenna myöhemmäksi"}
    </button>}
  </article>;
}
