import { createContext, useContext } from "react";
import type { AppSettings } from "../../domain/settings/types";

export interface SettingsContextValue {
  settings: AppSettings;
  updateSettings(patch: Partial<Omit<AppSettings, "schemaVersion">>): void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
