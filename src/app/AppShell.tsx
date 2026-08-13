import { Outlet } from "react-router-dom";
import { RoughEdgeDefs } from "../components/ui/RoughEdgeDefs";
import { PwaStatus } from "../pwa/PwaStatus";
import { BottomNavigation } from "./navigation/BottomNavigation";
import { useUserState } from "./providers/UserStateContext";

export function AppShell() {
  const { storageError, dismissStorageError } = useUserState();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Siirry sisältöön
      </a>
      <RoughEdgeDefs />
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      <BottomNavigation />
      <PwaStatus />
      {storageError ? (
        <div className="notice" role="status">
          <span>Muutokset säilyvät nyt vain tämän istunnon ajan.</span>
          <button type="button" onClick={dismissStorageError}>
            Sulje
          </button>
        </div>
      ) : null}
    </div>
  );
}
