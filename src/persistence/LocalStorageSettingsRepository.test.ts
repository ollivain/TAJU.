import { beforeEach, describe, expect, it } from "vitest";
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
});
