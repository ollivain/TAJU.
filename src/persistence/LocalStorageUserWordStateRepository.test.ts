import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyUserState } from "../domain/user-state/types";
import {
  LocalStorageUserWordStateRepository,
  USER_STATE_STORAGE_KEY,
} from "./LocalStorageUserWordStateRepository";

describe("LocalStorageUserWordStateRepository", () => {
  beforeEach(() => localStorage.clear());

  it("tallentaa ja palauttaa versionoidun käyttäjätilan", async () => {
    const repository = new LocalStorageUserWordStateRepository(localStorage);
    const state = createEmptyUserState();
    state.feed.currentWordId = "word-1";

    await repository.save(state);

    await expect(repository.load()).resolves.toEqual(state);
  });

  it("säilyttää tallennetun ja tunnetun faktan", async () => {
    const repository = new LocalStorageUserWordStateRepository(localStorage);
    const state = createEmptyUserState();
    state.facts["fact-1"] = {
      factId: "fact-1",
      saved: true,
      known: true,
      seenCount: 1,
      savedAt: "2026-08-14T10:00:00.000Z",
      knownAt: "2026-08-14T10:01:00.000Z",
      updatedAt: "2026-08-14T10:01:00.000Z",
    };

    await repository.save(state);

    await expect(repository.load()).resolves.toEqual(state);
  });

  it("migroi v1-sanatilat muuttamatta sana-ID:itä tai edistymistä", async () => {
    localStorage.setItem(
      USER_STATE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        words: {
          "word-1": {
            wordId: "word-1",
            saved: true,
            known: false,
            seenCount: 3,
            updatedAt: "2026-08-12T10:00:00.000Z",
          },
        },
        feed: { currentWordId: "word-1", recentWordIds: ["word-0"] },
      }),
    );

    const state = await new LocalStorageUserWordStateRepository(localStorage).load();

    expect(state.schemaVersion).toBe(2);
    expect(state.words["word-1"]).toMatchObject({
      wordId: "word-1",
      saved: true,
      known: false,
      seenCount: 3,
    });
    expect(state.feed).toEqual({ currentWordId: "word-1", recentWordIds: ["word-0"] });
    expect(state.facts).toEqual({});
    expect(state.factFeed).toEqual({ recentFactIds: [] });
  });

  it("palautuu turvallisesti korruptoituneesta JSON-datasta", async () => {
    localStorage.setItem(USER_STATE_STORAGE_KEY, "{ei-jsonia");
    const repository = new LocalStorageUserWordStateRepository(localStorage);

    await expect(repository.load()).resolves.toEqual(createEmptyUserState());
  });

  it("muuttuu hallituksi virheeksi kun localStorage-pääsy on estetty", async () => {
    const getter = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    try {
      const repository = new LocalStorageUserWordStateRepository();
      await expect(repository.load()).rejects.toThrow("localStorage is unavailable");
      await expect(repository.save(createEmptyUserState())).rejects.toThrow(
        "localStorage is unavailable",
      );
    } finally {
      getter.mockRestore();
    }
  });

  it("ei ylikirjoita uudemman version käyttäjätilaa", async () => {
    const future = JSON.stringify({ schemaVersion: 3, words: { future: true } });
    localStorage.setItem(USER_STATE_STORAGE_KEY, future);
    const repository = new LocalStorageUserWordStateRepository(localStorage);

    await expect(repository.load()).rejects.toThrow("newer schema");
    await expect(repository.save(createEmptyUserState())).rejects.toThrow("read-only");

    expect(localStorage.getItem(USER_STATE_STORAGE_KEY)).toBe(future);
  });
});
