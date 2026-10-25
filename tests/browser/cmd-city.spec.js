const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const route = "/games/cmd-city";

test("city begins paused, advances deliberately and preserves state when replacement is canceled", async ({
  page,
}) => {
  await page.goto(route);
  await expect(
    page.getByRole("heading", { name: "CMD City", exact: true }),
  ).toBeVisible();
  const city = page.locator("#city-game");
  await expect(city).toHaveAttribute("data-state", "paused");
  await expect(city).toHaveAttribute("data-month", "0");
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await expect(city).toHaveAttribute("data-state", "playing");
  await expect(city).not.toHaveAttribute("data-month", "0", { timeout: 7000 });
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  const month = await city.getAttribute("data-month");
  const treasury = await page.locator("#cash-value").textContent();
  await page.getByRole("button", { name: "New city", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Keep this city", exact: true })
    .click();
  await expect(city).toHaveAttribute("data-month", month);
  await expect(page.locator("#cash-value")).toHaveText(treasury);
  await expect(city).toHaveAttribute("data-state", "paused");
});

test("keyboard placement charges once, inspection is safe, and text inputs retain their keys", async ({
  page,
}) => {
  await page.goto(route);
  await page.getByRole("button", { name: "New city", exact: true }).click();
  await page.getByLabel("Empty map").check();
  await page.getByRole("button", { name: "Create city", exact: true }).click();
  await page.getByLabel("Column (0–39)").fill("1");
  await page.getByLabel("Row (0–31)").fill("16");
  await page.getByRole("button", { name: "Inspect tile", exact: true }).click();
  const before = await page.locator("#cash-value").textContent();
  await page.locator('[data-tool="road"]').click();
  await page.locator("#city-map").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cash-value")).not.toHaveText(before);
  const after = await page.locator("#cash-value").textContent();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cash-value")).toHaveText(after);
  await expect(page.locator("#tile-title")).toContainText(/road/i);
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  await page.getByLabel("City name").fill("a d p Test City");
  await expect(page.getByLabel("City name")).toHaveValue("a d p Test City");
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
});

test("resize pauses with explicit resume and denied storage is nonfatal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("denied");
    };
    Storage.prototype.setItem = () => {
      throw new Error("denied");
    };
  });
  await page.goto(route);
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.width, height: size.height - 60 });
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await page.waitForTimeout(100);
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  await page.getByLabel("Save this city in this browser").check();
  await expect(page.locator("#storage-note")).toContainText(
    /unavailable|denied|failed/i,
  );
  await expect(page.locator("#city-map")).toBeVisible();
});

test("responsive controls, overlays, reduced motion and accessible page", async ({
  page,
}, testInfo) => {
  const external = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:5081"))
      external.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.locator("#city-map")).toBeVisible();
  await page.getByLabel("Map overlay").selectOption("pollution");
  await expect(page.locator("#overlay-caption")).toContainText(/pollution/i);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await page.locator("#city-map").boundingBox()).height,
  ).toBeGreaterThan(260);
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  expect(external).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("city-layout.png"),
    fullPage: true,
  });
});

