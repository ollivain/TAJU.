import {
  createDefaultSettings,
  isTextSizeId,
  isThemeId,
  type AppSettings,
} from "../domain/settings/types";
import type { SettingsRepository } from "./SettingsRepository";

export const SETTINGS_STORAGE_KEY = "taju:settings:v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Unknown or partial documents fall back to the defaults field by field. */
export const migrateSettings = (value: unknown): AppSettings => {
  const defaults = createDefaultSettings();
  if (!isRecord(value) || value.schemaVersion !== 1) return defaults;

  return {
    schemaVersion: 1,
    theme: isThemeId(value.theme) ? value.theme : defaults.theme,
    textSize: isTextSizeId(value.textSize) ? value.textSize : defaults.textSize,
    motion: typeof value.motion === "boolean" ? value.motion : defaults.motion,
    showEtymology:
      typeof value.showEtymology === "boolean" ? value.showEtymology : defaults.showEtymology,
  };
};

export class LocalStorageSettingsRepository implements SettingsRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): AppSettings {
    try {
      const raw = this.storage.getItem(SETTINGS_STORAGE_KEY);
      return raw ? migrateSettings(JSON.parse(raw) as unknown) : createDefaultSettings();
    } catch {
      return createDefaultSettings();
    }
  }

  save(settings: AppSettings): void {
    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Preferences are best effort; a full or blocked store must not break the UI.
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Nothing to recover from – the next load falls back to defaults.
    }
  }
}
