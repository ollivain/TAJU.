import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "../domain/settings/types";
import {
  LocalStorageSettingsRepository,
  SETTINGS_STORAGE_KEY,
} from "./LocalStorageSettingsRepository";

describe("LocalStorageSettingsRepository", () => {
  beforeEach(() => localStorage.clear());

  it("palauttaa oletusasetukset tyhjästä tallennustilasta", () => {
    const repository = new LocalStorageSettingsRepository(localStorage);

    expect(repository.load()).toEqual(createDefaultSettings());
  });

  it("tallentaa ja palauttaa lukijan asetukset", () => {
    const repository = new LocalStorageSettingsRepository(localStorage);
    const settings = { ...createDefaultSettings(), theme: "hiili" as const, motion: false };

    repository.save(settings);

    expect(repository.load()).toEqual(settings);
  });

  it("korvaa tuntemattomat arvot oletuksilla", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, theme: "neon", textSize: "suuri", motion: "kyllä" }),
    );
    const repository = new LocalStorageSettingsRepository(localStorage);

    expect(repository.load()).toEqual({
      ...createDefaultSettings(),
      textSize: "suuri",
    });
  });

  it("palautuu turvallisesti korruptoituneesta JSON-datasta", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{ei-jsonia");
    const repository = new LocalStorageSettingsRepository(localStorage);

    expect(repository.load()).toEqual(createDefaultSettings());
  });

  it("ei kaada alustusta kun localStorage-pääsy on estetty", () => {
    const getter = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    try {
      const repository = new LocalStorageSettingsRepository();
      expect(repository.load()).toEqual(createDefaultSettings());
      expect(() => repository.save(createDefaultSettings())).not.toThrow();
    } finally {
      getter.mockRestore();
    }
  });

  it("ei ylikirjoita uudemman version asetuksia", () => {
    const future = JSON.stringify({ schemaVersion: 2, theme: "future-theme" });
    localStorage.setItem(SETTINGS_STORAGE_KEY, future);
    const repository = new LocalStorageSettingsRepository(localStorage);

    expect(repository.load()).toEqual(createDefaultSettings());
    repository.save(createDefaultSettings());

    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(future);
  });
});
