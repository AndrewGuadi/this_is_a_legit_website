const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs/promises");
const model = (file) =>
  import(
    pathToFileURL(path.join(__dirname, "../../static/cmd-city", file)).href
  );
test("mixed tower floors change real capacity and survive export; occupied homes cannot be removed", async ({
  page,
}, info) => {
  const { createCity } = await model("core.mjs"),
    { createHouseholds } = await model("households.mjs"),
    { createFuture } = await model("future.mjs"),
    { serializeCity } = await model("save.mjs");
  const c = createCity({ sandbox: true, name: "Tomorrow District" });
  c.research.completed = ["cleanEnergy", "vertical"];
  c.cash = 100000000;
  Object.assign(c.tiles[607], { type: "tower", level: 1, occupancy: 180 });
  c.households = createHouseholds(c);
  c.future = createFuture(c);
  await page.goto("/games/cmd-city");
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  await page.locator("#import-city").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeCity(c)),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await expect(page.locator("#city-message")).toContainText("Imported city");
  await page.getByLabel("Column (0–39)").fill("7");
  await page.getByLabel("Row (0–31)").fill("15");
  await page.getByRole("button", { name: "Inspect tile", exact: true }).click();
  await expect(page.locator("#future-inspector")).toBeVisible();
  await page.locator("#future-inspector summary").click();
  await expect(page.locator("#tower-floor-list > li")).toHaveCount(2);
  await page.getByLabel("New floor use").selectOption("shops");
  await page
    .getByRole("button", { name: "Add tower floor", exact: true })
    .click();
  await expect(page.locator("#tower-floor-list > li")).toHaveCount(3);
  await expect(page.locator("#tower-summary")).toContainText(
    "180 / 180 residents",
  );
  await expect(
    page.getByRole("button", { name: "Remove floor 1", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Close floor 3", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open floor 3", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open floor 3", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close floor 3", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include("#future-inspector").analyze())
      .violations,
  ).toEqual([]);
  await fs.mkdir("docs/cmd-city/evidence/CMD-05/future/browser", {
    recursive: true,
  });
  await page.screenshot({
    path: `docs/cmd-city/evidence/CMD-05/future/browser/floors-${info.project.name}.png`,
    fullPage: true,
  });
  await page.locator("#future-inspector").screenshot({
    path: `docs/cmd-city/evidence/CMD-05/future/browser/inspector-${info.project.name}.png`,
  });
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export city", exact: true }).click();
  const download = await pending;
  const { parseRegion } = await model("region.mjs");
  const region = parseRegion(await fs.readFile(await download.path(), "utf8"));
  const saved = region.cities[region.active].state;
  expect(
    saved.future.towers.find((t) => t.tile === 607).floors.map((f) => f.use),
  ).toEqual(["homes", "homes", "shops"]);
  expect(saved.tiles[607].occupancy).toBe(180);
});
