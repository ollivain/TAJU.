import { Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
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
      <header className="app-header">
        <NavLink
          to="/asetukset"
          className={({ isActive }) => `settings-link${isActive ? " is-active" : ""}`}
          aria-label="Asetukset"
          title="Asetukset"
        >
          <Settings size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" />
        </NavLink>
      </header>
      <PwaStatus />
      {storageError ? (
        <div className="notice" role="status">
          <span>Muutokset säilyvät nyt vain tämän istunnon ajan.</span>
          <button type="button" onClick={dismissStorageError}>
            Sulje
          </button>
        </div>
      ) : null}
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
