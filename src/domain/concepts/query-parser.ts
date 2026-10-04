import { normalizeConceptText } from "./normalize";

export type ConceptQuery = { kind: "lookup"; term: string } | { kind: "compare"; terms: [string, string] };

export function parseConceptQuery(input: string): ConceptQuery {
  const query = normalizeConceptText(input).slice(0, 300);
  const comparison = /^(?:mika ero on|mita eroa on|vertaa|compare|what is the difference between) (.+)$/.exec(query);
  const body = comparison?.[1]?.replace(/\s+(?:valilla|keskenaan)$/, "") ?? query;
  const pair = body.split(comparison ? /\s+(?:ja|and|vs|versus)\s+/ : /\s+(?:vs|versus)\s+/);
  if (pair.length === 2 && pair.every(Boolean)) return { kind: "compare", terms: [pair[0], pair[1]] };
  const term = query
    .replace(/^(?:mika on|mita tarkoittaa|mita on|selita|kerro kasitteesta|what is|explain)\s+/, "")
    .replace(/^mita\s+(.+?)\s+tarkoittaa$/, "$1");
  return { kind: "lookup", term };
}
