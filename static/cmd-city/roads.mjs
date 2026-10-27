/** Original grid road geometry. Plans are previews; guarded commits are atomic copies. */
import { TOOLS } from "./content.mjs";
import { parseRegion, serializeRegion, regionCityAction } from "./region.mjs";
const LIMIT = 256;
const ROAD = new Set(["road", "avenue", "bridge"]);
const fail = (message, tiles = []) => ({
  ok: false,
  message,
  tiles,
  builds: [],
  cost: 0,
});
const point = (p, w, h) =>
  p &&
  Number.isInteger(p.x) &&
  Number.isInteger(p.y) &&
  p.x >= 0 &&
  p.x < w &&
  p.y >= 0 &&
  p.y < h;
export function planRoad(city, config) {
  const { width: w, height: h, tiles: world } = city || {};
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    !Array.isArray(world) ||
    world.length !== w * h ||
    !config
  )
    return fail("Choose a valid city and road plan.");
  const { shape, start, end, control, roadType } = config;
  if (
    !["straight", "curve", "circle", "block"].includes(shape) ||
    !["road", "avenue"].includes(roadType) ||
    !point(start, w, h) ||
    !point(end, w, h) ||
    (shape === "curve" && !point(control, w, h))
  )
    return fail("Choose valid grid coordinates, shape and road class.");
  const samples = [];
  const line = (a, b) => {
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 4 || 1;
    for (let n = 0; n <= steps; n++)
      samples.push({
        x: Math.round(a.x + ((b.x - a.x) * n) / steps),
        y: Math.round(a.y + ((b.y - a.y) * n) / steps),
      });
  };
  if (shape === "straight") line(start, end);
  if (shape === "block") {
    if (start.x === end.x || start.y === end.y)
      return fail("A block needs two different columns and rows.");
    const a = { x: end.x, y: start.y },
      b = { x: start.x, y: end.y };
    line(start, a);
    line(a, end);
    line(end, b);
    line(b, start);
  }
  if (shape === "curve")
    for (let n = 0; n <= 512; n++) {
      const t = n / 512,
        u = 1 - t;
      samples.push({
        x: Math.round(u * u * start.x + 2 * u * t * control.x + t * t * end.x),
        y: Math.round(u * u * start.y + 2 * u * t * control.y + t * t * end.y),
      });
    }
  if (shape === "circle") {
    const radius = Math.hypot(end.x - start.x, end.y - start.y);
    if (radius < 1) return fail("A circle needs a nonzero radius.");
    if (
      start.x - radius < 0 ||
      start.y - radius < 0 ||
      start.x + radius > w - 1 ||
      start.y + radius > h - 1
    )
      return fail("The entire circle must fit inside the map.");
    const steps = Math.ceil(2 * Math.PI * radius * 8);
    for (let n = 0; n <= steps; n++) {
      const a = (n / steps) * 2 * Math.PI;
      samples.push({
        x: Math.round(start.x + radius * Math.cos(a)),
        y: Math.round(start.y + radius * Math.sin(a)),
      });
    }
  }
  const cells = [],
    seen = new Set();
  let previous = null;
  const add = (p) => {
    const key = p.y * w + p.x;
    if (!seen.has(key)) {
      seen.add(key);
      cells.push({ ...p });
    }
  };
  for (const p of samples) {
    if (!point(p, w, h)) return fail("Road geometry leaves the map.", cells);
    if (previous) {
      let { x, y } = previous;
      while (x !== p.x) {
        x += Math.sign(p.x - x);
        add({ x, y });
      }
      while (y !== p.y) {
        y += Math.sign(p.y - y);
        add({ x, y });
      }
    }
    add(p);
    previous = p;
    if (cells.length > LIMIT)
      return fail(
        `A road plan may contain at most ${LIMIT} grid tiles.`,
        cells.slice(0, LIMIT),
      );
  }
  const builds = [];
  let cost = 0;
  for (const p of cells) {
    const t = world[p.y * w + p.x];
    if (ROAD.has(t.type)) continue;
    if (t.type !== "empty")
      return fail(
        `Occupied tile at ${p.x}, ${p.y}. Move the plan or decommission it first.`,
        cells,
      );
    const tool = t.terrain === "water" ? "bridge" : roadType;
    builds.push({ ...p, tool });
    cost += TOOLS[tool].cost;
  }
  if (!builds.length)
    return fail("This plan contains only existing roads.", cells);
  if (!Number.isSafeInteger(city.cash) || city.cash < cost)
    return fail(`Insufficient treasury: this plan costs ${cost / 100}.`, cells);
  return {
    ok: true,
    message: `${builds.length} new tiles ready. Existing roads stay in place.`,
    tiles: cells,
    builds,
    cost,
  };
}
function* commitSteps(region, config) {
  const city = region?.cities?.[region.active]?.state;
  const plan = planRoad(city, config);
  if (!plan.ok) return plan;
  try {
    const candidate = parseRegion(serializeRegion(region));
    let completed = 0;
    for (const tile of plan.builds) {
      const result = regionCityAction(candidate, { type: "build", ...tile });
      if (!result.ok)
        return fail(`Road plan rejected: ${result.message}`, plan.tiles);
      yield { completed: ++completed, total: plan.builds.length };
    }
    serializeRegion(candidate);
    return {
      ok: true,
      region: candidate,
      cost: plan.cost,
      count: plan.builds.length,
      message: `Built ${plan.builds.length} road tiles for ${plan.cost / 100}.`,
    };
  } catch (error) {
    return fail(
      `Road plan could not be committed: ${error.message}`,
      plan.tiles,
    );
  }
}
export function commitRoadPlan(region, config) {
  const steps = commitSteps(region, config);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
export async function commitRoadPlanAsync(
  region,
  config,
  {
    yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0)),
    isCanceled = () => false,
    onProgress = () => {},
  } = {},
) {
  const steps = commitSteps(region, config);
  try {
    const original = serializeRegion(region);
    for (;;) {
      if (isCanceled())
        return fail("Road plan canceled. No construction was charged.");
      const step = steps.next();
      if (step.done) {
        if (serializeRegion(region) !== original)
          return fail(
            "The city changed while the road plan was preparing. Preview it again.",
          );
        return step.value;
      }
      onProgress(step.value);
      await yieldControl(step.value);
    }
  } catch (error) {
    return fail(`Road plan could not be committed: ${error.message}`);
  } finally {
    steps.return();
  }
}
