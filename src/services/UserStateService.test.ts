import { describe, expect, it } from "vitest";
import { createEmptyUserState } from "../domain/user-state/types";
import { advanceFeed, setKnown, toggleSaved } from "./UserStateService";

const now = "2026-08-12T10:00:00.000Z";

describe("UserStateService", () => {
  it("pitää tallennettu- ja osattu-tilat toisistaan riippumattomina", () => {
    const saved = toggleSaved(createEmptyUserState(), "word-1", now);
    const known = setKnown(saved, "word-1", true, now);

    expect(known.words["word-1"]).toMatchObject({ saved: true, known: true });
  });

  it("merkitsee poistuvan kortin nähdyksi ja rajaa recent-listan", () => {
    const initial = createEmptyUserState();
    initial.feed.recentWordIds = Array.from({ length: 20 }, (_, index) => `old-${index}`);

    const next = advanceFeed(initial, "word-1", "word-2", now);

    expect(next.words["word-1"]?.seenCount).toBe(1);
    expect(next.feed.currentWordId).toBe("word-2");
    expect(next.feed.recentWordIds).toHaveLength(20);
    expect(next.feed.recentWordIds.at(-1)).toBe("word-1");
  });
});
