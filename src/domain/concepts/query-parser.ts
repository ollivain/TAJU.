import { cleanConceptText } from "./normalize";

export type ConceptQuery = { kind: "lookup"; term: string } | { kind: "compare"; terms: [string, string] };

export function parseConceptQuery(input: string): ConceptQuery {
  const query = cleanConceptText(input).slice(0, 300);
  const comparison = /^(?:mik[aä] ero on|mit[aä] eroa on|vertaa|compare|what is the difference between) (.+)$/.exec(query);
  const body = comparison?.[1]?.replace(/\s+(?:v[aä]lill[aä]|kesken[aä][aä]n)$/, "") ?? query;
  const pair = body.split(comparison ? /\s+(?:ja|and|vs|versus)\s+/ : /\s+(?:vs|versus)\s+/);
  if (pair.length === 2 && pair.every(Boolean)) return { kind: "compare", terms: [pair[0], pair[1]] };
  const term = query
    .replace(/^(?:mik[aä] on|mit[aä] tarkoittaa|mit[aä] on|selit[aä]|kerro k[aä]sitteest[aä]|what is|explain)\s+/, "")
    .replace(/^mit[aä]\s+(.+?)\s+tarkoittaa$/, "$1");
  return { kind: "lookup", term };
}
