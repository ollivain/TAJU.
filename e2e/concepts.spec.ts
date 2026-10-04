import { expect, test, type Page } from "@playwright/test";
import concepts from "../content/fi/concepts.json" with { type: "json" };

// Keep existing flows deterministic; online lookup is covered separately.
test.beforeEach(async ({ page }) => {
  await page.route("https://*.wikipedia.org/w/api.php?*", (route) => route.fulfill({ json: { batchcomplete: true } }));
});

// Only tests install this controllable native boundary. Production always uses
// the browser's real API, and never substitutes simulated recognition.
async function installVoice(page: Page) {
  await page.addInitScript(() => {
    const host = window as unknown as Record<string, unknown>;
    // Controlled recognition scenarios must also control the permission read.
    Object.defineProperty(navigator, "permissions", { value: { query: async () => ({ state: "prompt" }) } });
    host.SpeechRecognition = class {
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
      onaudiostart?: () => void; onaudioend?: () => void; onspeechend?: () => void; onend?: () => void;
      onerror?: (event: { error: string }) => void;
      onresult?: (event: unknown) => void;
      start() { host.testRecognition = this; }
      stop() { host.testStopped = true; this.onaudioend?.(); }
      abort() { host.testAborted = true; }
    };
  });
}
async function emitVoice(page: Page, event: "audio" | "end-audio" | "end" | "result" | "error", transcript = "", confidence = 0.9, isFinal = true) {
  await page.evaluate(({ event, transcript, confidence, isFinal }) => {
    const engine = (window as unknown as { testRecognition: {
      onaudiostart?: () => void; onaudioend?: () => void; onend?: () => void;
      onerror?: (event: { error: string }) => void;
      onresult?: (event: unknown) => void;
    } }).testRecognition;
    if (event === "audio") engine.onaudiostart?.();
    if (event === "end-audio") engine.onaudioend?.();
    if (event === "end") engine.onend?.();
    if (event === "error") engine.onerror?.({ error: transcript });
    if (event === "result") engine.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript, confidence } }] });
  }, { event, transcript, confidence, isFinal });
}

test("stopping the microphone preserves speech and runs the search", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "audio");
  await emitVoice(page, "result", "Mikä on Ponzi", 0, false);
  await expect(page.locator(".concept-transcript")).toContainText("Kuultu (alustava): Mikä on Ponzi");
  await page.getByRole("button", { name: "Lopeta ja hae", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { testStopped: boolean }).testStopped)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { testAborted?: boolean }).testAborted)).not.toBe(true);
  await expect(page.locator(".concept-mic")).toHaveAttribute("data-listening", "false");
  await expect(page.locator(".concept-transcript")).toContainText("Mikä on Ponzi");
  await emitVoice(page, "result", "Mikä on Ponzi-huijaus?");
  await expect(page.getByRole("searchbox")).toHaveValue("Mikä on Ponzi-huijaus?");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
});

test("Safari interim-only result is searchable and clearly marked for review", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "audio");
  await emitVoice(page, "result", "Selitä oikofobia", 0, false);
  await page.getByRole("button", { name: "Lopeta ja hae", exact: true }).click();
  await emitVoice(page, "end");
  await expect(page.getByRole("searchbox")).toHaveValue("Selitä oikofobia");
  await expect(page.locator("#concept-voice-status")).toContainText("Tunnistus jäi alustavaksi");
  await expect(page.getByText("Tarkoititko: Oikofobia?", { exact: false })).toBeVisible();
  await expect(page.locator(".concept-row")).toContainText("Oikofobia");
});

test("explicit cancellation discards speech without changing the existing query", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet?q=Ponzi");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "audio");
  await emitVoice(page, "result", "oikofobia", 0, false);
  await page.getByRole("button", { name: "Peruuta puhehaku", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Ponzi");
  await expect(page.locator(".concept-transcript")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { testAborted: boolean }).testAborted)).toBe(true);
});

