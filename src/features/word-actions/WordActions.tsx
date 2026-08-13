import { ArrowRightIcon, BookmarkIcon, CheckIcon } from "../../components/icons";

interface WordActionsProps {
  saved: boolean;
  known: boolean;
  onToggleSaved(): void;
  onToggleKnown(): void;
  onNext?(): void;
}

/**
 * Sits between the scrolling word and the navigation, so the three decisions a
 * reader can make stay reachable while the text scrolls underneath.
 */
export function WordActions({
  saved,
  known,
  onToggleSaved,
  onToggleKnown,
  onNext,
}: WordActionsProps) {
  return (
    <div className="word-actions-bar">
      <div className="word-actions" role="group" aria-label="Sanan toiminnot">
        <button
          type="button"
          className={`word-action${saved ? " is-active" : ""}`}
          aria-pressed={saved}
          onClick={onToggleSaved}
        >
          <BookmarkIcon className="word-action__icon" filled={saved} />
          <span>{saved ? "Tallennettu" : "Tallenna"}</span>
        </button>

        <button
          type="button"
          className={`word-action${known ? " is-active" : ""}`}
          aria-pressed={known}
          onClick={onToggleKnown}
        >
          <CheckIcon className="word-action__icon" strong={known} />
          <span>Osaan tämän</span>
        </button>

        {onNext ? (
          <button type="button" className="word-next" onClick={onNext}>
            <span>Seuraava</span>
            <ArrowRightIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}
