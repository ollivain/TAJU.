import { Link } from "react-router-dom";
import type { Concept } from "../../domain/concepts/schema";
import { Squiggle } from "../../components/ui/Squiggle";

export function ConceptComparison({ concepts }: { concepts: [Concept, Concept] }) {
  const detailed = concepts.every((concept) => concept.comparison);
  return (
    <section className="concept-comparison" aria-label="Käsitteiden vertailu">
      <div className="section-rule"><Squiggle /><span>Rinnakkain</span><Squiggle /></div>
      <div className="concept-comparison__grid">
        {concepts.map((concept) => (
          <article key={concept.id}>
            <h2><Link to={`/kasitteet/${concept.slug}`}>{concept.name}</Link></h2>
            <p className="concept-meta" lang="en">{concept.englishName}</p>
            <dl>
              <dt>Määritelmä</dt><dd>{concept.shortDefinition}</dd>
              <dt>Toimintaperiaate</dt><dd>{concept.comparison?.mechanism ?? concept.simpleExplanation}</dd>
              {concept.comparison?.moneySource && <><dt>Mistä raha tulee?</dt><dd>{concept.comparison.moneySource}</dd></>}
              {concept.comparison?.participantStructure && <><dt>Osallistujien roolit</dt><dd>{concept.comparison.participantStructure}</dd></>}
              <dt>{detailed ? "Erottava piirre" : "Esimerkki"}</dt>
              <dd>{detailed ? concept.comparison?.distinctiveFeature : concept.example}</dd>
            </dl>
            {concept.nuanceNote && <p className="concept-comparison__note">Huomio: {concept.nuanceNote}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
