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
    const future = JSON.stringify({ schemaVersion: 2, words: { future: true } });
    localStorage.setItem(USER_STATE_STORAGE_KEY, future);
    const repository = new LocalStorageUserWordStateRepository(localStorage);

    await expect(repository.load()).rejects.toThrow("newer schema");
    await expect(repository.save(createEmptyUserState())).rejects.toThrow("read-only");

    expect(localStorage.getItem(USER_STATE_STORAGE_KEY)).toBe(future);
  });
});
