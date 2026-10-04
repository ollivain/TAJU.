import { expect, test, type Page } from "@playwright/test";

interface TestSpeech {
  calls: { text: string; lang: string }[];
  cancellations: number;
  current?: { onstart?: () => void; onend?: () => void; onerror?: () => void };
}

async function installSpeech(page: Page) {
  await page.addInitScript(() => {
    const host = window as unknown as { testSpeech: TestSpeech; SpeechSynthesisUtterance: unknown };
    host.testSpeech = { calls: [], cancellations: 0 };
    host.SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [{ lang: "fi-FI" }, { lang: "en-US" }],
      speak: (utterance: { text: string; lang: string; onstart?: () => void }) => {
        host.testSpeech.calls.push({ text: utterance.text, lang: utterance.lang });
        host.testSpeech.current = utterance;
        queueMicrotask(() => utterance.onstart?.());
      },
      cancel: () => { host.testSpeech.cancellations++; },
    } });
  });
}

const speechState = (page: Page) => page.evaluate(() => {
  const { calls, cancellations } = (window as unknown as { testSpeech: TestSpeech }).testSpeech;
  return { calls, cancellations };
});

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
  await expect(page.locator("#concept-voice-status")).toBeEmpty();
  await page.getByRole("navigation").getByRole("link", { name: "Sanat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Seuraava" })).toBeVisible();
  await page.getByRole("link", { name: "Käsitteet", exact: true }).click();
  await expect(page.locator("#concept-voice-status")).toBeEmpty();
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
  // Wait for the display font before tapping below the large answer heading.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const answer = page.getByRole("article", { name: "Nopea selitys" });
  await answer.getByRole("button", { name: "Tallenna myöhemmäksi" }).click();
  await expect(answer.getByRole("button", { name: "Tallennettu" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(answer.getByRole("button", { name: "Tallennettu" })).toHaveAttribute("aria-pressed", "true");
  await answer.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paradoksi");
  await page.getByRole("link", { name: "Takaisin hakuun" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("paradoksi");
  await page.getByRole("searchbox").fill("oikofobia");
  await answer.getByRole("button", { name: "Tallenna myöhemmäksi" }).click();
  await expect(answer.getByRole("button", { name: "Tallennettu" })).toHaveAttribute("aria-pressed", "true");
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

test("lookup keeps the answer first and moves speech help to settings", async ({ page }) => {
  await page.goto("/hae?q=demokraatti");
  const answer = page.getByRole("article", { name: "Nopea selitys" });
  const heading = answer.getByRole("heading", { name: "Demokraatti", exact: true });
  await expect(heading).toBeInViewport();
  await expect(answer.getByRole("button", { name: "Kuuntele selitys" })).toBeInViewport();
  await expect(page.getByLabel("Aihe", { exact: true })).not.toBeVisible();
  await expect(page.getByText("Tietoa puhehausta", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Toimintopainikkeella/ })).toHaveCount(0);
  await expect(page.locator(".concept-result-rule")).toHaveCount(0);
  await page.getByText("Selaa ja vertaa", { exact: true }).click();
  await page.getByLabel("Aihe", { exact: true }).selectOption("games");
  await expect(answer).toHaveCount(0);
  await page.getByLabel("Aihe", { exact: true }).selectOption("");
  await expect(answer).toBeVisible();
  await page.getByRole("link", { name: "Asetukset", exact: true }).click();
  await page.getByText("Tietoa puhehausta", { exact: true }).click();
  await expect(page.getByText(/TAJU ei tallenna ääntä/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ota iPhonen pikakomento käyttöön" })).toBeVisible();
});

test("quick lookup fits mobile and desktop with large type and dark theme", async ({ page }, testInfo) => {
  await page.goto("/asetukset");
  await page.getByRole("button", { name: "Hiili", exact: true }).click();
  await page.getByRole("button", { name: "Suuri", exact: true }).click();
  await page.goto("/hae?q=Overton%20window");
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 852 });
    const button = await page.getByRole("button", { name: "Sano sana" }).boundingBox();
    const input = await page.getByRole("searchbox").boundingBox();
    const field = await page.locator(".concept-search").boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);
    expect(button!.width).toBeGreaterThanOrEqual(44);
    expect(button!.x).toBeGreaterThanOrEqual(input!.x + input!.width);
    expect(button!.y).toBeGreaterThanOrEqual(field!.y);
    expect(button!.y + button!.height).toBeLessThanOrEqual(field!.y + field!.height);
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

test("quick answers read the selected word or concept and stop on a new query or navigation", async ({ page }) => {
  await installSpeech(page);
  await page.goto("/hae?q=paradoksi");
  const answer = page.getByRole("article", { name: "Nopea selitys" });
  expect((await speechState(page)).calls).toEqual([]);
  await answer.getByRole("button", { name: "Kuuntele selitys" }).click();
  await expect(answer.getByText("Luetaan määritelmää.")).toBeVisible();
  expect((await speechState(page)).calls).toEqual([{ text: "Paradoksi. Näennäisesti ristiriitainen väite tai ilmiö, joka voi silti olla tosi.", lang: "fi-FI" }]);
  await page.getByRole("searchbox").fill("oikofobia");
  await expect(answer.getByRole("button", { name: "Kuuntele selitys" })).toBeVisible();
  expect((await speechState(page)).cancellations).toBe(1);
  await answer.getByRole("button", { name: "Kuuntele selitys" }).click();
  expect((await speechState(page)).calls[1].text).toMatch(/^Oikofobia\./);
  await answer.getByRole("button", { name: "Lopeta lukeminen" }).click();
  await expect(answer.getByRole("button", { name: "Kuuntele selitys" })).toBeVisible();
  await answer.getByRole("button", { name: "Kuuntele selitys" }).click();
  await page.getByRole("link", { name: "Asetukset", exact: true }).click();
  await expect(page).toHaveURL(/\/asetukset$/);
  await expect.poll(async () => (await speechState(page)).cancellations).toBe(3);
});

test("online definitions read in their own language and stop when the app is hidden", async ({ page }) => {
  await installSpeech(page);
  await page.route("https://*.wikipedia.org/w/api.php?*", (route) => route.fulfill({ json:
    new URL(route.request().url()).hostname === "fi.wikipedia.org" ? { batchcomplete: true }
      : { query: { pages: [{ pageid: 123, title: "Bounded rationality", extract: "Bounded rationality is a concept." }] } },
  }));
  await page.goto("/hae?q=bounded+rationality");
  const result = page.locator(".concept-online__result");
  await result.getByRole("button", { name: "Kuuntele selitys" }).click();
  expect((await speechState(page)).calls).toEqual([{ text: "Bounded rationality. Bounded rationality is a concept.", lang: "en-US" }]);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(result.getByRole("button", { name: "Kuuntele selitys" })).toBeVisible();
  expect((await speechState(page)).cancellations).toBe(1);
});

test("read aloud failures allow retry", async ({ page }) => {
  await installSpeech(page);
  await page.goto("/hae?q=paradoksi");
  const listen = page.getByRole("button", { name: "Kuuntele selitys" });
  await listen.click();
  await page.evaluate(() => (window as unknown as { testSpeech: TestSpeech }).testSpeech.current?.onerror?.());
  await expect(page.getByText("Ääneenluku ei onnistunut. Kokeile uudelleen.")).toBeVisible();
  await listen.click();
  expect((await speechState(page)).calls).toHaveLength(2);
});

test("unsupported speech keeps the explanation readable", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); });
  await page.goto("/hae?q=paradoksi");
  await expect(page.getByRole("button", { name: "Kuuntele selitys" })).toBeDisabled();
  await expect(page.getByText("Ääneenluku ei ole käytettävissä tässä selaimessa.")).toBeVisible();
  await expect(page.locator(".quick-answer")).toContainText("Näennäisesti ristiriitainen");
});

test("democrat has a direct contextual explanation and a listen button even offline", async ({ page, context }) => {
  await installSpeech(page);
  await page.goto("/hae?q=mit%C3%A4%20tarkoittaa%20demokraatti");
  const answer = page.getByRole("article", { name: "Nopea selitys" });
  await expect(answer).toContainText("Demokratian eli kansanvallan kannattaja");
  await expect(answer).toContainText("Yhdysvalloissa");
  await expect(answer).toContainText("lehden nimi");
  await expect(page.locator(".concept-online")).toHaveCount(0);
  await context.setOffline(true);
  await answer.getByRole("button", { name: "Kuuntele selitys" }).click();
  expect((await speechState(page)).calls[0].text).toContain("Puoluepolitiikassa myös");
  await answer.getByRole("button", { name: "Lopeta lukeminen" }).click();
  await page.getByRole("searchbox").fill("demokraatit");
  await expect(answer.getByRole("heading")).toHaveText("Demokraatti");
});

test("ambiguous online results retain their meanings and can be read without leaving TAJU", async ({ page }) => {
  await installSpeech(page);
  const extract = "Kuusi voi tarkoittaa eri asioita:\n\nLuku 6.\nHavupuu, joka kasvaa pohjoisilla alueilla.";
  await page.route("https://*.wikipedia.org/w/api.php?*", (route) => route.fulfill({ json: {
    query: { pages: [{ pageid: 456, title: "Kuusi", extract, pageprops: { disambiguation: "" } }] },
  } }));
  await page.goto("/hae?q=kuusi");
  const result = page.locator(".concept-online__result");
  await expect(page.getByText("Sanalla on useita merkityksiä. Asiayhteys ratkaisee tulkinnan.")).toBeVisible();
  await expect(result).toContainText("Luku 6.");
  await expect(result).toContainText("Havupuu");
  await expect(result.locator(".concept-online__meanings")).toHaveCSS("white-space", "pre-line");
  await expect(page.getByText("Kysytty käsite löytyi Wikipediasta.", { exact: true })).toHaveCount(0);
  await result.getByRole("button", { name: "Kuuntele selitys" }).click();
  expect((await speechState(page)).calls).toEqual([{ text: `Kuusi. ${extract}`, lang: "fi-FI" }]);
  await page.getByRole("searchbox").fill("paradoksi");
  await expect.poll(async () => (await speechState(page)).cancellations).toBe(1);
});

test("missing disambiguation extracts do not produce a made-up spoken explanation", async ({ page }) => {
  await installSpeech(page);
  await page.route("https://*.wikipedia.org/w/api.php?*", (route) => route.fulfill({ json: {
    query: { pages: [{ pageid: 456, title: "Kuusi", pageprops: { disambiguation: "" } }] },
  } }));
  await page.goto("/hae?q=kuusi");
  const result = page.locator(".concept-online__result");
  await expect(result).toContainText("Merkitysten kuvauksia ei saatu");
  await expect(result.getByRole("button", { name: "Kuuntele selitys" })).toHaveCount(0);
  expect((await speechState(page)).calls).toEqual([]);
  await expect(page.locator(".concept-answer-title").getByRole("link")).toHaveAttribute("href", "https://fi.wikipedia.org/?curid=456");
});
