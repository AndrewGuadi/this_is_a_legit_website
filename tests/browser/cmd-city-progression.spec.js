const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const route = "/games/cmd-city";
const model = (file) =>
  import(
    pathToFileURL(path.join(__dirname, "../../static/cmd-city", file)).href
  );
const panel = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
async function selectTile(page, x, y) {
  await page.getByLabel("Column (0–39)").fill(String(x));
  await page.getByLabel("Row (0–31)").fill(String(y));
  await page.getByRole("button", { name: "Inspect tile", exact: true }).click();
}
async function importSave(page, data, name = "fixture.json") {
  await panel(page, "City settings");
  await page
    .locator("#import-city")
    .setInputFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(data),
    });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await expect(page.locator("#city-message")).toContainText("Imported city");
}
async function exportSave(page) {
  await panel(page, "City settings");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export city", exact: true }).click();
  const file = await pending;
  return fs.readFile(await file.path(), "utf8");
}

test("government permits govern construction and tutorial controls preserve finances", async ({
  page,
}, testInfo) => {
  await page.goto(route);
  await page.getByLabel("Construction category").selectOption("Utilities");
  await selectTile(page, 14, 15);
  await page.locator('[data-tool="waterFilter"]').click();
  await page.locator("#city-map").press("Enter");
  await expect(page.locator("#city-message")).toContainText(
    "Install Utilities",
  );
  await panel(page, "Government & goals");
  await expect(page.locator("#government-status")).toContainText(
    "1 department slot",
  );
  await expect(page.locator("#department-utilities")).toContainText(
    "Permits new water filtration",
  );
  await expect(page.locator("#request-housing")).toContainText(
    "12 game months from acceptance",
  );
  await expect(page.locator("#department-education")).toContainText("500");
  await expect(
    page.getByRole("button", { name: "Install Education", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Install Utilities", exact: true })
    .click();
  await expect(page.locator("#department-utilities")).toContainText(
    "Installed",
  );
  await expect(page.locator("#cash-value")).toHaveText("$48,000");
  await selectTile(page, 14, 15);
  await page.locator('[data-tool="waterFilter"]').click();
  await page.locator("#city-map").press("Enter");
  await expect(page.locator("#tile-title")).toHaveText("Water filtration");
  await expect(page.locator("#cash-value")).toHaveText("$44,400");
  await panel(page, "Government & goals");
  const funds = await page.locator("#cash-value").textContent();
  await page
    .getByRole("button", { name: "Check tutorial step", exact: true })
    .click();
  await expect(page.locator("#tutorial-progress")).toContainText("2 / 8");
  await page
    .getByRole("button", { name: "Dismiss tutorial", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume tutorial", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume tutorial", exact: true })
    .click();
  await expect(page.locator("#tutorial-progress")).toContainText("2 / 8");
  await expect(page.locator("#cash-value")).toHaveText(funds);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .locator("#panel-government")
    .screenshot({
      path: path.join(
        __dirname,
        "../../dev_docs/evidence/CMD-02/ui",
        `government-${testInfo.project.name}.png`,
      ),
    });
});

test("a request completes from booked months and its one-time claim survives export/import and local save", async ({
  page,
}) => {
  await page.goto(route);
  await panel(page, "Government & goals");
  await page
    .locator("#request-balancedBooks")
    .getByRole("button", { name: "Accept request", exact: true })
    .click();
  await expect(page.locator("#request-balancedBooks")).toContainText("Active");
  await page.locator('[data-speed="4"]').click();
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await expect(page.locator("#request-balancedBooks")).toContainText(
    "Completed",
    { timeout: 15000 },
  );
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  const before = Number(
    (await page.locator("#cash-value").textContent()).replace(/[^\d-]/g, ""),
  );
  await panel(page, "Government & goals");
  await page
    .locator("#request-balancedBooks")
    .getByRole("button", { name: "Claim reward", exact: true })
    .click();
  await expect(page.locator("#request-balancedBooks")).toContainText("Claimed");
  const claimed = Number(
    (await page.locator("#cash-value").textContent()).replace(/[^\d-]/g, ""),
  );
  expect(claimed - before).toBe(1000);
  const text = await exportSave(page),
    data = JSON.parse(text);
  expect(data.cities[0].state.civic.requests.balancedBooks.status).toBe(
    "claimed",
  );
  const lastBooked = data.cities[0].state.history.at(-1).cash;
  expect(data.cities[0].state.cash - lastBooked).toBe(100000);
  await importSave(page, text);
  await panel(page, "Government & goals");
  await expect(page.locator("#request-balancedBooks")).toContainText("Claimed");
  await expect(
    page
      .locator("#request-balancedBooks")
      .getByRole("button", { name: "Claim reward", exact: true }),
  ).toBeHidden();
  await panel(page, "City settings");
  await page.getByLabel("Save this city in this browser").check();
  await page.reload();
  await panel(page, "Government & goals");
  await expect(page.locator("#request-balancedBooks")).toContainText("Claimed");
  await expect(page.locator("#cash-value")).toHaveText(
    `$${claimed.toLocaleString("en-US")}`,
  );
});

test("environment controls expose actual persistent contamination, wind and a confirmed reactor scenario", async ({
  page,
}, testInfo) => {
  const { createCity, applyAction, advanceMonth } = await model("core.mjs");
  const { serializeCity } = await model("save.mjs");
  const city = createCity({ sandbox: true, name: "Environment fixture" });
  city.inventory.ore = 100;
  expect(
    applyAction(city, { type: "build", tool: "nuclear", x: 14, y: 15 }).ok,
  ).toBe(true);
  advanceMonth(city);
  advanceMonth(city);
  const data = serializeCity(city);
  await page.goto(route);
  await importSave(page, data);
  await expect(page.locator("#city-game")).toHaveAttribute("data-month", "2");
  await panel(page, "Environment");
  await page
    .getByLabel("Air movement direction", { exact: true })
    .selectOption("N");
  await expect(page.locator("#environment-wind")).toContainText("North");
  await expect(page.locator("#water-quality-report")).toContainText(
    "Delivered water contamination",
  );
  for (const [value, caption] of [
    ["air", "AIR POLLUTION"],
    ["ground", "GROUND CONTAMINATION"],
    ["radiation", "RADIATION"],
  ]) {
    await page.getByLabel("Map overlay", { exact: true }).selectOption(value);
    await expect(page.locator("#overlay-caption")).toContainText(caption);
  }
  await selectTile(page, 14, 15);
  await panel(page, "Environment");
  await page
    .getByRole("button", { name: "Trigger reactor incident", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm reactor incident", exact: true })
    .click();
  await expect(page.locator("#tile-title")).toHaveText("Damaged structure");
  await expect(page.locator("#tile-lines")).toContainText("Radiation");
  await expect(page.locator("#radiation-status")).toContainText("restricted");
  await expect(
    page.getByRole("button", { name: "Trigger reactor incident", exact: true }),
  ).toBeDisabled();
  const exported = JSON.parse(await exportSave(page));
  expect(exported.cities[0].state.environment.wind).toBe("N");
  expect(
    exported.cities[0].state.environment.radiation[15 * 40 + 14],
  ).toBeGreaterThan(0);
  await panel(page, "Environment");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page
    .locator("#panel-environment")
    .screenshot({
      path: path.join(
        __dirname,
        "../../dev_docs/evidence/CMD-02/ui",
        `environment-${testInfo.project.name}.png`,
      ),
    });
});

test("Finance redemption requires confirmation and removes the actual obligation exactly once", async ({
  page,
}) => {
  const { createCity, applyAction } = await model("core.mjs");
  const { serializeCity } = await model("save.mjs");
  const city = createCity({ name: "Finance fixture" });
  for (const tile of city.tiles) {
    if (tile.type === "residential") {
      tile.level = 2;
      tile.occupancy = 24;
    }
    if (["wind", "water", "sewage", "landfill"].includes(tile.type))
      tile.modules = 3;
  }
  expect(
    applyAction(city, { type: "department", department: "finance" }).ok,
  ).toBe(true);
  expect(applyAction(city, { type: "bond" }).ok).toBe(true);
  const originalBalance = city.bonds[0].balance;
  await page.goto(route);
  await importSave(page, serializeCity(city));
  await panel(page, "Budget & taxes");
  await page
    .getByRole("button", { name: "Redeem bond early", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("$22,000");
  await page
    .getByRole("button", { name: "Keep this city", exact: true })
    .click();
  expect(JSON.parse(await exportSave(page)).cities[0].state.bonds).toHaveLength(
    1,
  );
  await panel(page, "Budget & taxes");
  await page
    .getByRole("button", { name: "Redeem bond early", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Redeem obligation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Redeem bond early", exact: true }),
  ).toBeHidden();
  const final = JSON.parse(await exportSave(page)).cities[0].state;
  expect(final.bonds).toHaveLength(0);
  expect(final.cash).toBe(city.cash - originalBalance);
  expect(final.history).toEqual(city.history);
});
