import { expect, test } from "@playwright/test";

test("sanan tila säilyy uudelleenlatauksessa", async ({ page }) => {
  await page.goto("/sanat");
  await page.getByRole("button", { name: "Tallenna" }).click();
  const savedWord = await page.getByRole("heading", { level: 1 }).textContent();
  await page.getByRole("button", { name: "Osaan tämän" }).click();
  await page.reload();
  await page.getByRole("link", { name: "Löydä" }).click();
  await page.getByRole("button", { name: "Tallennetut" }).click();
  await expect(page.getByRole("link", { name: new RegExp(savedWord ?? "", "i") })).toBeVisible();
});

test("sanan toimintorivi mahtuu kapeillekin näytöille", async ({ page }) => {
  await page.goto("/sanat");
  const actions = ["Tallenna", "Osaan tämän", "Seuraava"];

  for (const width of [402, 393, 375, 360, 320]) {
    await page.setViewportSize({ width, height: 852 });
    await expect(page.getByRole("group", { name: "Sanan toiminnot" })).toBeVisible();

    for (const name of actions) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box, `${name} @ ${width}px`).not.toBeNull();
      expect(box!.x, `${name} vasen reuna @ ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${name} oikea reuna @ ${width}px`).toBeLessThanOrEqual(width);
      expect(box!.height, `${name} kosketusalue @ ${width}px`).toBeGreaterThanOrEqual(44);
    }

    // The arrow is part of the affordance, so it has to fit too.
    const arrow = await page.getByRole("button", { name: "Seuraava" }).locator("svg").boundingBox();
    expect(arrow!.x + arrow!.width, `nuoli @ ${width}px`).toBeLessThanOrEqual(width);

    const scrollsSideways = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(scrollsSideways, `vaakavieritys @ ${width}px`).toBe(false);
  }
});

test("tallennetut voi rajata ja avata", async ({ page }) => {
  await page.goto("/sana/paradoksi");
  await page.getByRole("button", { name: "Tallenna" }).click();
  await page.goto("/loyda");

  // Kaikki on oletus ja listaa myös tallentamattomat sanat.
  await expect(page.getByRole("link", { name: /konteksti/i })).toBeVisible();

  await page.getByRole("button", { name: "Tallennetut" }).click();
  await expect(page.getByRole("link", { name: /paradoksi/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /konteksti/i })).toBeHidden();

  // Rajaus koskee myös hakua.
  await page.getByRole("searchbox", { name: "Hae sanoja" }).fill("konteksti");
  await expect(page.getByText("Ei hakutuloksia.")).toBeVisible();
  await page.getByRole("button", { name: "Kaikki" }).click();
  await expect(page.getByRole("link", { name: /konteksti/i })).toBeVisible();

  // Tallennettu sana aukeaa listalta.
  await page.getByRole("searchbox", { name: "Hae sanoja" }).fill("");
  await page.getByRole("button", { name: "Tallennetut" }).click();
  await page.getByRole("link", { name: /paradoksi/i }).click();
  await expect(page).toHaveURL(/\/sana\/paradoksi$/);
  await expect(page.getByRole("heading", { level: 1, name: "Paradoksi" })).toBeVisible();
});

test("haulla löytyvä sana avautuu", async ({ page }) => {
  await page.goto("/loyda");
  await page.getByRole("searchbox", { name: "Hae sanoja" }).fill("paradoksi");
  await page.getByRole("link", { name: /paradoksi/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Paradoksi" })).toBeVisible();
  await expect(page).toHaveURL(/\/sana\/paradoksi$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Paradoksi" })).toBeVisible();
});

test("hakukentän näppäimistöfokus näkyy", async ({ page }) => {
  await page.goto("/loyda");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const search = page.getByRole("searchbox", { name: "Hae sanoja" });
  await expect(search).toBeFocused();
  await expect(search).toHaveCSS("outline-style", "solid");
  await expect(search).toHaveCSS("outline-width", "2px");
});

test("asetukset säilyvät ja edistymisen voi nollata", async ({ page }) => {
  await page.goto("/sanat");
  await page.getByRole("button", { name: "Tallenna" }).click();

  await page.getByRole("link", { name: "Asetukset" }).click();
  await expect(page.getByRole("definition")).toContainText(["0", "1"]);

  await page.getByRole("button", { name: "Hiili" }).click();
  await page.getByRole("switch", { name: "Liike" }).click();
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "hiili");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.getByRole("button", { name: "Hiili" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Nollaa edistyminen" }).click();
  await page.getByRole("button", { name: "Nollaa", exact: true }).click();
  await expect(page.getByRole("definition")).toContainText(["0", "0"]);
});

test("asetusten teemavalintojen kosketusalue säilyy mobiilileveyksillä", async ({ page }) => {
  await page.goto("/asetukset");

  for (const width of [430, 402, 393, 375, 360, 320]) {
    await page.setViewportSize({ width, height: 852 });
    for (const name of ["Puuteri", "Paperi", "Salvia", "Hiekka", "Hiili"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box, `${name} @ ${width}px`).not.toBeNull();
      expect(box!.width, `${name} leveys @ ${width}px`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${name} korkeus @ ${width}px`).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width, `${name} oikea reuna @ ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});

test("ydinsisältö toimii ensimmäisen latauksen jälkeen offline-tilassa", async ({ page, context }) => {
  await page.goto("/sanat");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Seuraava" })).toBeVisible();
  await context.setOffline(false);
});
