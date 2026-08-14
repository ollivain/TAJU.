import { Squiggle } from "../../components/ui/Squiggle";
import type { FactEntry } from "../../domain/content/types";

interface FactArticleProps {
  fact: FactEntry;
}

export function FactArticle({ fact }: FactArticleProps) {
  return (
    <article className="fact-article">
      <Squiggle weight={1.2} opacity={0.5} />

      <h1 className="fact-hero" lang="fi">
        {fact.fact}
      </h1>

      <div className="fact-sections">
        <Squiggle weight={1} opacity={0.4} />
        <p className="fact-explanation">{fact.explanation}</p>

        <section className="fact-source" aria-labelledby={`source-${fact.id}`}>
          <h2 id={`source-${fact.id}`}>Lähde</h2>
          <a
            href={fact.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${fact.sourceLabel}, avautuu uuteen välilehteen`}
          >
            {fact.sourceLabel}
          </a>
        </section>
      </div>
    </article>
  );
}
