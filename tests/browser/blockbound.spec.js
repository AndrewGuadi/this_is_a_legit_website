const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const path = "/games/blockbound-first-light";
const root = (page) => page.locator("#blockbound-game");
const action = (page) => page.locator("#game-action");

test("C game starts, moves, pauses exactly, resumes and restarts", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(path);
  await expect(root(page)).toHaveAttribute("data-state", "ready");
  await expect(action(page)).toBeEnabled();
  await action(page).click();
  await expect(root(page)).toHaveAttribute("data-state", "playing");
  const before = await page.locator("canvas").screenshot();
  await page.keyboard.down("w");
  await page.waitForTimeout(350);
  await page.keyboard.up("w");
  expect(await page.locator("canvas").screenshot()).not.toEqual(before);
  await page.keyboard.press("p");
  await expect(root(page)).toHaveAttribute("data-state", "paused");
  const frozen = await page.locator("canvas").screenshot();
  await page.waitForTimeout(200);
  expect(await page.locator("canvas").screenshot()).toEqual(frozen);
  await action(page).click();
  await expect(root(page)).toHaveAttribute("data-state", "playing");
  await page.getByRole("button", { name: "Restart walk", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep walking" }).click();
  await expect(root(page)).toHaveAttribute("data-state", "paused");
  await page.getByRole("button", { name: "Restart walk", exact: true }).click();
  await page.getByRole("button", { name: "Start a new walk" }).click();
  await expect(root(page)).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#shard-count")).toHaveText("0");
  expect(errors).toEqual([]);
});

test("interaction text, touch movement, sound and local-only requests work", async ({ page }, info) => {
  const foreign = [];
  page.on("request", request => {
    if (!request.url().startsWith("http://127.0.0.1:5081")) foreign.push(request.url());
  });
  await page.goto(path);
  await action(page).click();
  await page.keyboard.press("e");
  await expect(page.locator("#dialogue-text")).toContainText("Nothing is close enough");
  const forward = page.getByRole("button", { name: "Move forward", exact: true });
  await forward.dispatchEvent("pointerdown", { pointerId: 7 });
  await page.waitForTimeout(200);
  await forward.dispatchEvent("pointerup", { pointerId: 7 });
  await page.getByRole("button", { name: "Interact", exact: true }).click();
  await expect(page.locator("#dialogue-text")).toBeVisible();
  await page.getByRole("button", { name: "Sound off" }).click();
  await expect(page.getByRole("button", { name: "Sound on" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sound on" }).click();
  await expect(page.getByRole("button", { name: "Sound off" })).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({ path: info.outputPath("blockbound-playing.png"), fullPage: true });
  expect(foreign).toEqual([]);
});

test("layout, canvas, accessibility and visibility pause are verified", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(root(page)).toHaveAttribute("data-state", "ready");
  const canvas = await page.locator("canvas").boundingBox();
  expect(canvas.width / canvas.height).toBeCloseTo(16 / 9, 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await page.locator("button").all()) {
    if (await button.isVisible()) {
      const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("blockbound-ready.png"), fullPage: true });
  await action(page).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(root(page)).toHaveAttribute("data-state", "paused");
});

test("denied storage and unavailable audio do not block play", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("denied"); } });
    window.AudioContext = class { constructor() { throw new Error("unavailable"); } };
  });
  await page.goto(path);
  await expect(root(page)).toHaveAttribute("data-state", "ready");
  await page.getByRole("button", { name: "Sound off" }).click();
  await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();
  await action(page).click();
  await expect(root(page)).toHaveAttribute("data-state", "playing");
});
