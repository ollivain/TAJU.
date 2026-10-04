import { useUserState } from "../../app/providers/UserStateContext";
import { contentCatalog } from "../../content/loadContent";
import { lookupKey, type LookupEntry } from "../../domain/search/lookup";
import { LookupResult } from "./LookupResult";

export function SavedLookups() {
  const user = useUserState();
  const entries: LookupEntry[] = [
    ...contentCatalog.concepts.filter((concept) => user.data.savedConcepts.includes(concept.id)).map((concept) => ({ type: "concept" as const, concept })),
    ...contentCatalog.words.filter((word) => user.data.words[word.id]?.saved).map((word) => ({ type: "word" as const, word })),
  ];
  return <details className="saved-lookups">
    <summary>Tallennetut ({entries.length})</summary>
    {entries.length ? entries.map((entry) => <LookupResult key={lookupKey(entry)} entry={entry} />)
      : <p className="concepts-intro">Tallenna kiinnostava sana tai käsite hakutuloksesta ja palaa siihen myöhemmin.</p>}
  </details>;
}
