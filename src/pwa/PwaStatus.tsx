import { RefreshCw, WifiOff } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="notice" role="status">
      {needRefresh ? <RefreshCw size={19} aria-hidden="true" /> : <WifiOff size={19} aria-hidden="true" />}
      <span>{needRefresh ? "Uusi versio on saatavilla." : "TAJU toimii nyt myös offline-tilassa."}</span>
      {needRefresh ? (
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Päivitä
        </button>
      ) : null}
      <button
        type="button"
        className="notice__close"
        aria-label="Sulje ilmoitus"
        onClick={() => {
          setOfflineReady(false);
          setNeedRefresh(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
