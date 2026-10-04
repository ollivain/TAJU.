import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../../components/icons";
import type { Concept } from "../../domain/concepts/schema";
import { conceptCategoryLabels } from "./catalog";

export function ConceptRow({ concept, returnSearch = "" }: { concept: Concept; returnSearch?: string }) {
  return (
    <Link className="word-row concept-row" to={`/kasitteet/${concept.slug}`} state={{ returnSearch }}>
      <span className="concept-row__body">
        <span className="word-row__word">{concept.name}</span>
        <span className="concept-row__definition">{concept.shortDefinition}</span>
        <span className="concept-meta">{conceptCategoryLabels.get(concept.category)}</span>
      </span>
      <ArrowRightIcon />
    </Link>
  );
}
