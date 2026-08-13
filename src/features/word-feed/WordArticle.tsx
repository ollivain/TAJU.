import { useSettings } from "../../app/providers/SettingsContext";
import { Squiggle } from "../../components/ui/Squiggle";
import { capitalizeWord } from "../../domain/content/capitalizeWord";
import type { Category, WordEntry } from "../../domain/content/types";
import { HeroWord } from "./HeroWord";

interface WordArticleProps {
  word: WordEntry;
  categories: Category[];
}

/** The whole screen is the word: no card, no eyebrow, hierarchy from type and space. */
export function WordArticle({ word, categories }: WordArticleProps) {
  const { settings } = useSettings();

  const categoryLabels = word.categories
    .map((id) => categories.find((category) => category.id === id)?.label)
    .filter((label): label is string => Boolean(label))
    .slice(0, 3);

  const showEtymology = Boolean(word.etymology) && settings.showEtymology;

  return (
    <article className="word-article">
      <Squiggle weight={1.2} opacity={0.5} />

      <HeroWord word={capitalizeWord(word.word)} />
      <p className="word-gloss">{word.shortDefinition}</p>

      <div className="word-sections">
        <Squiggle weight={1} opacity={0.4} />

        <h2>Selitys</h2>
        <p className="word-explanation">{word.explanation}</p>

        <h2>Esimerkki</h2>
        <p className="word-example">{word.example}</p>

        {showEtymology ? (
          <>
            <h2>Sanan alkuperä</h2>
            <p className="word-etymology">{word.etymology}</p>
          </>
        ) : null}
      </div>

      {categoryLabels.length > 0 ? (
        <p className="word-categories">{categoryLabels.join(" · ")}</p>
      ) : null}
    </article>
  );
}