test("Finnish and English lookup, details, related links and restored query", async ({ page }) => {
  await page.goto("/sanat");
  await page.getByRole("link", { name: "Käsitteet", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Hae sanoja ja käsitteitä" });
  for (const query of ["Overtonin ikkuna", "Overton window"]) {
    await search.fill(query);
    await expect(page.locator(".concept-row")).toHaveCount(1);
    await expect(page.locator(".concept-row")).toContainText("Overtonin ikkuna");
  }
  await page.locator(".concept-row").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overtonin ikkuna");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page.getByRole("link", { name: "Käsitteet", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByText("Selitä yksinkertaisesti", { exact: true }).click();
  await expect(page.getByText("Ajatus, jota tänään pidetään mahdottomana").first()).toBeVisible();
  await page.getByRole("region", { name: "Liittyvät käsitteet" }).getByRole("link", { name: /Polarisaatio/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Polarisaatio");
  await page.getByRole("link", { name: "Takaisin käsitteisiin" }).click();
  await expect(search).toHaveValue("Overton window");
  await search.fill("Ponzi");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
});

test("native denied microphone permission is reported without waiting for recognition", async ({ page, context }) => {
  await context.grantPermissions([], { origin: "http://127.0.0.1:4173" });
  await page.goto("/kasitteet");
  const supported = await page.evaluate(() => {
    const host = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(host.SpeechRecognition || host.webkitSpeechRecognition);
  });
  test.skip(!supported, "This browser has no native speech recognition API.");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await expect(page.locator("#concept-voice-status")).toContainText("Mikrofonin käyttö estettiin");
  await expect(page.locator(".concept-mic")).toHaveAttribute("data-listening", "false");
  await page.getByRole("searchbox").fill("Ponzi");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
});

test("categories, no result recovery, pagination and deep-link reload", async ({ page }) => {
  await page.goto("/kasitteet");
  await expect(page.locator(".concept-row")).toHaveCount(30);
  while (await page.getByRole("button", { name: /Näytä lisää/ }).count()) {
    await page.getByRole("button", { name: /Näytä lisää/ }).click();
  }
  await expect(page.locator(".concept-row")).toHaveCount(concepts.length);
  await page.getByLabel("Aihe", { exact: true }).selectOption("games");
  await expect(page.locator(".concept-row")).toHaveCount(concepts.filter((concept) => concept.category === "games").length);
  await page.getByRole("searchbox").fill("tuntematon asia");
  await expect(page.getByText(/Ei hakutuloksia/)).toBeVisible();
  await page.getByRole("button", { name: "Näytä kaikki käsitteet" }).click();
  await expect(page.getByLabel("Aihe", { exact: true })).toHaveValue("");
  await page.goto("/kasitteet/oikofobia");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oikofobia");
  await expect(page.getByRole("heading", { name: "Tulkinta ja rajaukset" })).toBeVisible();
  await page.goto("/kasitteet/ei-ole");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Käsitettä ei löytynyt");
});

test("full question and Finnish comparison including uncertainty", async ({ page }) => {
  await page.goto("/kasitteet");
  const search = page.getByRole("searchbox");
  await search.fill("Mikä on Ponzi-huijaus?");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
  await search.fill("Mikä ero on Ponzi-huijauksella ja pyramidihuijauksella?");
  const comparison = page.getByRole("region", { name: "Käsitteiden vertailu" });
  await expect(comparison).toBeVisible();
  await expect(comparison.locator("article")).toHaveCount(2);
  await expect(comparison).toContainText("Mistä raha tulee?");
  await expect(comparison).toContainText("Erottava piirre");
  await search.fill("Vertaa ponzi ja tuntematon");
  await expect(comparison).toHaveCount(0);
  await expect(page.getByText(/Tarkista vertailun käsitteet/)).toBeVisible();
  await page.getByLabel("Ensimmäinen käsite").selectOption("ponzi");
  await page.getByLabel("Toinen käsite").selectOption("pyramid");
  await expect(comparison).toBeVisible();
});

test("voice transcript, capture states, fuzzy and weak-confidence suggestions", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await expect(page.locator("#concept-voice-status")).toContainText("Odotetaan mikrofonia");
  await expect(page.locator(".concept-mic")).toHaveAttribute("data-listening", "false");
  await emitVoice(page, "audio");
  await expect(page.locator("#concept-voice-status")).toContainText("Kuunnellaan");
  await expect(page.locator(".concept-mic")).toHaveAttribute("data-listening", "true");
  await emitVoice(page, "end-audio");
  await expect(page.locator("#concept-voice-status")).toContainText("Kuuntelu päättyi");
  await emitVoice(page, "result", "Mikä on Ponzi-huijaus?");
  await expect(page.locator(".concept-transcript")).toContainText("Mikä on Ponzi-huijaus?");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "result", "oikofopia");
  await expect(page.getByText("Tarkoititko: Oikofobia?", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/kasitteet\?/);
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "result", "Overton window", 0.3);
  await expect(page.getByText("Tarkoititko: Overtonin ikkuna?", { exact: false })).toBeVisible();
});

test("voice comparison resets category and no concept is explained on no-match", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet?category=games");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "result", "Mikä ero on Ponzi-huijauksella ja pyramidihuijauksella?");
  await expect(page.getByRole("region", { name: "Käsitteiden vertailu" })).toBeVisible();
  await expect(page.getByLabel("Aihe", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "result", "kvanttikirahvi");
  await expect(page.locator("#concept-voice-status")).toContainText("käsitettä ei löytynyt");
  await expect(page.locator(".concept-row")).toHaveCount(0);
});

test("a spoken missing concept uses online search after recognition finishes", async ({ page }) => {
  await installVoice(page);
  const requests: string[] = [];
  await page.route("https://*.wikipedia.org/w/api.php?*", async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ json: { query: { pages: [{ pageid: 13855, title: "Emergenssi", index: 1, extract: "Kokonaisuudesta syntyvä uusi ominaisuus." }] } } });
  });
  await page.goto("/kasitteet");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "audio");
  await emitVoice(page, "result", "Mikä on emergenssi", 0, false);
  await expect(page.locator(".concept-online")).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Lopeta ja hae", exact: true }).click();
  await emitVoice(page, "result", "Mikä on emergenssi?");
  await expect(page.getByRole("region", { name: "Verkosta: emergenssi" })).toContainText("Kokonaisuudesta syntyvä uusi ominaisuus.");
  expect(requests).toHaveLength(1);
});

