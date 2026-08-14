import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { createEmptyUserState, type PersistedUserState } from "../../domain/user-state/types";
import { LocalStorageUserWordStateRepository } from "../../persistence/LocalStorageUserWordStateRepository";
import type { UserWordStateRepository } from "../../persistence/UserWordStateRepository";
import {
  advanceFactFeed,
  advanceFeed,
  setCurrentFact,
  setCurrentWord,
  setFactKnown,
  setKnown,
  toggleFactSaved,
  toggleSaved,
} from "../../services/UserStateService";
import { UserStateContext, type UserStateContextValue } from "./UserStateContext";

interface ProviderState {
  data: PersistedUserState;
  ready: boolean;
  storageError: boolean;
}

type ProviderAction =
  | { type: "hydrate"; data: PersistedUserState }
  | { type: "replace"; data: PersistedUserState }
  | { type: "storage-error" }
  | { type: "dismiss-error" };

const reducer = (state: ProviderState, action: ProviderAction): ProviderState => {
  switch (action.type) {
    case "hydrate":
      return { data: action.data, ready: true, storageError: false };
    case "replace":
      return { ...state, data: action.data };
    case "storage-error":
      return { ...state, storageError: true, ready: true };
    case "dismiss-error":
      return { ...state, storageError: false };
  }
};

interface UserStateProviderProps {
  children: ReactNode;
  repository?: UserWordStateRepository;
}

export function UserStateProvider({ children, repository }: UserStateProviderProps) {
  const resolvedRepository = useMemo(
    () => repository ?? new LocalStorageUserWordStateRepository(),
    [repository],
  );
  const [state, dispatch] = useReducer(reducer, {
    data: createEmptyUserState(),
    ready: false,
    storageError: false,
  });
  const dataRef = useRef(state.data);

  useEffect(() => {
    let cancelled = false;
    resolvedRepository
      .load()
      .then((data) => {
        if (cancelled) return;
        dataRef.current = data;
        dispatch({ type: "hydrate", data });
      })
      .catch(() => {
        if (cancelled) return;
        const emptyState = createEmptyUserState();
        dataRef.current = emptyState;
        dispatch({ type: "hydrate", data: emptyState });
        dispatch({ type: "storage-error" });
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedRepository]);

  const commit = useCallback(
    (update: (current: PersistedUserState) => PersistedUserState) => {
      const next = update(dataRef.current);
      dataRef.current = next;
      dispatch({ type: "replace", data: next });
      void resolvedRepository.save(next).catch(() => dispatch({ type: "storage-error" }));
    },
    [resolvedRepository],
  );

  const value = useMemo<UserStateContextValue>(
    () => ({
      ...state,
      toggleSaved: (wordId) => commit((current) => toggleSaved(current, wordId, new Date().toISOString())),
      toggleKnown: (wordId, known) =>
        commit((current) =>
          setKnown(
            current,
            wordId,
            known ?? !current.words[wordId]?.known,
            new Date().toISOString(),
          ),
        ),
      setCurrentWord: (wordId) => commit((current) => setCurrentWord(current, wordId)),
      advance: (currentWordId, nextWordId, markKnown = false) =>
        commit((current) => {
          const now = new Date().toISOString();
          const withKnown = markKnown ? setKnown(current, currentWordId, true, now) : current;
          return advanceFeed(withKnown, currentWordId, nextWordId, now);
        }),
      toggleFactSaved: (factId) =>
        commit((current) => toggleFactSaved(current, factId, new Date().toISOString())),
      toggleFactKnown: (factId, known) =>
        commit((current) =>
          setFactKnown(
            current,
            factId,
            known ?? !current.facts[factId]?.known,
            new Date().toISOString(),
          ),
        ),
      setCurrentFact: (factId) => commit((current) => setCurrentFact(current, factId)),
      advanceFact: (currentFactId, nextFactId, markKnown = false) =>
        commit((current) => {
          const now = new Date().toISOString();
          const withKnown = markKnown
            ? setFactKnown(current, currentFactId, true, now)
            : current;
          return advanceFactFeed(withKnown, currentFactId, nextFactId, now);
        }),
      resetProgress: () => commit(() => createEmptyUserState()),
      dismissStorageError: () => dispatch({ type: "dismiss-error" }),
    }),
    [commit, state],
  );

  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}
