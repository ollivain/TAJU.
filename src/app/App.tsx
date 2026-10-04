import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSettings } from "./providers/SettingsContext";
import { FactsPage } from "../features/fact-feed/FactsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { WordsPage } from "../features/word-feed/WordsPage";
import { SearchPage } from "../features/word-search/SearchPage";
import { WordDetailPage } from "../features/word-search/WordDetailPage";
import { AppShell } from "./AppShell";
import { ConceptsPage } from "../features/concepts/ConceptsPage";
import { ConceptDetailPage } from "../features/concepts/ConceptDetailPage";
import { ShortcutGuide } from "../features/settings/ShortcutGuide";

export function App() {
  const { settings } = useSettings();
  const location = useLocation();
  // Older installed PWAs launch /sanat. Honor their home preference once at
  // startup, while keeping in-app Sanat links and other deep links explicit.
  const [legacyLaunchKey] = useState(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone;
    return standalone && location.pathname === "/sanat" && !location.search && !location.hash
      ? location.key : null;
  });
  const home = `/${settings.homePage}`;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={home} replace />} />
        <Route path="sanat" element={legacyLaunchKey === location.key && settings.homePage !== "sanat"
          ? <Navigate to={home} replace /> : <WordsPage />} />
        <Route path="hae" element={<Navigate to={{ pathname: "/kasitteet", search: location.search }} replace />} />
        <Route path="loyda" element={<SearchPage />} />
        <Route path="tieda" element={<FactsPage />} />
        <Route path="kasitteet" element={<ConceptsPage />} />
        <Route path="kasitteet/:slug" element={<ConceptDetailPage />} />
        <Route path="asetukset" element={<SettingsPage />} />
        <Route path="pikakomento" element={<ShortcutGuide />} />
        <Route path="sana/:slug" element={<WordDetailPage />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Route>
    </Routes>
  );
}
