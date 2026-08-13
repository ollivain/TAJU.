/** Access can itself throw when browser storage is blocked by policy. */
export const getLocalStorage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};
