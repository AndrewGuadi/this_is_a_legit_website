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
  page.getByRole("button", { name, exact: true }).click({ timeout: 7000 });
const amount = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
async function selected(page, x, y) {
  await page.getByLabel("Column (0–39)").fill(String(x));
  await page.getByLabel("Row (0–31)").fill(String(y));
  await page.getByRole("button", { name: "Inspect tile", exact: true }).click();
}
async function exported(page) {
  await panel(page, "City settings");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export city", exact: true }).click();
  const file = await pending;
  return fs.readFile(await file.path(), "utf8");
}
async function imported(page, text) {
  await panel(page, "City settings");
  await page
    .locator("#import-city")
    .setInputFiles({
      name: "resident-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await expect(page.locator("#city-message")).toContainText("Imported city");
}
async function month(page) {
  const before = await page.locator("#city-game").getAttribute("data-month");
  await page.locator('[data-speed="1"]').click();
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await expect(page.locator("#city-game")).not.toHaveAttribute(
    "data-month",
    before,
    { timeout: 10000 },
  );
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
}
async function populatedCity() {
  const { createCity, applyAction } = await model("core.mjs");
  const { createHouseholds } = await model("households.mjs");
  const { createServices } = await model("services.mjs");
  const city = createCity({ name: "Residents test town" });
  for (const tile of city.tiles) {
    if (tile.type === "residential") {
      tile.level = 2;
      tile.occupancy = 24;
    }
    if (["wind", "water", "sewage", "landfill"].includes(tile.type))
      tile.modules = 3;
    if (tile.type === "road") tile.type = "avenue";
  }
  city.households = createHouseholds(city);
  city.services = createServices(city);
  let wealth = 0;
  for (const home of city.households.homes)
    if (home) home.wealth = wealth++ % 3;
  expect(
    applyAction(city, { type: "department", department: "finance" }).ok,
  ).toBe(true);
  return city;
}

test("resident cohorts, shopping and private budgets reflect actual booked state and survive import", async ({
  page,
}, info) => {
  await page.goto(route);
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await panel(page, "Residents & wealth");
  await expect(page.locator("#resident-classes")).toContainText("Low wealth");
  await month(page);
  await panel(page, "Residents & wealth");
  await expect(page.locator("#private-budget-report")).toContainText(
    "Opening private cash",
  );
  await selected(page, 5, 9);
  await expect(page.locator("#home-economy")).toContainText("Private cash");
  const text = await exported(page),
    region = JSON.parse(text),
    city = region.cities[0].state;
  const { measure } = await model("core.mjs");
  const r = measure(city).households,
    l = city.households.ledger;
  expect(r.population).toBe(
    r.demographics.children + r.demographics.adults + r.demographics.seniors,
  );
  expect(
    l.openingCash +
      l.immigration -
      l.emigration +
      l.wages -
      l.residentialTaxes -
      l.spending,
  ).toBe(l.closingCash);
  expect(l.shoppingWanted).toBeGreaterThan(0);
  expect(l.shoppingBought).toBeGreaterThan(0);
  await panel(page, "Residents & wealth");
  await expect(page.locator("#household-shopping")).toContainText(
    `${r.shopping.bought} / ${r.shopping.wanted}`,
  );
  await expect(page.locator("#private-budget-report")).toContainText(
    amount(l.spending),
  );
  await imported(page, text);
  await panel(page, "Residents & wealth");
  await expect(page.locator("#household-shopping")).toContainText(
    `${r.shopping.bought} / ${r.shopping.wanted}`,
  );
  await page.getByLabel("Map overlay", { exact: true }).selectOption("wealth");
  await expect(page.locator("#overlay-caption")).toContainText(
    "RESIDENT WEALTH",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#panel-residents")
    .screenshot({
      path: path.join(
        __dirname,
        "../../dev_docs/evidence/CMD-03/ui",
        `residents-${info.project.name}.png`,
      ),
    });
});

test("Finance gates class rates while bulk rates remain available and booked receipts use the selected classes", async ({
  page,
}) => {
  await page.goto(route);
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await panel(page, "Residents & wealth");
  await expect(
    page.getByLabel("Residential low wealth tax rate", { exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#class-tax-availability")).toContainText(
    "Finance",
  );
  const city = await populatedCity(),
    { serializeCity } = await model("save.mjs");
  await imported(page, serializeCity(city));
  await panel(page, "Residents & wealth");
  await expect(
    page.getByLabel("Residential low wealth tax rate", { exact: true }),
  ).toBeEnabled();
  await panel(page, "Budget & taxes");
  await page.locator("#tax-residential").fill("10");
  await page.locator("#tax-residential").press("Tab");
  await panel(page, "Residents & wealth");
  for (const label of ["low", "middle", "high"])
    await expect(
      page.getByLabel(`Residential ${label} wealth tax rate`, { exact: true }),
    ).toHaveValue("10");
  for (const [label, rate] of [
    ["low", 0],
    ["middle", 12],
    ["high", 20],
  ]) {
    await page
      .getByLabel(`Residential ${label} wealth tax rate`, { exact: true })
      .fill(String(rate));
    await page
      .getByLabel(`Residential ${label} wealth tax rate`, { exact: true })
      .press("Tab");
  }
  await month(page);
  const final = JSON.parse(await exported(page)).cities[0].state;
  expect(final.households.wealthTaxes.residential).toEqual([0, 12, 20]);
  let taxes = 0;
  for (const h of final.households.homes)
    if (h) {
      const due = Math.floor(
        ((h.children + h.adults + h.seniors) * 2400 * [0, 12, 20][h.wealth]) /
          100,
      );
      expect(h.taxes).toBe(due);
      taxes += h.taxes;
    }
  expect(final.households.ledger.residentialTaxes).toBe(taxes);
  expect(final.history.at(-1).income).toBe(
    taxes +
      final.households.ledger.commercialTaxes +
      final.households.ledger.industrialTaxes,
  );
  await panel(page, "Residents & wealth");
  await expect(page.locator("#class-tax-booked")).toContainText(amount(taxes));
});

test("deliberate medical and crime cases dispatch saved road vehicles and conserve queues and cargo", async ({
  page,
}, info) => {
  await page.goto(route);
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await panel(page, "Services & dispatch");
  const city = await populatedCity(),
    { serializeCity } = await model("save.mjs");
  await imported(page, serializeCity(city));
  await selected(page, 15, 23);
  await panel(page, "Services & dispatch");
  for (const [kind, count] of [
    ["medical", 8],
    ["crime", 6],
  ]) {
    await page
      .getByLabel("Service scenario type", { exact: true })
      .selectOption(kind);
    await page
      .getByLabel("Service case units", { exact: true })
      .fill(String(count));
    await page
      .getByRole("button", { name: "Add service cases", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Create service cases", exact: true })
      .click();
  }
  await expect(page.locator("#service-case-report")).toContainText("8");
  await expect(page.locator("#service-case-report")).toContainText("6");
  await month(page);
  const text = await exported(page),
    state = JSON.parse(text).cities[0].state;
  const moving = state.services.vehicles.filter(
    (v) => ["medical", "police"].includes(v.kind) && v.status !== "idle",
  );
  expect(moving.length).toBeGreaterThan(0);
  for (const v of moving) {
    expect(v.path[v.cursor]).toBe(v.position);
    for (let i = 1; i < v.path.length; i++)
      expect(
        Math.abs((v.path[i] % 40) - (v.path[i - 1] % 40)) +
          Math.abs(Math.floor(v.path[i] / 40) - Math.floor(v.path[i - 1] / 40)),
      ).toBe(1);
  }
  expect(state.services.counters.treatedPatients).toBe(0);
  expect(state.services.counters.resolvedCrimes).toBe(0);
  await imported(page, text);
  const restored = JSON.parse(await exported(page)).cities[0].state;
  expect(restored.services).toEqual(state.services);
  const { measure } = await model("core.mjs");
  expect(
    Object.values(measure(restored).services.conservation).every(Boolean),
  ).toBe(true);
  await panel(page, "Services & dispatch");
  await expect(page.locator("#service-fleet")).toContainText("Medical");
  await expect(page.locator("#service-vehicle-rows")).not.toBeEmpty();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#panel-dispatch")
    .screenshot({
      path: path.join(
        __dirname,
        "../../dev_docs/evidence/CMD-03/ui",
        `dispatch-${info.project.name}.png`,
      ),
    });
});

test("a valid imported closed gateway can be reopened through its road control and restores access", async ({
  page,
}, info) => {
  await page.goto(route);
  await expect(page.locator("#city-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  const data = JSON.parse(await exported(page));
  data.cities[0].state.tiles[16 * 40].enabled = false;
  await imported(page, JSON.stringify(data));
  await selected(page, 0, 16);
  await expect(page.locator("#toggle-facility")).toBeEnabled();
  await expect(page.locator("#tile-lines")).toContainText("No road path");
  await page
    .locator("#city-map")
    .screenshot({
      path: path.join(
        __dirname,
        "../../dev_docs/evidence/CMD-03/ui",
        `closed-road-${info.project.name}.png`,
      ),
    });
  await page
    .getByRole("button", { name: "Reopen selected road", exact: true })
    .click();
  await expect(page.locator("#tile-lines")).toContainText(
    "Connected to the regional road gateway",
  );
  await expect(
    page.getByRole("button", { name: "Close selected road", exact: true }),
  ).toBeEnabled();
  const restored = JSON.parse(await exported(page)).cities[0].state;
  expect(restored.tiles[16 * 40].enabled).toBe(true);
});
