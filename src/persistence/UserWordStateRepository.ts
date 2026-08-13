import type { PersistedUserState } from "../domain/user-state/types";

export interface UserWordStateRepository {
  load(): Promise<PersistedUserState>;
  save(state: PersistedUserState): Promise<void>;
  clear(): Promise<void>;
}
