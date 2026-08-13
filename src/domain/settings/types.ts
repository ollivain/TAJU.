export const THEMES = [
  { id: "puuteri", label: "Puuteri" },
  { id: "paperi", label: "Paperi" },
  { id: "salvia", label: "Salvia" },
  { id: "hiekka", label: "Hiekka" },
  { id: "hiili", label: "Hiili" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const TEXT_SIZES = [
  { id: "pieni", label: "Pieni" },
  { id: "normaali", label: "Normaali" },
  { id: "suuri", label: "Suuri" },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];

/** Reader preferences. Device-local and independent of word progress. */
export interface AppSettings {
  schemaVersion: 1;
  theme: ThemeId;
  textSize: TextSizeId;
  motion: boolean;
  showEtymology: boolean;
}

export const createDefaultSettings = (): AppSettings => ({
  schemaVersion: 1,
  theme: "puuteri",
  textSize: "normaali",
  motion: true,
  showEtymology: true,
});

export const isThemeId = (value: unknown): value is ThemeId =>
  THEMES.some((theme) => theme.id === value);

export const isTextSizeId = (value: unknown): value is TextSizeId =>
  TEXT_SIZES.some((size) => size.id === value);

export const themeLabel = (id: ThemeId): string =>
  THEMES.find((theme) => theme.id === id)?.label ?? id;
