import { useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons";
import { Squiggle } from "../../components/ui/Squiggle";
import { contentCatalog } from "../../content/loadContent";
import { conceptCategoryLabels } from "./catalog";
import { ConceptRow } from "./ConceptRow";
import { SpeakButton } from "./SpeakButton";

export function ConceptDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const concept = slug ? contentCatalog.conceptsBySlug.get(slug) : undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const state = location.state as { returnSearch?: unknown } | null;
  const returnSearch = typeof state?.returnSearch === "string" && state.returnSearch.startsWith("?") ? state.returnSearch : "";

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [slug]);

  return (
    <div className="screen">
      <div className="screen__scroll" ref={scroll}>
        <div className="screen__inner concept-detail" key={slug}>
          <Link className="back-link" to={`/kasitteet${returnSearch}`}><ArrowRightIcon />Takaisin käsitteisiin</Link>
          {concept ? (
            <article>
              <p className="concept-meta">{conceptCategoryLabels.get(concept.category)}</p>
              <h1 className="display-heading concept-title" tabIndex={-1} ref={heading}>{concept.name}</h1>
              {concept.englishName && <p className="concept-english" lang="en">{concept.englishName}</p>}
              {concept.nuanceNote && <p className="concept-label">Määritelmä ja käyttötavat</p>}
              <p className="concept-definition">{concept.shortDefinition}</p>
              <SpeakButton key={concept.id} text={`${concept.name}. ${concept.shortDefinition}`} />
              <section className="concept-example" aria-label="Esimerkki">
                <h2 className="settings-heading">Esimerkki</h2>
                <p>{concept.example}</p>
              </section>
              {concept.nuanceNote && (
                <aside className="concept-nuance">
                  <h2 className="settings-heading">Tulkinta ja rajaukset</h2>
                  <p>{concept.nuanceNote}</p>
                </aside>
              )}
              <Squiggle weight={1.1} opacity={0.45} />
              <div className="concept-expanders">
                <details><summary>Selitä yksinkertaisesti</summary><p>{concept.simpleExplanation}</p></details>
                <details><summary>Ymmärrä tarkemmin</summary><p>{concept.explanation}</p></details>
                {!!concept.sources?.length && <details><summary>Lähteet ja lisälukeminen</summary><ul>{concept.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<span className="sr-only"> (avautuu uuteen välilehteen)</span></a></li>)}</ul></details>}
              </div>
              {!!concept.relatedConceptIds.length && (
                <section className="concept-related" aria-label="Liittyvät käsitteet">
                  <h2 className="settings-heading">Liittyvät käsitteet</h2>
                  {concept.relatedConceptIds.map((id) => {
                    const related = contentCatalog.conceptsById.get(id);
                    return related ? <ConceptRow key={id} concept={related} returnSearch={returnSearch} /> : null;
                  })}
                </section>
              )}
            </article>
          ) : <><h1 className="display-heading concept-title" ref={heading} tabIndex={-1}>Käsitettä ei löytynyt</h1><p className="empty-note">Tämä osoite ei vastaa julkaistua käsitettä. Palaa selaamaan käsitteitä.</p></>}
        </div>
      </div>
    </div>
  );
}
