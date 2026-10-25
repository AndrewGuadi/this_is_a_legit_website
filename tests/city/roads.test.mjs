import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegion,
  serializeRegion,
} from "../../static/cmd-city/region.mjs";
import { planRoad, commitRoadPlan } from "../../static/cmd-city/roads.mjs";
import { createCity } from "../../static/cmd-city/core.mjs";
import { TOOLS } from "../../static/cmd-city/content.mjs";
function fixture() {
  const region = createRegion();
  const city = (region.cities[0].state = createCity({
    starter: false,
    sandbox: true,
  }));
  for (const t of city.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
      modules: 0,
      stored: 0,
    });
  city.tiles[640].type = "road";
  city.cash = 1e8;
  return region;
}
const config = (shape) => ({
  shape,
  roadType: "road",
  start: { x: 5, y: 5 },
  end: { x: 15, y: 15 },
  control: { x: 5, y: 15 },
});
function connected(plan, w = 40) {
  const set = new Set(plan.tiles.map((t) => t.y * w + t.x));
  const q = [set.values().next().value],
    seen = new Set(q);
  for (let c = 0; c < q.length; c++) {
    const n = q[c];
    for (const next of [n - 1, n + 1, n - w, n + w])
      if (
        set.has(next) &&
        !seen.has(next) &&
        Math.abs((n % w) - (next % w)) +
          Math.abs(Math.floor(n / w) - Math.floor(next / w)) ===
          1
      ) {
        seen.add(next);
        q.push(next);
      }
  }
  return seen.size === set.size;
}
for (const shape of ["straight", "curve", "circle", "block"])
  test(`${shape} plans a bounded connected grid road and commits exact cost without mutating source`, () => {
    const region = fixture(),
      before = serializeRegion(region),
      city = region.cities[0].state,
      opts = config(shape);
    if (shape === "circle") {
      opts.start = { x: 16, y: 16 };
      opts.end = { x: 24, y: 16 };
    }
    const plan = planRoad(city, opts);
    assert.equal(plan.ok, true, plan.message);
    assert.ok(plan.tiles.length > 10 && plan.tiles.length <= 256);
    assert.equal(connected(plan), true);
    assert.equal(
      new Set(plan.tiles.map((t) => `${t.x},${t.y}`)).size,
      plan.tiles.length,
    );
    assert.equal(plan.cost, plan.builds.length * TOOLS.road.cost);
    assert.equal(serializeRegion(region), before);
    const result = commitRoadPlan(region, opts);
    assert.equal(result.ok, true, result.message);
    assert.equal(result.region.cities[0].state.cash, city.cash - plan.cost);
    assert.equal(serializeRegion(region), before);
    for (const t of plan.tiles)
      assert.equal(
        result.region.cities[0].state.tiles[t.y * 40 + t.x].type,
        "road",
      );
  });
