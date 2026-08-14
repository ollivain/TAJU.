import { ArrowRightIcon, BookmarkIcon, CheckIcon } from "../../components/icons";

interface FactActionsProps {
  saved: boolean;
  known: boolean;
  onToggleSaved(): void;
  onToggleKnown(): void;
  onNext(): void;
}

export function FactActions({
  saved,
  known,
  onToggleSaved,
  onToggleKnown,
  onNext,
}: FactActionsProps) {
  return (
    <div className="word-actions-bar">
      <div className="word-actions" role="group" aria-label="Faktan toiminnot">
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
          <span>Tiesin tämän</span>
        </button>

        <button type="button" className="word-next" onClick={onNext}>
          <span>Seuraava</span>
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}
