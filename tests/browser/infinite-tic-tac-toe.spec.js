const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const path = "/games/infinite-tic-tac-toe";
const root = (page) => page.locator("#ttt-game");
const cell = (page, index) => page.locator(`[data-cell="${index}"]`);
const start = async (page) => {
  await page.goto(path);
  await expect(root(page)).toHaveAttribute("data-state", "ready");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(root(page)).toHaveAttribute("data-state", "playing");
};
const place = async (page, index) => {
  await page.locator("#place-action").click();
  await cell(page, index).click();
};
const remove = async (page, index) => {
  await page.locator("#remove-action").click();
  await cell(page, index).click();
};
const emptyBoard = async (page) => {
  for (let index = 0; index < 9; index += 1) {
    await expect(cell(page, index).locator("span")).toHaveText("");
  }
};
const noOverflow = async (page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
};
const shot = async (page, info, name) => {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true, animations: "disabled" });
};

test("place, remove, invalid moves, and reset cancellation preserve legal turn behavior", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  await place(page, 0);
  await expect(cell(page, 0).locator("span")).toHaveText("X");
  await expect(page.locator("#turn-label")).toHaveText("O's turn");
  await remove(page, 0);
  await expect(cell(page, 0).locator("span")).toHaveText("");
  await expect(page.locator("#turn-label")).toHaveText("X's turn");
  await place(page, 0);
  await cell(page, 0).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#game-status")).toContainText("occupied");
  await expect(page.locator("#turn-label")).toHaveText("O's turn");
  await page.getByRole("button", { name: "Reset match", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await expect(root(page)).toHaveAttribute("data-state", "playing");
  await expect(cell(page, 0).locator("span")).toHaveText("X");
  await expect(page.locator("#turn-label")).toHaveText("O's turn");
  await page.getByRole("button", { name: "Reset match", exact: true }).click();
  await page.getByRole("button", { name: "Reset everything", exact: true }).click();
  await expect(root(page)).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#score-x")).toHaveText("0");
  await expect(page.locator("#round-number")).toHaveText("1");
  await emptyBoard(page);
  await shot(page, info, "reset-ready");
  expect(errors).toEqual([]);
});

test("a line scores one point and rounds continue endlessly with alternating starters", async ({ page }, info) => {
  await start(page);
  for (const index of [0, 3, 1, 4]) await place(page, index);
  await place(page, 2);
  await expect(root(page)).toHaveAttribute("data-state", "round-over");
  await expect(page.locator("#score-x")).toHaveText("1");
  await expect(page.locator(".is-winning")).toHaveCount(3);
  await expect(page.locator("#result-title")).toHaveText("X takes the round.");
  await shot(page, info, "x-round-complete");
  await page.getByRole("button", { name: "Start round 2", exact: true }).click();
  await expect(page.locator("#turn-label")).toHaveText("O's turn");
  await expect(page.locator("#round-number")).toHaveText("2");
  await emptyBoard(page);
  for (const index of [0, 3, 1, 4, 2]) await place(page, index);
  await expect(page.locator("#score-o")).toHaveText("1");
  await expect(page.locator("#score-x")).toHaveText("1");
  await page.getByRole("button", { name: "Start round 3", exact: true }).click();
  await expect(root(page)).toHaveAttribute("data-state", "playing");
  await expect(page.locator("#turn-label")).toHaveText("X's turn");
  await expect(page.locator("#round-number")).toHaveText("3");
});

test("three repeated place/remove cycles clear only the board and preserve the endless match", async ({ page }, info) => {
  await start(page);
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await page.locator("#place-action").click();
    await place(page, 4);
    if (cycle < 3) await expect(page.locator("#repeat-x")).toHaveAttribute("aria-label", `X repeat count: ${cycle} of 3`);
    await remove(page, 4);
    if (cycle < 3) {
      await expect(page.locator("#repeat-o")).toHaveAttribute("aria-label", `O repeat count: ${cycle} of 3`);
      await expect(page.locator("#loop-count")).toHaveText("0");
    }
  }
  await emptyBoard(page);
  await expect(root(page)).toHaveAttribute("data-state", "playing");
  await expect(page.locator("#loop-count")).toHaveText("1");
  await expect(page.locator("#score-x")).toHaveText("0");
  await expect(page.locator("#score-o")).toHaveText("0");
  await expect(page.locator("#round-number")).toHaveText("1");
  await expect(page.locator("#turn-label")).toHaveText("X's turn");
  await expect(page.locator("#repeat-x")).toHaveAttribute("aria-label", "X repeat count: 0 of 3");
  await expect(page.locator("#repeat-o")).toHaveAttribute("aria-label", "O repeat count: 0 of 3");
  await expect(page.locator("#game-status")).toContainText("Loop broken");
  await shot(page, info, "loop-reset");
});

test("keyboard, sound, accessibility, responsive layout, and same-origin assets", async ({ page }, info) => {
  const errors = [];
  const foreign = [];
  const failed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:5081") && !request.url().startsWith("data:")) foreign.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await noOverflow(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  for (const button of await page.locator("button:visible").all()) {
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Start match", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(cell(page, 0)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cell(page, 1)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(cell(page, 1).locator("span")).toHaveText("X");
  await page.keyboard.press("ArrowDown");
  await expect(cell(page, 4)).toBeFocused();
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sound on", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sound on", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sound off", exact: true })).toHaveAttribute("aria-pressed", "false");
  await noOverflow(page);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await shot(page, info, "keyboard-playing");
  expect(errors).toEqual([]);
  expect(foreign).toEqual([]);
  expect(failed).toEqual([]);
});

test("real touch input works with denied storage and unavailable audio", async ({ page, browser }, info) => {
  const context = await browser.newContext({ viewport: page.viewportSize(), hasTouch: true, isMobile: true });
  const touch = await context.newPage();
  const errors = [];
  touch.on("pageerror", (error) => errors.push(error.message));
  await touch.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("denied"); } });
    window.AudioContext = class { constructor() { throw new Error("unavailable"); } };
    window.webkitAudioContext = window.AudioContext;
  });
  await touch.goto(path);
  await touch.getByRole("button", { name: "Start match", exact: true }).tap();
  await cell(touch, 4).tap();
  await expect(cell(touch, 4).locator("span")).toHaveText("X");
  await touch.getByRole("button", { name: "Sound off", exact: true }).tap();
  await expect(touch.locator("#audio-note")).toContainText("unavailable");
  await touch.locator("#remove-action").tap();
  await cell(touch, 4).tap();
  await expect(cell(touch, 4).locator("span")).toHaveText("");
  await expect(touch.locator("#storage-note")).toContainText("unavailable");
  await noOverflow(touch);
  await shot(touch, info, "touch-fallback");
  expect(errors).toEqual([]);
  await context.close();
});

test("short landscape keeps the complete board and controls reachable without horizontal overflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await start(page);
  await place(page, 4);
  await boardScroll(page);
  const box = await page.locator("#board").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(844);
  expect(await page.locator("#board").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Reset match", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(cell(page, 4).locator("span")).toHaveText("X");
  await noOverflow(page);
  await shot(page, info, "short-landscape");
});

async function boardScroll(page) {
  await page.locator("#board").scrollIntoViewIfNeeded();
}
