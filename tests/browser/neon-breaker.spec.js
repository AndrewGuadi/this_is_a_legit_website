const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const path = "/games/neon-breaker";
const action = (page) => page.locator("#game-action");
const state = (page) => page.locator("#neon-game");
test("intentional launch, real pause, explicit resume and restart cancel", async ({
  page,
}) => {
  await page.goto(path);
  await expect(state(page)).toHaveAttribute("data-state", "ready");
  await action(page).click();
  await expect(state(page)).toHaveAttribute("data-state", "playing");
  await page.keyboard.press("p");
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  const frozen = await page.locator("canvas").screenshot();
  await page.waitForTimeout(200);
  expect(await page.locator("canvas").screenshot()).toEqual(frozen);
  await action(page).click();
  await expect(state(page)).toHaveAttribute("data-state", "playing");
  await page.getByRole("button", { name: "Restart run", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep playing" }).click();
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await action(page).click();
  await page.getByRole("button", { name: "Restart run", exact: true }).click();
  await page.getByRole("button", { name: "Start new run" }).click();
  await expect(state(page)).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#score")).toHaveText("00000");
  await expect(page.locator("#lives")).toHaveText("3");
});
test("resize pauses and unrelated inputs keep gameplay keys", async ({
  page,
}) => {
  await page.goto(path);
  await action(page).click();
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.width, height: size.height - 80 });
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  await page.waitForTimeout(150);
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "unrelated";
    input.setAttribute("aria-label", "Unrelated input");
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.type("a d p ");
  await expect(page.locator("#unrelated")).toHaveValue("a d p ");
  await expect(state(page)).toHaveAttribute("data-state", "paused");
});
test("controls, accessibility, reduced motion and complete field", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator("canvas")).toBeVisible();
  const box = await page.locator("canvas").boundingBox();
  expect(box.width / box.height).toBeCloseTo(1.6, 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const button of await page.locator(".game-controls button").all()) {
    const b = await button.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: info.outputPath("neon-ready.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sound off" }).click();
  await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible();
  await page.getByRole("button", { name: "Sound on" }).click();
  await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();
});
test("denied storage and failed audio remain playable, no third-party requests", async ({
  page,
}) => {
  const foreign = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:5081")) foreign.push(r.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("denied");
      },
    });
    window.AudioContext = class {
      constructor() {
        throw new Error("unavailable");
      }
    };
  });
  await page.goto(path);
  await page.getByLabel("Save best on this device").click();
  await expect(page.locator("#storage-note")).toContainText("unavailable");
  await page.getByRole("button", { name: "Sound off" }).click();
  await expect(page.locator("#audio-note")).toContainText("unavailable");
  await action(page).click();
  await expect(state(page)).toHaveAttribute("data-state", "playing");
  expect(foreign).toEqual([]);
});
test("pointer cancellation and visibility loss pause without automatic resume", async ({
  page,
}) => {
  await page.goto(path);
  await action(page).click();
  await page
    .locator("#touch-strip")
    .dispatchEvent("pointercancel", { pointerId: 1 });
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  await action(page).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(state(page)).toHaveAttribute("data-state", "paused");
});
test("launch keeps the entire field and controls visible in short landscape screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(path);
  await action(page).click();
  const field = await page.locator("canvas").boundingBox(),
    controls = await page.locator(".game-controls").boundingBox();
  expect(field.y).toBeGreaterThanOrEqual(0);
  expect(field.y + field.height).toBeLessThanOrEqual(390);
  expect(controls.y + controls.height).toBeLessThanOrEqual(390);
});
// Read-only test instrumentation. The production modules expose no testing API.
// Capture the created state for assertions; all input still goes through actual DOM events.
async function observeModel(page) {
  await page.route("**/neon-breaker/core.mjs", async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    expect(body).toContain("export function createGame()");
    body = body.replace(
      "export function createGame()",
      "function makeObservedGame()",
    );
    body +=
      "\nexport function createGame(){const state=makeObservedGame();window.__neonSnapshot=()=>structuredClone(state);return state;}\n";
    await route.fulfill({ response, body });
  });
}
test("restart cancellation preserves exact world, keyboard focus and touch drag work", async ({
  page,
}) => {
  await observeModel(page);
  await page.goto(path);
  await action(page).click();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: "Restart run", exact: true }).click();
  const before = await page.evaluate(() => window.__neonSnapshot());
  await page.getByRole("button", { name: "Keep playing" }).click();
  expect(await page.evaluate(() => window.__neonSnapshot())).toEqual(before);
  await expect(page.locator("#playfield")).toBeFocused();
  await page.keyboard.press("p");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(100);
  await page.keyboard.up("ArrowRight");
  expect(
    (await page.evaluate(() => window.__neonSnapshot())).paddle.x,
  ).toBeGreaterThan(before.paddle.x);
  await page.getByRole("button", { name: "Restart run", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(state(page)).toHaveAttribute("data-state", "paused");
});
test("real browser touch events move the paddle and preserve scrolling outside the game", async ({
  page,
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: page.viewportSize(),
    hasTouch: true,
    isMobile: true,
  });
  const touchPage = await context.newPage();
  await observeModel(touchPage);
  await touchPage.goto(path);
  await action(touchPage).tap();
  const client = await context.newCDPSession(touchPage);
  const box = await touchPage.locator("#touch-strip").boundingBox();
  const canvasWidth = (await touchPage.locator("canvas").boundingBox()).width;
  const before = (await touchPage.evaluate(() => window.__neonSnapshot()))
    .paddle.x;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + 22 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width / 2 + 45, y: box.y + 22 }],
  });
  // Finish the drag at rest. Immediate CDP move/up followed by rotation
  // can suppress the next native click, even in a plain HTML-only fixture.
  // This is a complete touch gesture, with no click dispatch or Resume retry.
  await touchPage.waitForTimeout(200);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    (await touchPage.evaluate(() => window.__neonSnapshot())).paddle.x,
  ).toBeGreaterThan(before + (45 / canvasWidth) * 960 * 0.95);
  expect(
    await touchPage
      .locator("#how-to-play")
      .evaluate((e) => getComputedStyle(e).touchAction),
  ).toBe("auto");
  await touchPage.screenshot({ path: info.outputPath("touch-input.png") });
  const originalViewport = touchPage.viewportSize();
  await touchPage.setViewportSize({
    width: originalViewport.height,
    height: originalViewport.width,
  });
  await expect(state(touchPage)).toHaveAttribute("data-state", "paused");
  await action(touchPage).tap();
  await expect(state(touchPage)).toHaveAttribute("data-state", "playing");
  const rotatedField = await touchPage.locator("canvas").boundingBox();
  const rotatedControls = await touchPage
    .locator(".game-controls")
    .boundingBox();
  expect(rotatedField.y).toBeGreaterThanOrEqual(0);
  expect(rotatedField.y + rotatedField.height).toBeLessThanOrEqual(
    originalViewport.width,
  );
  expect(rotatedControls.y + rotatedControls.height).toBeLessThanOrEqual(
    originalViewport.width,
  );
  const rotatedStrip = await touchPage.locator("#touch-strip").boundingBox();
  const rotatedPaddle = (
    await touchPage.evaluate(() => window.__neonSnapshot())
  ).paddle.x;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: rotatedStrip.x + rotatedStrip.width / 2, y: rotatedStrip.y + 22 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      {
        x: rotatedStrip.x + rotatedStrip.width / 2 - 30,
        y: rotatedStrip.y + 22,
      },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    (await touchPage.evaluate(() => window.__neonSnapshot())).paddle.x,
  ).toBeLessThan(rotatedPaddle - (30 / rotatedField.width) * 960 * 0.95);
  await touchPage.screenshot({ path: info.outputPath("touch-rotated.png") });
  await context.close();
});
test("idle game avoids repeated canvas work and unchanged HUD mutations", async ({
  page,
}) => {
  await page.goto(path);
  await expect(state(page)).toHaveAttribute("data-state", "ready");
  // A late initial ResizeObserver callback legitimately redraws once in WebKit.
  // Measure idle work only after layout settles; repeated frame draws still fail.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let timer;
        const settle = () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            observer.disconnect();
            window.removeEventListener("resize", settle);
            resolve();
          }, 250);
        };
        const observer = new ResizeObserver(settle);
        observer.observe(document.querySelector("#playfield"));
        window.addEventListener("resize", settle);
        settle();
      }),
  );
  await page.evaluate(() => {
    window.__idleDraws = 0;
    window.__hudChanges = 0;
    const original = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      window.__idleDraws++;
      return original.apply(this, args);
    };
    new MutationObserver(
      (records) => (window.__hudChanges += records.length),
    ).observe(document.querySelector(".game-hud"), {
      childList: true,
      subtree: true,
    });
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__idleDraws)).toBe(0);
  expect(await page.evaluate(() => window.__hudChanges)).toBe(0);
});
test("width-only resize pauses even when the height-limited field width stays constant", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  await action(page).click();
  await page.setViewportSize({ width: 1500, height: 900 });
  await expect(state(page)).toHaveAttribute("data-state", "paused");
});
test("keyboard resume after rotation brings the complete playfield into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  await action(page).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(state(page)).toHaveAttribute("data-state", "paused");
  await page.locator("#playfield").focus();
  await page.keyboard.press("p");
  await expect(state(page)).toHaveAttribute("data-state", "playing");
  const box = await page.locator("canvas").boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(390);
});
test("landscape keeps the live game status available to assistive technology", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(path);
  await expect(page.getByRole("status")).toHaveCount(1);
  expect(
    await page.locator("#game-status").evaluate((e) => {
      for (let n = e; n; n = n.parentElement) {
        if (
          getComputedStyle(n).display === "none" ||
          getComputedStyle(n).visibility === "hidden"
        )
          return false;
      }
      return true;
    }),
  ).toBe(true);
});
