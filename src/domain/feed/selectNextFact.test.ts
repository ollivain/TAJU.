import { describe, expect, it } from "vitest";
import type { FactEntry } from "../content/types";
import type { UserFactState } from "../user-state/types";
import { selectNextFact } from "./selectNextFact";

const facts = ["a", "b", "c"].map(
  (id): FactEntry => ({
    kind: "fact",
    id,
    slug: id,
    locale: "fi",
    fact: `Fakta ${id}`,
    explanation: `Selitys ${id}`,
    category: "tiede",
    sourceLabel: "Lähde",
    sourceUrl: "https://example.com",
  }),
);

const state = (factId: string, partial: Partial<UserFactState> = {}): UserFactState => ({
  factId,
  saved: false,
  known: false,
  seenCount: 0,
  updatedAt: "2026-08-12T10:00:00.000Z",
  ...partial,
});

describe("selectNextFact", () => {
  it("priorisoi näkemättömän faktan", () => {
    const states = {
      a: state("a", { seenCount: 2, lastSeenAt: "2026-08-12T10:00:00.000Z" }),
      b: state("b"),
      c: state("c", { seenCount: 1, lastSeenAt: "2026-08-11T10:00:00.000Z" }),
    };

    expect(selectNextFact(facts, states, [], "a", false, () => 0)?.id).toBe("b");
  });

  it("sulkee tunnetut faktat normaalista syötteestä", () => {
    const states = { b: state("b", { known: true }) };

    expect(selectNextFact(facts, states, [], "a", false, () => 0)?.id).toBe("c");
  });

  it("ei toista nykyistä faktaa heti", () => {
    expect(selectNextFact(facts, {}, [], "b", false, () => 0)?.id).toBe("a");
    expect(selectNextFact([facts[0]], {}, [], "a", false, () => 0)).toBeUndefined();
  });

  it("palauttaa tyhjän kun kaikki faktat tunnetaan", () => {
    const states = Object.fromEntries(facts.map((fact) => [fact.id, state(fact.id, { known: true })]));

    expect(selectNextFact(facts, states, [], undefined, false, () => 0)).toBeUndefined();
  });

  it("voi valita tunnettuja faktoja käyttäjän pyytäessä kertausta", () => {
    const states = Object.fromEntries(facts.map((fact) => [fact.id, state(fact.id, { known: true })]));

    expect(selectNextFact(facts, states, [], undefined, true, () => 0)?.id).toBe("a");
  });
});
