import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppSettings } from "../../domain/settings/types";
import { LocalStorageSettingsRepository } from "../../persistence/LocalStorageSettingsRepository";
import type { SettingsRepository } from "../../persistence/SettingsRepository";
import { SettingsContext, type SettingsContextValue } from "./SettingsContext";

interface SettingsProviderProps {
  children: ReactNode;
  repository?: SettingsRepository;
}

export function SettingsProvider({ children, repository }: SettingsProviderProps) {
  const resolvedRepository = useMemo(
    () => repository ?? new LocalStorageSettingsRepository(),
    [repository],
  );
  const [settings, setSettings] = useState<AppSettings>(() => resolvedRepository.load());

  const updateSettings = useCallback<SettingsContextValue["updateSettings"]>(
    (patch) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );

  useEffect(() => {
    resolvedRepository.save(settings);
  }, [resolvedRepository, settings]);

  // The stylesheet reads the theme, text size and motion preference off the root
  // element, so a single set of data attributes drives the whole visual system.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.textSize = settings.textSize;
    root.dataset.motion = settings.motion ? "on" : "off";

    const themeColor = document.querySelector('meta[name="theme-color"]');
    const canvas = getComputedStyle(root).getPropertyValue("--color-canvas").trim();
    if (themeColor && canvas) themeColor.setAttribute("content", canvas);
  }, [settings.motion, settings.textSize, settings.theme]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, updateSettings }),
    [settings, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
