import { Navigate, Route, Routes } from "react-router-dom";
import { FactsPlaceholderPage } from "../features/facts-placeholder/FactsPlaceholderPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { WordsPage } from "../features/word-feed/WordsPage";
import { SearchPage } from "../features/word-search/SearchPage";
import { WordDetailPage } from "../features/word-search/WordDetailPage";
import { AppShell } from "./AppShell";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/sanat" replace />} />
        <Route path="sanat" element={<WordsPage />} />
        <Route path="loyda" element={<SearchPage />} />
        <Route path="tieda" element={<FactsPlaceholderPage />} />
        <Route path="asetukset" element={<SettingsPage />} />
        <Route path="sana/:slug" element={<WordDetailPage />} />
        <Route path="*" element={<Navigate to="/sanat" replace />} />
      </Route>
    </Routes>
  );
}
