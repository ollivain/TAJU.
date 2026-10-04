import { expect, test } from "@playwright/test";

const api = "https://*.wikipedia.org/w/api.php?*";
const entry = { pageid: 13855, title: "Emergenssi", index: 1, extract: "Emergenssi tarkoittaa kokonaisuudesta syntyvää uutta ominaisuutta." };
const response = { batchcomplete: true, query: { pages: [entry] } };

test("unknown questions find an attributed definition online; local hits stay local", async ({ page }) => {
  const requests: string[] = [];
  await page.route(api, async (route) => { requests.push(route.request().url()); await route.fulfill({ json: response }); });
  await page.goto("/kasitteet?q=Ponzi");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
  await expect(page.locator(".concept-online")).toHaveCount(0);
  await page.getByRole("searchbox").fill("Mikä on emergenssi?");
  const section = page.getByRole("region", { name: "Verkosta: emergenssi" });
  await expect(section.getByRole("status")).toHaveText("Etsitään Wikipediasta…");
  await expect(section).toContainText(entry.extract);
  await expect(section.getByRole("link", { name: /Emergenssi/ })).toHaveAttribute("href", "https://fi.wikipedia.org/?curid=13855");
  await expect(section).toContainText("Wikipedia · Suomi");
  await expect(section.getByRole("link", { name: /CC BY-SA/ })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(new URL(requests[0]).searchParams.get("gsrsearch")).toBe('intitle:"emergenssi"');
  await page.getByRole("searchbox").fill("Ponzi");
  await expect(section).toHaveCount(0);
});

test("English fallback is labelled and empty searches offer a correctly encoded Google link", async ({ page }) => {
  const requests: string[] = [];
  await page.route(api, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ json: new URL(route.request().url()).hostname === "fi.wikipedia.org" ? { batchcomplete: true } : {
      query: { pages: [{ ...entry, title: "Bounded rationality", extract: "Bounded rationality is a concept." }] },
    } });
  });
  await page.goto("/kasitteet?q=bounded+rationality");
  await expect(page.locator(".concept-online")).toContainText("Wikipedia · Englanti");
  await expect(page.locator(".concept-online p[lang=en]")).toContainText("Bounded rationality");
  expect(requests).toHaveLength(2);
  await page.unroute(api);
  await page.route(api, (route) => route.fulfill({ json: { batchcomplete: true } }));
  await page.getByRole("searchbox").fill("Mitä hämäräkäsite tarkoittaa?");
  await expect(page.locator(".concept-online")).toContainText("Wikipediasta ei löytynyt osumaa");
  const link = page.getByRole("link", { name: /Hae Googlesta/ });
  expect(new URL((await link.getAttribute("href"))!).searchParams.get("q")).toBe("hämäräkäsite");
});

test("network failures can be retried without changing the query", async ({ page }) => {
  let calls = 0;
  await page.route(api, (route) => ++calls === 1 ? route.abort("failed") : route.fulfill({ json: response }));
  await page.goto("/kasitteet?q=emergenssi");
  await expect(page.locator(".concept-online")).toContainText("Verkkohaku ei onnistunut");
  await page.getByRole("button", { name: "Yritä verkkohakua uudelleen" }).click();
  await expect(page.locator(".concept-online")).toContainText(entry.extract);
  expect(calls).toBe(2);
});

test("changed queries cannot receive a stale network result", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(api, async (route) => {
    const old = new URL(route.request().url()).searchParams.get("gsrsearch")?.includes("emergenssi");
    if (old) await pending;
    await route.fulfill({ json: old ? response : { query: { pages: [{ ...entry, title: "Entropia", extract: "Uuden haun tulos." }] } } });
  });
  await page.goto("/kasitteet?q=emergenssi");
  await page.waitForRequest(api);
  await page.getByRole("searchbox").fill("entropia");
  await expect(page.locator(".concept-online")).toContainText("Uuden haun tulos");
  release();
  await expect(page.locator(".concept-online")).not.toContainText(entry.extract);
});

test("short queries, rapid typing and category-hidden local hits do not trigger requests", async ({ page }) => {
  const requests: string[] = [];
  await page.route(api, async (route) => { requests.push(route.request().url()); await route.fulfill({ json: response }); });
  await page.clock.install();
  await page.goto("/kasitteet?q=Ponzi&category=games");
  await page.clock.fastForward(1_000);
  expect(requests).toHaveLength(0);
  await expect(page.locator(".concept-online")).toHaveCount(0);
  const input = page.getByRole("searchbox");
  await input.fill("??");
  await page.clock.fastForward(1_000);
  await input.fill("xy");
  await page.clock.fastForward(1_000);
  expect(requests).toHaveLength(0);
  await input.fill("emergens");
  await page.clock.fastForward(300);
  await input.fill("emergenssi");
  await page.clock.fastForward(700);
  await expect(page.locator(".concept-online")).toContainText(entry.extract);
  expect(requests).toHaveLength(1);
  expect(new URL(requests[0]).searchParams.get("gsrsearch")).toBe('intitle:"emergenssi"');
});

test("offline lookup recovers after reconnecting and local search stays usable", async ({ page, context }) => {
  await page.route(api, (route) => route.fulfill({ json: response }));
  await page.goto("/kasitteet");
  await context.setOffline(true);
  await page.getByRole("searchbox").fill("emergenssi");
  await expect(page.locator(".concept-online")).toContainText("Verkkohaku tarvitsee internetyhteyden");
  await context.setOffline(false);
  await expect(page.locator(".concept-online")).toContainText(entry.extract);
  await context.setOffline(true);
  await page.getByRole("searchbox").fill("Ponzi");
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
});

test("comparison searches only missing terms and never invents a combined explanation", async ({ page }) => {
  const requests: string[] = [];
  await page.route(api, async (route) => { requests.push(route.request().url()); await route.fulfill({ json: response }); });
  await page.goto("/kasitteet?q=Ponzi+vs+emergenssi");
  await expect(page.getByRole("region", { name: "Verkosta: emergenssi" })).toContainText(entry.extract);
  await expect(page.locator(".concept-row")).toContainText("Ponzi-huijaus");
  await expect(page.getByRole("region", { name: "Käsitteiden vertailu" })).toHaveCount(0);
  expect(requests).toHaveLength(1);
});

test("online content stays text and is readable on narrow screens and in dark theme", async ({ page }, testInfo) => {
  await page.route(api, (route) => route.fulfill({ json: { query: { pages: [{ ...entry, extract: '<img src=x onerror="alert(1)"> on tekstiä. ' + entry.extract }] } } }));
  await page.goto("/kasitteet?q=emergenssi");
  await expect(page.locator(".concept-online")).toContainText('<img src=x onerror="alert(1)">');
  await expect(page.locator(".concept-online img")).toHaveCount(0);
  await page.unroute(api);
  await page.route(api, (route) => route.fulfill({ json: response }));
  await page.goto("/asetukset");
  await page.getByRole("button", { name: "Hiili", exact: true }).click();
  await page.getByRole("button", { name: "Suuri", exact: true }).click();
  await page.goto("/kasitteet?q=emergenssi");
  await expect(page.locator(".concept-online")).toContainText(entry.extract);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".concept-online").scrollIntoViewIfNeeded();
    expect(await page.locator(".screen__scroll").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`online-dark-${width}.png`) });
  }
});
