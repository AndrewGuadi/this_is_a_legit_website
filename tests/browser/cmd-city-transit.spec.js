const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const moduleFile = (p) =>
  import(pathToFileURL(path.resolve(__dirname, p)).href);
const panel = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
async function imported(page, text) {
  await panel(page, "City settings");
  await page
    .locator("#import-city")
    .setInputFiles({
      name: "transit.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await expect(page.locator("#city-message")).toContainText("Imported city");
}
async function selected(page, x, y) {
  await page.getByLabel("Column (0–39)").fill(String(x));
  await page.getByLabel("Row (0–31)").fill(String(y));
  await page.getByRole("button", { name: "Inspect tile", exact: true }).click();
}
const modes = [
  ["streetcar", "streetcarStop", "Streetcar"],
  ["ferry", "ferryTerminal", "Ferry"],
  ["maglev", "maglevStation", "Maglev"],
];
for (const [mode, stop, label] of modes)
  test(`${mode} construction connects assigned commuters, exports and recovers after terminal closure`, async ({
    page,
  }, info) => {
    const { transitCity } = await moduleFile("../city/transit-fixture.mjs");
    const { serializeCity } = await moduleFile(
      "../../static/cmd-city/save.mjs",
    );
    const { applyAction } = await moduleFile("../../static/cmd-city/core.mjs");
    const city = transitCity(mode);
    expect(applyAction(city, { type: "bulldoze", x: 7, y: 17 }).ok).toBe(true);
    await page.goto("/games/cmd-city");
    await imported(page, serializeCity(city));
    await panel(page, "City report");
    const assigned = () =>
      page
        .locator("#city-indicators dt")
        .filter({ hasText: `${label} assigned commuters` })
        .locator("xpath=following-sibling::dd[1]");
    await expect(assigned()).toHaveText("0");
    await selected(page, 7, 17);
    await page.getByLabel("Construction category").selectOption("Transport");
    for (const tool of [
      "streetcarTrack",
      "streetcarStop",
      "ferryTerminal",
      "maglevTrack",
      "maglevStation",
    ])
      await expect(page.locator(`[data-tool="${tool}"]`)).toBeVisible();
    await page.locator(`[data-tool="${stop}"]`).click();
    await page.locator("#city-map").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#city-message")).toContainText("built");
    await panel(page, "City report");
    await expect(assigned()).not.toHaveText("0");
    const count = await assigned().textContent();
    if (
      info.project.name === "chromium-1440" ||
      (mode === "streetcar" && info.project.name === "chromium-390")
    ) {
      const folder = path.resolve(
        __dirname,
        "../../docs/cmd-city/evidence/CMD-05/transit",
      );
      await fs.mkdir(folder, { recursive: true });
      await page
        .locator("#panel-history")
        .screenshot({
          path: path.join(folder, `${mode}-${info.project.name}.png`),
        });
      if (info.project.name === "chromium-1440")
        await page
          .locator("#city-map")
          .screenshot({ path: path.join(folder, `${mode}-map.png`) });
    }
    await panel(page, "City settings");
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export city", exact: true })
      .click();
    const download = await pending;
    const saved = await fs.readFile(await download.path(), "utf8");
    await imported(page, saved);
    await panel(page, "City report");
    await expect(assigned()).toHaveText(count);
    await selected(page, 7, 17);
    await page.locator("#toggle-facility").click();
    await panel(page, "City report");
    await expect(assigned()).toHaveText("0");
    await page.locator("#toggle-facility").click();
    await panel(page, "City report");
    await expect(assigned()).toHaveText(count);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