test("regional cities preserve their identities and dispatch real next-month shipments", async ({
  page,
}) => {
  await page.goto(route);
  await page
    .getByRole("button", { name: "Region & cooperation", exact: true })
    .click();
  await page.getByLabel("Governing city", { exact: true }).selectOption("1");
  await expect(page.locator("#city-name-display")).toHaveText("Pinehaven");
  await page.getByLabel("Governing city", { exact: true }).selectOption("0");
  await expect(page.locator("#city-name-display")).toHaveText("Riverbend");
  await page.getByLabel("Shipment units", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Dispatch shipment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Dispatch goods", exact: true })
    .click();
  await expect(page.locator("#region-shipments")).toContainText("10 goods");
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await expect(page.locator("#city-game")).not.toHaveAttribute(
    "data-month",
    "0",
  );
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await expect(page.locator("#region-events")).toContainText(
    "received 10 goods",
  );
  const month = await page.locator("#city-game").getAttribute("data-month");
  await page.getByLabel("Governing city", { exact: true }).selectOption("1");
  await expect(page.locator("#city-game")).toHaveAttribute("data-month", month);
  await expect(page.locator("#city-name-display")).toHaveText("Pinehaven");
});

test("touch-emulated placement charges once and canceled pointers cannot build", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: testInfo.project.use.viewport.width, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5081" + route);
  await page.getByRole("button", { name: "New city", exact: true }).click();
  await page.getByLabel("Empty map").check();
  await page.getByRole("button", { name: "Create city", exact: true }).click();
  await page.locator('[data-tool="road"]').click();
  await page.locator("#city-map").scrollIntoViewIfNeeded();
  const box = await page.locator("#city-map").boundingBox(),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const before = await page.locator("#cash-value").textContent();
  await page.touchscreen.tap(x, y);
  await expect(page.locator("#cash-value")).not.toHaveText(before);
  const after = await page.locator("#cash-value").textContent();
  await page.touchscreen.tap(x, y);
  await expect(page.locator("#cash-value")).toHaveText(after);
  await page.locator("#city-map").dispatchEvent("pointerdown", {
    pointerId: 88,
    button: 0,
    clientX: x + box.width / 8,
    clientY: y,
    pointerType: "touch",
  });
  await page
    .locator("#city-map")
    .dispatchEvent("pointercancel", { pointerId: 88, pointerType: "touch" });
  await page.locator("#city-map").dispatchEvent("pointerup", {
    pointerId: 88,
    button: 0,
    clientX: x + box.width / 8,
    clientY: y,
    pointerType: "touch",
  });
  await expect(page.locator("#cash-value")).toHaveText(after);
  await context.close();
});

test("whole-region export and import restore all cities and reject corrupt files safely", async ({
  page,
}) => {
  await page.goto(route);
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  await page.getByLabel("City name", { exact: true }).fill("Export Test");
  await page.getByRole("button", { name: "Rename city", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export city", exact: true }).click();
  const download = await downloadPromise;
  const fs = require("node:fs/promises");
  const data = await fs.readFile(await download.path());
  const original = JSON.parse(data.toString());
  expect(original.cities).toHaveLength(3);
  expect(original.cities[0].state.name).toBe("Export Test");
  await page.getByRole("button", { name: "New city", exact: true }).click();
  await page.getByRole("button", { name: "Create city", exact: true }).click();
  await page.locator("#import-city").setInputFiles({
    name: "region.json",
    mimeType: "application/json",
    buffer: data,
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await expect(page.locator("#city-name-display")).toHaveText("Export Test");
  await page.locator("#import-city").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.locator("#city-message")).toContainText("Import rejected");
  await expect(page.locator("#city-name-display")).toHaveText("Export Test");
});

test("a validated terminal-month save pauses safely and leaves recovery controls working", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route);
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export city", exact: true }).click();
  const file = await downloading;
  const fs = require("node:fs/promises");
  const region = JSON.parse(await fs.readFile(await file.path(), "utf8"));
  const {createHouseholds} = await import("../../static/cmd-city/households.mjs");
  const {createServices} = await import("../../static/cmd-city/services.mjs");
  const {createFuture} = await import("../../static/cmd-city/future.mjs");
  region.month = 1000000;
  for (const c of region.cities) {
    c.state.month = 1000000;
    c.state.civic.lastMonth = 1000000;
    c.state.environment.lastMonth = 999999;
    // Terminal-boundary fixture: no historical million-month simulation implied.
    c.state.households = createHouseholds(c.state);
    c.state.services = createServices(c.state);
    c.state.future = createFuture(c.state);
  }
  await page
    .locator("#import-city")
    .setInputFiles({
      name: "terminal-region.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(region)),
    });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
    { timeout: 7000 },
  );
  await expect(page.locator("#city-message")).toContainText("month limit");
  await page.getByRole("button", { name: "New city", exact: true }).click();
  await page.getByRole("button", { name: "Create city", exact: true }).click();
  await expect(page.locator("#city-game")).toHaveAttribute("data-month", "0");
  expect(errors).toEqual([]);
});
