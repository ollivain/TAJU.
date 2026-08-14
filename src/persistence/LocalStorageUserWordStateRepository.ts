import { createEmptyUserState, type PersistedUserState } from "../domain/user-state/types";
import { getLocalStorage } from "./getLocalStorage";
import type { UserWordStateRepository } from "./UserWordStateRepository";
import { migrateUserState } from "./migrations";

export const USER_STATE_STORAGE_KEY = "taju:user-state:v1";

const isFutureSchema = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "schemaVersion" in value &&
  typeof value.schemaVersion === "number" &&
  value.schemaVersion > 2;

export class LocalStorageUserWordStateRepository implements UserWordStateRepository {
  private writable = true;

  constructor(private readonly storage: Storage | undefined = getLocalStorage()) {}

  async load(): Promise<PersistedUserState> {
    if (!this.storage) throw new Error("localStorage is unavailable");
    const raw = this.storage.getItem(USER_STATE_STORAGE_KEY);
    if (!raw) return createEmptyUserState();

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isFutureSchema(parsed)) {
        this.writable = false;
        throw new Error("Stored user state uses a newer schema");
      }
      return migrateUserState(parsed);
    } catch {
      if (!this.writable) throw new Error("Stored user state uses a newer schema");
      return createEmptyUserState();
    }
  }

  async save(state: PersistedUserState): Promise<void> {
    if (!this.storage || !this.writable) throw new Error("localStorage is unavailable or read-only");
    this.storage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    if (!this.storage || !this.writable) throw new Error("localStorage is unavailable or read-only");
    this.storage.removeItem(USER_STATE_STORAGE_KEY);
  }
}
