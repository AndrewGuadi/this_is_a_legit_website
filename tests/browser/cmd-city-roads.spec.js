const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const model = (f) =>
  import(
    pathToFileURL(path.resolve(__dirname, "../../static/cmd-city", f)).href
  );
async function setup(page) {
  const { createCity } = await model("core.mjs"),
    { serializeCity } = await model("save.mjs");
  const city = createCity({ starter: false, sandbox: true });
  for (const t of city.tiles) t.terrain = "land";
  await page.goto("/games/cmd-city");
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  await page.locator("#import-city").setInputFiles({
    name: "road-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeCity(city)),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import city", exact: true })
    .click();
  await expect(page.locator("#city-message")).toContainText("Imported city");
  await page.getByText("Road planner", { exact: true }).click();
}
async function config(page, shape = "straight") {
  await page.getByLabel("Road shape").selectOption(shape);
  for (const [id, value] of Object.entries({
    "road-start-x": 5,
    "road-start-y": 12,
    "road-end-x": 15,
    "road-end-y": 12,
    "road-control-x": 10,
    "road-control-y": 5,
  }))
    await page.locator("#" + id).fill(String(value));
  if (shape === "block") await page.locator("#road-end-y").fill("18");
  if (shape === "circle") {
    await page.locator("#road-start-x").fill("16");
    await page.locator("#road-start-y").fill("16");
    await page.locator("#road-end-x").fill("22");
    await page.locator("#road-end-y").fill("16");
  }
  await page.getByRole("button", { name: "Preview road", exact: true }).click();
}
test("road shape previews cancel without spending and a confirmed straight plan builds exactly once", async ({
  page,
}, info) => {
  await setup(page);
  const before = await page.locator("#cash-value").textContent();
  for (const shape of ["straight", "curve", "circle", "block"]) {
    await config(page, shape);
    await expect(page.locator("#road-plan-status")).toContainText("new tiles");
    await expect(
      page.getByRole("button", { name: "Build road plan", exact: true }),
    ).toBeEnabled();
    await expect(page.locator("#cash-value")).toHaveText(before);
    await page
      .getByRole("button", { name: "Cancel road plan", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Build road plan", exact: true }),
    ).toBeDisabled();
  }
  await config(page);
  if (
    info.project.name === "chromium-1440" ||
    info.project.name === "chromium-390"
  ) {
    const dir = path.resolve(
      __dirname,
      "../../docs/cmd-city/evidence/CMD-05/roads",
    );
    await fs.mkdir(dir, { recursive: true });
    await page
      .locator("#road-planner")
      .screenshot({ path: path.join(dir, `planner-${info.project.name}.png`) });
    await page
      .locator("#city-map")
      .screenshot({ path: path.join(dir, `preview-${info.project.name}.png`) });
  }
  await page
    .getByRole("button", { name: "Build road plan", exact: true })
    .click();
  await expect(page.locator("#city-message")).toContainText(
    "Built 11 road tiles",
  );
  await expect(page.locator("#cash-value")).not.toHaveText(before);
  await expect(
    page.getByRole("button", { name: "Build road plan", exact: true }),
  ).toBeDisabled();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "City settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Export city", exact: true }).click();
  const downloaded = await pending;
  const saved = JSON.parse(await fs.readFile(await downloaded.path(), "utf8"));
  const city = saved.cities[saved.active].state;
  for (let x = 5; x <= 15; x++)
    expect(city.tiles[12 * 40 + x].type).toBe("road");
  expect(city.cash).toBe(25000000 - 110000);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("road preview rejects invalid coordinates and Escape cancels without building", async ({
  page,
}) => {
  await setup(page);
  await config(page);
  const before = await page.locator("#cash-value").textContent();
  await page.locator("#city-map").focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Build road plan", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#cash-value")).toHaveText(before);
  await page.locator("#road-start-x").fill("-1");
  await page.getByRole("button", { name: "Preview road", exact: true }).click();
  await expect(page.locator("#road-plan-status")).toContainText("valid");
  await expect(
    page.getByRole("button", { name: "Build road plan", exact: true }),
  ).toBeDisabled();
});
test("touch endpoint selection previews a road and canceled touch cannot commit", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: info.project.use.viewport.width, height: 1000 },
    }),
    page = await context.newPage();
  await setup(page);
  await page.getByRole("button", { name: "Draw on map", exact: true }).click();
  await page.locator("#city-map").scrollIntoViewIfNeeded();
  const box = await page.locator("#city-map").boundingBox();
  const scale = Math.min((box.width - 32) / 960, (box.height - 42) / 768);
  const pos = (x, y) => ({
    x: box.x + box.width / 2 - 480 * scale + (x + 0.5) * 24 * scale,
    y: box.y + box.height / 2 - 384 * scale + 7 + (y + 0.5) * 24 * scale,
  });
  const start = pos(5, 12),
    end = pos(15, 12),
    before = await page.locator("#cash-value").textContent();
  await page.touchscreen.tap(start.x, start.y);
  await page.touchscreen.tap(end.x, end.y);
  await expect(page.locator("#road-plan-status")).toContainText("11 new tiles");
  await expect(page.locator("#cash-value")).toHaveText(before);
  await page.locator("#city-map").dispatchEvent("pointerdown", {
    pointerId: 88,
    pointerType: "touch",
    button: 0,
    clientX: start.x,
    clientY: start.y,
  });
  await page
    .locator("#city-map")
    .dispatchEvent("pointercancel", { pointerId: 88, pointerType: "touch" });
  await page.locator("#city-map").dispatchEvent("pointerup", {
    pointerId: 88,
    pointerType: "touch",
    button: 0,
    clientX: end.x,
    clientY: end.y,
  });
  await expect(page.locator("#cash-value")).toHaveText(before);
  await expect(
    page.getByRole("button", { name: "Build road plan", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Draw on map", exact: true }).click();
  await page.locator("#city-map").scrollIntoViewIfNeeded();
  const box2 = await page.locator("#city-map").boundingBox();
  const start2 = { x: start.x + box2.x - box.x, y: start.y + box2.y - box.y };
  const end2 = { x: end.x + box2.x - box.x, y: end.y + box2.y - box.y };
  await page.mouse.move(start2.x, start2.y);
  await page.mouse.down();
  await page.mouse.move(end2.x, end2.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator("#road-plan-status")).toContainText("11 new tiles");
  await expect(page.locator("#cash-value")).toHaveText(before);
  await context.close();
});

test("canceling a large road build keeps the complete exported region unchanged and leaves controls usable", async ({
  page,
}) => {
  await setup(page);
  const exported = async () => {
    await page
      .getByRole("button", { name: "City settings", exact: true })
      .click();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export city", exact: true })
      .click();
    const file = await pending;
    return fs.readFile(await file.path(), "utf8");
  };
  const before = await exported();
  await page.getByLabel("Road shape").selectOption("block");
  for (const [id, value] of Object.entries({
    "road-start-x": 0,
    "road-start-y": 0,
    "road-end-x": 39,
    "road-end-y": 31,
  }))
    await page.locator("#" + id).fill(String(value));
  await page.getByRole("button", { name: "Preview road", exact: true }).click();
  await page
    .getByRole("button", { name: "Build road plan", exact: true })
    .click();
  await expect(page.locator("#road-plan-status")).toContainText("Preparing");
  await page
    .getByRole("button", { name: "Cancel road plan", exact: true })
    .click();
  await expect(page.locator("#road-plan-status")).toContainText("canceled");
  expect(await exported()).toBe(before);
  await page.locator("#road-start-x").focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#road-start-x")).toHaveValue("1");
  await config(page);
  await expect(
    page.getByRole("button", { name: "Build road plan", exact: true }),
  ).toBeEnabled();
});
