import { describe, expect, it } from "vitest";
import type { WordEntry } from "../content/types";
import type { UserWordState } from "../user-state/types";
import { selectNextWord } from "./selectNextWord";

const words = ["a", "b", "c"].map(
  (id): WordEntry => ({
    kind: "word",
    id,
    slug: id,
    locale: "fi",
    word: id,
    shortDefinition: "Lyhyt määritelmä",
    explanation: "Tarpeeksi pitkä selitys testitietueelle.",
    example: "Tämä on esimerkkilause.",
    categories: ["tiede"],
    difficulty: "familiar",
  }),
);

const state = (wordId: string, partial: Partial<UserWordState> = {}): UserWordState => ({
  wordId,
  saved: false,
  known: false,
  seenCount: 0,
  updatedAt: "2026-08-12T10:00:00.000Z",
  ...partial,
});

describe("selectNextWord", () => {
  it("priorisoi näkemättömän ja ohittaa viimeksi nähdyn", () => {
    const states = {
      a: state("a", { seenCount: 2, lastSeenAt: "2026-08-12T10:00:00.000Z" }),
      b: state("b"),
    };
    expect(selectNextWord(words, states, ["c"], "a", () => 0)?.id).toBe("b");
  });

  it("jättää osatut sanat normaalin feedin ulkopuolelle", () => {
    const states = { b: state("b", { known: true }) };
    expect(selectNextWord(words, states, [], "a", () => 0)?.id).toBe("c");
  });

  it("väljentää recent-rajausta kun muutoin ei ole ehdokkaita", () => {
    expect(selectNextWord(words, {}, ["b", "c"], "a", () => 0)?.id).toBe("b");
  });

  it("tarjoaa vähiten äskettäin nähdyn sanan kun kaikki on osattu", () => {
    const states = {
      a: state("a", { known: true, seenCount: 2, lastSeenAt: "2026-08-12T12:00:00.000Z" }),
      b: state("b", { known: true, seenCount: 2, lastSeenAt: "2026-08-10T12:00:00.000Z" }),
      c: state("c", { known: true, seenCount: 2, lastSeenAt: "2026-08-11T12:00:00.000Z" }),
    };
    expect(selectNextWord(words, states, [], "a", () => 0)?.id).toBe("b");
  });
});
