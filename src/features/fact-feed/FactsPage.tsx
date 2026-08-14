import { useEffect, useMemo, useState } from "react";
import { useUserState } from "../../app/providers/UserStateContext";
import { Squiggle } from "../../components/ui/Squiggle";
import { contentCatalog } from "../../content/loadContent";
import { selectNextFact } from "../../domain/feed/selectNextFact";
import { setFactKnown } from "../../services/UserStateService";
import { FactActions } from "./FactActions";
import { FactArticle } from "./FactArticle";

export function FactsPage() {
  const userState = useUserState();
  const { facts } = contentCatalog;
  const [revisitKnown, setRevisitKnown] = useState(false);
  const persistedCurrentFact = useMemo(() => {
    const currentId = userState.data.factFeed.currentFactId;
    return currentId ? contentCatalog.factsById.get(currentId) : undefined;
  }, [userState.data.factFeed.currentFactId]);
  const currentFact =
    persistedCurrentFact &&
    (revisitKnown || !userState.data.facts[persistedCurrentFact.id]?.known)
      ? persistedCurrentFact
      : undefined;
  const allKnown = facts.every((fact) => userState.data.facts[fact.id]?.known);

  useEffect(() => {
    if (!userState.ready || currentFact) return;

    const first = selectNextFact(
      facts,
      userState.data.facts,
      userState.data.factFeed.recentFactIds,
      persistedCurrentFact?.id,
      revisitKnown,
    );
    if (first) userState.setCurrentFact(first.id);
    else if (userState.data.factFeed.currentFactId) userState.setCurrentFact();
  }, [currentFact, facts, persistedCurrentFact?.id, revisitKnown, userState]);

  if (!userState.ready || (!currentFact && !allKnown)) {
    return (
      <div className="screen">
        <div className="screen__scroll">
          <div className="screen__inner" aria-live="polite">
            <p className="empty-note">Valitaan sinulle faktaa…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentFact) {
    return (
      <div className="screen">
        <div className="screen__scroll">
          <div className="screen__inner fact-completion">
            <Squiggle weight={1.2} opacity={0.5} />
            <h1 className="display-heading">Tiesit kaiken</h1>
            <p>Olet merkinnyt kaikki tämän kokoelman faktat tutuiksi.</p>
            <button type="button" className="text-button text-button--accent" onClick={() => setRevisitKnown(true)}>
              Näytä faktat uudelleen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const factState = userState.data.facts[currentFact.id];

  const nextFrom = (markKnown: boolean) => {
    const now = new Date().toISOString();
    const predictedState = markKnown
      ? setFactKnown(userState.data, currentFact.id, true, now)
      : userState.data;
    const recent = [
      ...predictedState.factFeed.recentFactIds.filter((id) => id !== currentFact.id),
      currentFact.id,
    ].slice(-20);
    const next = selectNextFact(
      facts,
      predictedState.facts,
      recent,
      currentFact.id,
      revisitKnown,
    );
    userState.advanceFact(currentFact.id, next?.id, markKnown);
  };

  return (
    <div className="screen">
      <div className="screen__scroll">
        <div className="screen__inner">
          <FactArticle key={currentFact.id} fact={currentFact} />
        </div>
      </div>
      <FactActions
        saved={Boolean(factState?.saved)}
        known={Boolean(factState?.known)}
        onToggleSaved={() => userState.toggleFactSaved(currentFact.id)}
        onToggleKnown={() => {
          if (factState?.known) userState.toggleFactKnown(currentFact.id, false);
          else nextFrom(true);
        }}
        onNext={() => nextFrom(false)}
      />
    </div>
  );
}
