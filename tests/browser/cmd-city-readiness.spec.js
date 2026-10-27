const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs/promises");
const model = (file) =>
  import(
    pathToFileURL(path.join(__dirname, "../../static/cmd-city", file)).href
  );
async function towerPage(page) {
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
}

test('tower toggle retains keyboard focus through refresh', async ({page}) => {
  await towerPage(page);
  await page.getByLabel('New floor use').selectOption('shops');
  await page.getByRole('button', {name:'Add tower floor', exact:true}).click();
  const close = page.getByRole('button', {name:'Close floor 3', exact:true});
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', {name:'Open floor 3', exact:true})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', {name:'Close floor 3', exact:true})).toBeFocused();
});

test('reselecting a home respects a closed household inspector', async ({page}) => {
  await towerPage(page);
  await page.locator('#home-inspector summary').click();
  await expect(page.locator('#home-inspector')).not.toHaveAttribute('open');
  await page.getByRole('button', {name:'Inspect tile', exact:true}).click();
  await expect(page.locator('#home-inspector')).not.toHaveAttribute('open');
});

test('long inspector stays bounded and keyboard scrollable', async ({page}, info) => {
  await towerPage(page);
  for (let i=0; i<6; i++) await page.getByRole('button', {name:'Add tower floor', exact:true}).click();
  const inspector=page.locator('aside.inspector');
  expect((await inspector.boundingBox()).height).toBeLessThanOrEqual(802);
  await inspector.focus();
  await page.keyboard.press('End');
  await expect.poll(() => inspector.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await fs.mkdir('docs/cmd-city/evidence/READINESS-02/browser', {recursive:true});
  await page.screenshot({path:`docs/cmd-city/evidence/READINESS-02/browser/inspector-${info.project.name}.png`, fullPage:true});
});