test("permission denial, missing hardware, no speech, network error and cancel recover", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet");
  for (const [error, message] of [["not-allowed", "Mikrofonin käyttö estettiin"], ["audio-capture", "Puhehaku ei ole käytettävissä"], ["no-speech", "Puhetta ei tunnistettu"], ["network", "Puhepalveluun ei saada yhteyttä"]]) {
    await page.getByRole("button", { name: "Sano sana" }).click();
    await emitVoice(page, "audio");
    await emitVoice(page, "error", error);
    await expect(page.locator("#concept-voice-status")).toContainText(message);
    await expect(page.locator(".concept-mic")).toHaveAttribute("data-listening", "false");
  }
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "audio");
  await page.getByRole("button", { name: "Peruuta puhehaku" }).click();
  await expect(page.locator(".concept-mic")).toHaveAttribute("data-listening", "false");
  await page.getByRole("searchbox").fill("Ponzi");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
});

test("unavailable browser API preserves typed search", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined });
  });
  await page.goto("/kasitteet");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await expect(page.locator("#concept-voice-status")).toContainText("Puhehaku ei ole käytettävissä");
  await page.getByRole("searchbox").fill("confirmation bias");
  await expect(page.locator(".concept-row")).toContainText("Vahvistusharha");
});

test("leaving the concepts browser cancels microphone capture", async ({ page }) => {
  await installVoice(page);
  await page.goto("/kasitteet");
  await page.getByRole("button", { name: "Sano sana" }).click();
  await emitVoice(page, "audio");
  await page.getByRole("link", { name: "Sanat", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { testAborted: boolean }).testAborted)).toBe(true);
});

