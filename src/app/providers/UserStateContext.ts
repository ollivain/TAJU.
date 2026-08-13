import { createContext, useContext } from "react";
import type { PersistedUserState } from "../../domain/user-state/types";

export interface UserStateContextValue {
  data: PersistedUserState;
  ready: boolean;
  storageError: boolean;
  toggleSaved(wordId: string): void;
  toggleKnown(wordId: string, known?: boolean): void;
  setCurrentWord(wordId: string): void;
  advance(currentWordId: string, nextWordId?: string, markKnown?: boolean): void;
  /** Clears saved and known words and the feed position. Settings are untouched. */
  resetProgress(): void;
  dismissStorageError(): void;
}

export const UserStateContext = createContext<UserStateContextValue | null>(null);

export const useUserState = (): UserStateContextValue => {
  const context = useContext(UserStateContext);
  if (!context) throw new Error("useUserState must be used within UserStateProvider");
  return context;
};
