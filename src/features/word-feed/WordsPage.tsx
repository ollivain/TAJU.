import { useEffect, useMemo } from "react";
import { useUserState } from "../../app/providers/UserStateContext";
import { contentCatalog } from "../../content/loadContent";
import { selectNextWord } from "../../domain/feed/selectNextWord";
import { setKnown } from "../../services/UserStateService";
import { WordActions } from "../word-actions/WordActions";
import { WordArticle } from "./WordArticle";

export function WordsPage() {
  const userState = useUserState();
  const { words, categories } = contentCatalog;
  const currentWord = useMemo(() => {
    const currentId = userState.data.feed.currentWordId;
    return currentId ? contentCatalog.wordsById.get(currentId) : undefined;
  }, [userState.data.feed.currentWordId]);

  useEffect(() => {
    if (!userState.ready || currentWord) return;
    const first = selectNextWord(
      words,
      userState.data.words,
      userState.data.feed.recentWordIds,
    );
    if (first) userState.setCurrentWord(first.id);
  }, [currentWord, userState, words]);

  if (!userState.ready || !currentWord) {
    return (
      <div className="screen">
        <div className="screen__scroll">
          <div className="screen__inner" aria-live="polite">
            <p className="empty-note">Valitaan sinulle sanaa…</p>
          </div>
        </div>
      </div>
    );
  }

  const wordState = userState.data.words[currentWord.id];

  const nextFrom = (markKnown: boolean) => {
    const now = new Date().toISOString();
    const predictedState = markKnown
      ? setKnown(userState.data, currentWord.id, true, now)
      : userState.data;
    const recent = [
      ...predictedState.feed.recentWordIds.filter((id) => id !== currentWord.id),
      currentWord.id,
    ].slice(-20);
    const next = selectNextWord(
      words,
      predictedState.words,
      recent,
      currentWord.id,
    );
    userState.advance(currentWord.id, next?.id, markKnown);
  };

  return (
    <div className="screen">
      <div className="screen__scroll">
        <div className="screen__inner">
          {/* Remounting on the word replays the entrance the design specifies. */}
          <WordArticle key={currentWord.id} word={currentWord} categories={categories} />
        </div>
      </div>
      <WordActions
        saved={Boolean(wordState?.saved)}
        known={Boolean(wordState?.known)}
        onToggleSaved={() => userState.toggleSaved(currentWord.id)}
        onToggleKnown={() => {
          if (wordState?.known) userState.toggleKnown(currentWord.id, false);
          else nextFrom(true);
        }}
        onNext={() => nextFrom(false)}
      />
    </div>
  );
}
