/** Keep letters intact for display and external search (e.g. sää, not saa). */
export function cleanConceptText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("fi").replace(/(\p{L}):(?=\p{L})/gu, "$1")
    .replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

/** Same accent-insensitive normalization for the local index and all inputs. */
export function normalizeConceptText(value: string): string {
  return cleanConceptText(value.normalize("NFKD").replace(/\p{M}/gu, ""));
}

/** Deliberately limited Finnish case handling, not a general-purpose stemmer. */
export function isInflectedForm(query: string, term: string): boolean {
  if (query === term) return true;
  const stems = [term];
  if (term.endsWith("us")) stems.push(`${term.slice(0, -2)}ukse`);
  const suffixes = ["n", "a", "ta", "ssa", "sta", "lla", "lta", "lle", "na", "ksi", "en"];
  return term.length >= 4 && stems.some((stem) => suffixes.some((suffix) => query === stem + suffix));
}
