import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://*.wikipedia.org/w/api.php?*", (route) => route.fulfill({ json: { batchcomplete: true } }));
});

test("home preference survives reload and leaves explicit routes intact", async ({ page }) => {
  await page.goto("/asetukset");
  await page.getByRole("group", { name: "Etusivu" }).getByRole("button", { name: "Käsitteet" }).click();
  await page.getByRole("link", { name: "Avaa etusivu", exact: true }).click();
  await expect(page).toHaveURL(/\/kasitteet$/);
  await page.goto("/");
  await expect(page.getByRole("searchbox", { name: "Hae sanoja ja käsitteitä" })).toBeVisible();
  await page.goto("/sanat");
  await expect(page.getByRole("button", { name: "Seuraava" })).toBeVisible();
  await page.goto("/kasitteet/oikofobia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oikofobia");
  await page.goto("/asetukset");
  await expect(page.getByRole("group", { name: "Etusivu" }).getByRole("button", { name: "Käsitteet" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "Etusivu" }).getByRole("button", { name: "Sanat" }).click();
  await page.goto("/");
  await expect(page).toHaveURL(/\/sanat$/);
});

test("older installed PWA starts at the selected home without starting the microphone", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("taju:settings:v1", JSON.stringify({ schemaVersion: 1, homePage: "kasitteet" }));
    Object.defineProperty(navigator, "standalone", { value: true });
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = class {
      start() { throw new Error("Microphone must not start automatically"); }
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sanat");
  await expect(page).toHaveURL(/\/kasitteet$/);
  await expect(page.locator("#concept-voice-status")).toContainText("Sano sana");
  await page.getByRole("navigation").getByRole("link", { name: "Sanat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Seuraava" })).toBeVisible();
  await page.getByRole("link", { name: "Käsitteet", exact: true }).click();
  await expect(page.locator("#concept-voice-status")).toContainText("Sano sana");
  expect(errors).toEqual([]);
});

test("shortcut accepts encoded Finnish questions and shows the word definition and example", async ({ page }) => {
  const query = "Mitä työmuisti tarkoittaa?";
  await page.goto(`/hae?${new URLSearchParams({ q: query })}`);
  await expect(page.getByRole("searchbox")).toHaveValue(query);
  const answer = page.getByRole("article", { name: "Nopea selitys" });
  await expect(answer).toContainText("Työmuisti");
  await expect(answer).toContainText("Esimerkki");
  await expect(answer.getByRole("button", { name: "Tallenna myöhemmäksi" })).toBeVisible();
  await expect(page.locator(".concept-online")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue(query);
});

test("word and concept bookmarks persist and can be revisited from the same search page", async ({ page }) => {
  await page.goto("/hae?q=paradoksi");
  const answer = page.getByRole("article", { name: "Nopea selitys" });
  await answer.getByRole("button", { name: "Tallenna myöhemmäksi" }).click();
  await page.reload();
  await expect(answer.getByRole("button", { name: "Tallennettu" })).toHaveAttribute("aria-pressed", "true");
  await answer.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paradoksi");
  await page.getByRole("link", { name: "Takaisin hakuun" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("paradoksi");
  await page.getByRole("searchbox").fill("oikofobia");
  await answer.getByRole("button", { name: "Tallenna myöhemmäksi" }).click();
  await page.reload();
  await expect(answer.getByRole("button", { name: "Tallennettu" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("searchbox").fill("");
  await page.getByText("Tallennetut (2)", { exact: true }).click();
  await expect(page.locator(".saved-lookups")).toContainText("Paradoksi");
  await page.locator(".saved-lookups").getByRole("link", { name: /Oikofobia/ }).click();
  await page.getByRole("button", { name: "Tallennettu", exact: true }).click();
  await page.getByRole("link", { name: "Takaisin käsitteisiin" }).click();
  await expect(page.getByText("Tallennetut (1)", { exact: true })).toBeVisible();
});

test("fuzzy input asks for a choice and clearing the query removes the old answer", async ({ page }) => {
  await page.goto("/hae?q=paradokssi");
  await expect(page.getByText(/Tarkoititko: Paradoksi/)).toBeVisible();
  await expect(page.locator(".quick-answer")).toHaveCount(0);
  await page.getByRole("searchbox").fill("paradoksi");
  await expect(page.locator(".quick-answer")).toContainText("Esimerkki");
  await page.getByRole("searchbox").fill("");
  await expect(page.locator(".quick-answer")).toHaveCount(0);
});

test("shortcut guide exposes a valid query prefix and working example", async ({ page }) => {
  await page.goto("/asetukset");
  await page.getByRole("link", { name: "Ota iPhonen pikakomento käyttöön" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sana selville napista");
  await expect(page.getByLabel("Haun osoitteen alku")).toHaveValue("http://127.0.0.1:4173/hae?q=");
  await page.getByRole("link", { name: "Kokeile esimerkkihakua" }).click();
  await expect(page.locator(".quick-answer")).toContainText("Paradoksi");
});

test("quick lookup fits mobile and desktop with large type and dark theme", async ({ page }, testInfo) => {
  await page.goto("/asetukset");
  await page.getByRole("button", { name: "Hiili", exact: true }).click();
  await page.getByRole("button", { name: "Suuri", exact: true }).click();
  await page.goto("/hae?q=Overton%20window");
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 852 });
    const button = await page.getByRole("button", { name: "Sano sana" }).boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);
    expect(button!.x + button!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.screenshot({ path: testInfo.outputPath("quick-lookup-dark.png") });
});

test("new PWA installations launch the preference-aware root", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/");
  expect(manifest.id).toBe("/");
});