test("occupied buildings or insufficient funds reject complete plans without partial mutations", () => {
  for (const blocked of [true, false]) {
    const region = fixture(),
      city = region.cities[0].state;
    if (blocked) city.tiles[5 * 40 + 10].type = "park";
    else city.cash = 100;
    const before = serializeRegion(region);
    const result = commitRoadPlan(region, {
      ...config("straight"),
      end: { x: 15, y: 5 },
    });
    assert.equal(result.ok, false);
    assert.equal(serializeRegion(region), before);
  }
});
test("water crossings price and construct bridges while existing roads are preserved and free", () => {
  const region = fixture(),
    city = region.cities[0].state;
  city.tiles[5 * 40 + 8].terrain = "water";
  city.tiles[5 * 40 + 7].type = "avenue";
  const opts = { ...config("straight"), end: { x: 10, y: 5 } };
  const plan = planRoad(city, opts);
  assert.equal(plan.ok, true);
  assert.equal(plan.cost, 4 * TOOLS.road.cost + TOOLS.bridge.cost);
  const result = commitRoadPlan(region, opts);
  assert.equal(result.ok, true);
  assert.equal(result.region.cities[0].state.tiles[5 * 40 + 8].type, "bridge");
  assert.equal(result.region.cities[0].state.tiles[5 * 40 + 7].type, "avenue");
});
test("invalid geometry, out-of-map circles and unsupported road types reject without mutation", () => {
  const region = fixture(),
    city = region.cities[0].state;
  for (const change of [
    { shape: "random" },
    { roadType: "park" },
    { end: { x: NaN, y: 5 } },
    { start: { x: -1, y: 5 } },
    { shape: "circle", start: { x: 1, y: 1 }, end: { x: 20, y: 1 } },
    { shape: "curve", control: { x: 100, y: 3 } },
  ])
    assert.equal(
      planRoad(city, { ...config("straight"), ...change }).ok,
      false,
    );
});
test("a stale preview is revalidated against current funds and occupied tiles at commit", () => {
  const region = fixture(),
    city = region.cities[0].state,
    opts = { ...config("straight"), end: { x: 15, y: 5 } };
  assert.equal(planRoad(city, opts).ok, true);
  city.tiles[5 * 40 + 10].type = "park";
  const before = serializeRegion(region);
  assert.equal(commitRoadPlan(region, opts).ok, false);
  assert.equal(serializeRegion(region), before);
});
test("invalid regional identity rejects the complete plan without mutating any source fields", () => {
  const region = fixture(),
    city = region.cities[0].state,
    opts = {
      ...config("straight"),
      start: { x: 3, y: 16 },
      end: { x: 8, y: 16 },
    };
  city.cash = 1e12; // valid treasury boundary
  // A bridge on valid water receives the same normal guarded build checks.
  city.tiles[16 * 40 + 7].terrain = "water";
  const before = serializeRegion(region),
    plan = planRoad(city, opts);
  assert.equal(plan.ok, true);
  // Inject an unsupported region identity to force region validation before mutation.
  region.cities[1].id = "invalid";
  const invalid = JSON.stringify(region);
  assert.equal(commitRoadPlan(region, opts).ok, false);
  assert.equal(JSON.stringify(region), invalid);
  region.cities[1].id = "pinehaven";
  assert.equal(serializeRegion(region), before);
});
test("responsive road commits yield to the UI, preserve source state and match synchronous construction", async () => {
  const { commitRoadPlanAsync } =
    await import("../../static/cmd-city/roads.mjs");
  const region = fixture(),
    opts = { ...config("straight"), end: { x: 15, y: 5 } },
    before = serializeRegion(region);
  let yields = 0;
  const result = await commitRoadPlanAsync(region, opts, {
    yieldControl: async () => {
      yields++;
      assert.equal(serializeRegion(region), before);
    },
  });
  assert.equal(result.ok, true);
  assert.ok(yields >= 10);
  assert.deepEqual(result.region, commitRoadPlan(region, opts).region);
  assert.equal(serializeRegion(region), before);
});
test("canceling a responsive plan after candidate construction discards every candidate change", async () => {
  const { commitRoadPlanAsync } =
    await import("../../static/cmd-city/roads.mjs");
  const region = fixture(),
    before = serializeRegion(region);
  let yields = 0;
  const result = await commitRoadPlanAsync(
    region,
    { ...config("straight"), end: { x: 15, y: 5 } },
    {
      yieldControl: async () => {
        yields++;
      },
      isCanceled: () => yields >= 3,
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /canceled/i);
  assert.equal(serializeRegion(region), before);
  assert.equal(yields, 3);
});
test("responsive commit refuses a concurrent nested change in the same source region object", async () => {
  const { commitRoadPlanAsync } =
    await import("../../static/cmd-city/roads.mjs");
  const region = fixture(),
    city = region.cities[0].state;
  let once = false;
  const result = await commitRoadPlanAsync(
    region,
    { ...config("straight"), end: { x: 15, y: 5 } },
    {
      yieldControl: async () => {
        if (!once) {
          city.cash -= 100;
          once = true;
        }
      },
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /changed/i);
  assert.equal(city.cash, 1e8 - 100);
  assert.equal(city.tiles[5 * 40 + 5].type, "empty");
});
