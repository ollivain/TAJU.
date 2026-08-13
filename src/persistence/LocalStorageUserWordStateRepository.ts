import { createEmptyUserState, type PersistedUserState } from "../domain/user-state/types";
import type { UserWordStateRepository } from "./UserWordStateRepository";
import { migrateUserState } from "./migrations";

export const USER_STATE_STORAGE_KEY = "taju:user-state:v1";

export class LocalStorageUserWordStateRepository implements UserWordStateRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async load(): Promise<PersistedUserState> {
    const raw = this.storage.getItem(USER_STATE_STORAGE_KEY);
    if (!raw) return createEmptyUserState();

    try {
      return migrateUserState(JSON.parse(raw) as unknown);
    } catch {
      return createEmptyUserState();
    }
  }

  async save(state: PersistedUserState): Promise<void> {
    this.storage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(USER_STATE_STORAGE_KEY);
  }
}