test("read aloud starts on request, reports state and stops on navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as Record<string, unknown>;
    host.SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [{ lang: "fi-FI" }],
      speak: (utterance: unknown) => { host.testUtterance = utterance; },
      cancel: () => { host.testSpeechCancelled = true; },
    } });
  });
  await page.goto("/kasitteet/ponzi-huijaus");
  expect(await page.evaluate(() => "testUtterance" in window)).toBe(false);
  await page.getByRole("button", { name: "Kuuntele selitys" }).click();
  await expect(page.getByText("Valmistellaan ääntä…")).toBeVisible();
  await page.evaluate(() => {
    const utterance = (window as unknown as { testUtterance: { onstart: () => void } }).testUtterance;
    utterance.onstart();
  });
  await expect(page.getByText("Luetaan määritelmää.")).toBeVisible();
  await page.getByRole("button", { name: "Lopeta lukeminen" }).click();
  await expect(page.getByRole("button", { name: "Kuuntele selitys" })).toBeVisible();
  await page.getByRole("button", { name: "Kuuntele selitys" }).click();
  await page.evaluate(() => { (window as unknown as { testSpeechCancelled: boolean }).testSpeechCancelled = false; });
  await page.getByRole("link", { name: "Takaisin käsitteisiin" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { testSpeechCancelled: boolean }).testSpeechCancelled)).toBe(true);
});

test("keyboard-only lookup and disclosure navigation", async ({ page }) => {
  await page.goto("/kasitteet");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Asetukset" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(page.getByRole("searchbox")).toHaveCSS("outline-width", "2px");
  await page.keyboard.type("Overton window");
  await expect(page.getByRole("searchbox")).toHaveValue("Overton window");
  const row = page.locator(".concept-row");
  await expect(row).toHaveCount(1);
  for (let i = 0; i < 10 && !(await row.evaluate((node) => node === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(row).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  // Heading focus means tab continues into article controls, not navigation.
  const summary = page.getByText("Selitä yksinkertaisesti", { exact: true });
  for (let i = 0; i < 5 && !(await summary.evaluate((node) => node === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
});

test("mobile, desktop, dark theme, large text and reduced motion", async ({ page }, testInfo) => {
  await page.goto("/asetukset");
  await page.getByRole("button", { name: "Hiili", exact: true }).click();
  await page.getByRole("button", { name: "Suuri", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of [["browser", "/kasitteet"], ["detail", "/kasitteet/paamies-agenttiongelma"], ["comparison", "/kasitteet?q=Ponzi+vs+pyramid+scheme"]]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "hiili");
      expect(await page.evaluate(() => [...document.querySelectorAll(".screen__scroll, .bottom-nav")].some((node) => node.scrollWidth > node.clientWidth))).toBe(false);
      for (const link of await page.getByRole("navigation").getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      if (name === "comparison") await page.locator(".concept-comparison").evaluate((node) => node.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: testInfo.outputPath(`concepts-${name}-dark-${width}.png`) });
    }
  }
  await page.goto("/asetukset");
  await page.getByRole("button", { name: "Paperi", exact: true }).click();
  await page.goto("/kasitteet");
  await page.screenshot({ path: testInfo.outputPath("concepts-desktop-light.png") });
});

test("concept catalog and detail remain usable offline", async ({ page, context }) => {
  await page.goto("/kasitteet");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("searchbox").fill("Overton window");
  await page.locator(".concept-row").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overtonin ikkuna");
  await context.setOffline(false);
});
