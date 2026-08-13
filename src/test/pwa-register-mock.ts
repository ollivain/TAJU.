export const useRegisterSW = () => ({
  offlineReady: [false, () => undefined],
  needRefresh: [false, () => undefined],
  updateServiceWorker: async () => undefined,
});
