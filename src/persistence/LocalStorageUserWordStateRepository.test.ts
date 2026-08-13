import { beforeEach, describe, expect, it } from "vitest";
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
});
