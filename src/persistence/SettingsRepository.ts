import type { AppSettings } from "../domain/settings/types";

/**
 * Reader preferences are read synchronously so the theme is applied before the
 * first paint. That is the one deliberate difference to UserWordStateRepository,
 * whose async surface leaves room for a syncing adapter later on.
 */
export interface SettingsRepository {
  load(): AppSettings;
  save(settings: AppSettings): void;
  clear(): void;
}
