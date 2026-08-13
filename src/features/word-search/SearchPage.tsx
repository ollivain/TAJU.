import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUserState } from "../../app/providers/UserStateContext";
import { BookmarkIcon, SearchIcon } from "../../components/icons";
import { Squiggle } from "../../components/ui/Squiggle";
import { contentCatalog } from "../../content/loadContent";
import { capitalizeWord } from "../../domain/content/capitalizeWord";
import { searchWords } from "../../domain/search/searchWords";

type Filter = "all" | "saved";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const userState = useUserState();
  const trimmedQuery = query.trim();

  // The filter narrows both the browsable list and the search results, so the
  // reader can search inside their own saved words.
  const results = useMemo(() => {
    const matches = trimmedQuery
      ? searchWords(contentCatalog.words, contentCatalog.categories, trimmedQuery).map(
          (result) => result.word,
        )
      : contentCatalog.words;
    return filter === "saved"
      ? matches.filter((word) => userState.data.words[word.id]?.saved)
      : matches;
  }, [filter, trimmedQuery, userState.data.words]);

  return (
    <div className="screen">
      <div className="screen__scroll">
        <div className="screen__inner screen__inner--find">
          <h1 className="sr-only">Löydä</h1>

          <div className="search-field">
            <SearchIcon />
            <label className="sr-only" htmlFor="word-search">
              Hae sanoja
            </label>
            <input
              id="word-search"
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Hae sanaa"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {/* The approved section rule doubles as the filter: same squiggles, same
              mono eyebrow, with the label split into the two states. */}
          <div className="section-rule">
            <Squiggle weight={1.1} opacity={0.45} />
            <div className="filter-options" role="group" aria-label="Rajaus">
              <button
                type="button"
                className="filter-option"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Kaikki
              </button>
              <span className="filter-options__separator" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className="filter-option"
                aria-pressed={filter === "saved"}
                onClick={() => setFilter("saved")}
              >
                Tallennetut
              </button>
            </div>
            <Squiggle weight={1.1} opacity={0.45} />
          </div>

          <div>
            {results.map((word) => {
              const saved = Boolean(userState.data.words[word.id]?.saved);
              return (
                <Link
                  key={word.id}
                  className={`word-row${saved ? " is-saved" : ""}`}
                  to={`/sana/${word.slug}`}
                >
                  <span className="word-row__word">{capitalizeWord(word.word)}</span>
                  <span className="word-row__gloss">{word.shortDefinition}</span>
                  {saved ? <span className="sr-only">Tallennettu</span> : null}
                  <BookmarkIcon className="word-row__saved" filled />
                </Link>
              );
            })}
          </div>

          {results.length === 0 ? (
            <p className="empty-note" role="status">
              {trimmedQuery ? "Ei hakutuloksia." : "Ei vielä tallennettuja sanoja."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
