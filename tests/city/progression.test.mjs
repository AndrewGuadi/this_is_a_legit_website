import { createFuture } from "../../static/cmd-city/future.mjs";
import { reconcileHouseholds } from "../../static/cmd-city/households.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  applyAction,
  measure,
  advanceMonth,
  inspectTile,
} from "../../static/cmd-city/core.mjs";
import { serializeCity, parseCity } from "../../static/cmd-city/save.mjs";
import {
  createRegion,
  parseRegion,
  serializeRegion,
  advanceRegion,
} from "../../static/cmd-city/region.mjs";
import { TOOLS } from "../../static/cmd-city/content.mjs";
const index = (x, y) => y * 40 + x;
function place(s, type, x, y, extra = {}) {
  Object.assign(s.tiles[index(x, y)], {
    type,
    terrain: "land",
    occupancy: 0,
    ...extra,
  });
}
function flat() {
  const s = createCity({ starter: false, sandbox: true, seed: 19 });
  for (const t of s.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
    });
  for (let x = 0; x < 22; x++) place(s, "road", x, 16);
  place(s, "wind", 1, 15);
  place(s, "water", 2, 15);
  place(s, "sewage", 3, 15);
  place(s, "landfill", 4, 15);
  s.cash = 100000000;
  return s;
}
function build(s, tool, x, y) {
  const r = applyAction(s, { type: "build", tool, x, y });
  assert.equal(r.ok, true, r.message);
}
function legacy(s) {
  const v = structuredClone(s);
  v.version = 1;
  delete v.environment;
  delete v.civic;
  delete v.households;
  delete v.services;
  delete v.future;
  for (const t of v.tiles)
    if (["townHall", "waterFilter", "cleanup", "nuclear"].includes(t.type))
      Object.assign(t, { type: "empty", occupancy: 0 });
  return v;
}
function reject(s, a) {
  const b = structuredClone(s);
  assert.equal(applyAction(s, a).ok, false);
  assert.deepEqual(s, b);
}

test("schema4 cities have persistent environment, civic state and a connected prebuilt starter hall", () => {
  const s = createCity();
  assert.equal(s.version, 4);
  assert.equal(s.environment.air.length, 1280);
  assert.equal(s.environment.lastMonth, -1);
  assert.equal(s.civic.lastMonth, 0);
  assert.equal(s.tiles[index(13, 15)].type, "townHall");
  assert.equal(inspectTile(s, 13, 15).operating, true);
  assert.equal(measure(s).civic.government.townHallReady, true);
});
test("persistent environment is advanced before growth and reports never advance fields or civic progress", () => {
  const s = flat();
  place(s, "residential", 7, 15, { occupancy: 24 });
  place(s, "industrial", 8, 15, { occupancy: 18 });
  const before = structuredClone(s);
  for (let n = 0; n < 4; n++) measure(s);
  assert.deepEqual(s, before);
  advanceMonth(s);
  assert.equal(s.environment.lastMonth, s.month - 1);
  assert.equal(s.civic.lastMonth, s.month);
  assert.ok(s.environment.air.some((n) => n > 0));
  const after = structuredClone(s);
  for (let n = 0; n < 4; n++) inspectTile(s, 8, 15);
  assert.deepEqual(s, after);
});
test("environmental actions route through core and invalid actions preserve cash RNG and fields", () => {
  const s = flat();
  assert.equal(
    applyAction(s, {
      type: "environment",
      action: { type: "wind", direction: "N" },
    }).ok,
    true,
  );
  assert.equal(s.environment.wind, "N");
  reject(s, {
    type: "environment",
    action: { type: "wind", direction: "constructor" },
  });
  reject(s, {
    type: "environment",
    action: { type: "radiation", x: 9, y: 15 },
  });
});
test("radiation persists through demolition and prevents new buildings and occupancy growth", () => {
  const s = flat();
  place(s, "nuclear", 8, 15);
  place(s, "residential", 9, 15, { occupancy: 0 });
  assert.equal(
    applyAction(s, {
      type: "environment",
      action: { type: "radiation", x: 8, y: 15 },
    }).ok,
    true,
  );
  assert.equal(s.tiles[index(8, 15)].type, "ruins");
  assert.ok(s.environment.radiation[index(8, 15)] >= 200);
  assert.equal(applyAction(s, { type: "bulldoze", x: 8, y: 15 }).ok, true);
  reject(s, { type: "build", tool: "residential", x: 8, y: 15 });
  build(s, "cleanup", 8, 15);
  advanceMonth(s);
  assert.equal(s.tiles[index(9, 15)].occupancy, 0);
  assert.ok(inspectTile(s, 9, 15).blockers.some((v) => /radiat/i.test(v)));
});
test("radiation disables existing facilities but leaves recovery roads and cleanup operational", () => {
  const s = flat();
  place(s, "industrial", 8, 15, { occupancy: 18 });
  place(s, "residential", 7, 15, { occupancy: 24 });
  const a = measure(s);
  s.environment.radiation[index(8, 15)] = 600;
  const b = measure(s);
  assert.equal(b.jobFill[index(8, 15)], 0);
  assert.ok(b.jobs < a.jobs);
  assert.equal(inspectTile(s, 8, 15).operating, false);
  assert.equal(applyAction(s, { type: "bulldoze", x: 8, y: 15 }).ok, true);
  build(s, "road", 8, 15);
  assert.equal(measure(s).access[index(8, 15)], true);
});
test("filter and cleanup provide actual eight-slot jobs, require workers and charge their stated upkeep", () => {
  const s = flat();
  build(s, "waterFilter", 7, 15);
  build(s, "cleanup", 8, 15);
  const empty = measure(s);
  assert.equal(empty.jobFill[index(7, 15)], 0);
  // Include workers for the upstream landfill's new real eight-slot service job.
  place(s, "residential", 9, 15, { occupancy: 40, level: 2 });
  const m = measure(s);
  assert.equal(
    m.jobs,
    TOOLS.waterFilter.jobs + TOOLS.cleanup.jobs + TOOLS.landfill.jobs,
  );
  assert.ok(m.jobFill[index(7, 15)] > 0);
  assert.ok(m.jobFill[index(8, 15)] > 0);
  assert.ok(m.environment.waterFilterCapacity > 0);
  assert.ok(TOOLS.waterFilter.upkeep > 0 && TOOLS.cleanup.upkeep > 0);
  s.environment.ground[index(8, 15)] = 900;
  advanceMonth(s);
  assert.ok(s.environment.ground[index(8, 15)] < 898);
  assert.ok(
    s.history.at(-1).upkeep >= TOOLS.cleanup.upkeep + TOOLS.waterFilter.upkeep,
  );
});
test("nuclear supply scales modules and shares finite ore globally without exposing fuel in utility display", () => {
  const s = flat();
  s.tiles[index(1, 15)].type = "empty";
  place(s, "nuclear", 7, 15);
  place(s, "nuclear", 8, 15, { modules: 2 });
  s.inventory.ore = 2;
  let m = measure(s);
  assert.equal(m.nuclearFuelUsed, 2);
  assert.equal(m.utilities.power.supply, 3600);
  assert.equal(Object.hasOwn(m.utilities, "nuclearFuelUsed"), false);
  advanceMonth(s);
  assert.equal(s.inventory.ore, 0);
  assert.equal(measure(s).utilities.power.supply, 0);
});
test("nuclear fuel is reserved before a lower-index factory can consume the same ore", () => {
  const s = flat();
  s.tiles[index(1, 15)].type = "empty";
  place(s, "factory", 5, 15);
  place(s, "nuclear", 12, 15);
  place(s, "residential", 6, 15, { occupancy: 24 });
  s.inventory.ore = 3;
  s.inventory.oil = 20;
  assert.ok(measure(s).jobFill[index(5, 15)] > 0);
  advanceMonth(s);
  assert.equal(s.inventory.ore, 1);
  assert.equal(s.inventory.alloy, 0);
  assert.equal(s.inventory.electronics, 0);
  assert.ok(s.history.at(-1).income > 0);
});
test("persistent contaminated delivery harms health and a staffed filter reduces it without creating water", () => {
  const s = flat();
  place(s, "residential", 7, 15, { occupancy: 24 });
  s.environment.ground[index(2, 15)] = 900;
  const a = measure(s);
  assert.ok(a.environment.deliveredWaterContamination > 0);
  build(s, "waterFilter", 8, 15);
  const b = measure(s);
  assert.ok(
    b.environment.deliveredWaterContamination <
      a.environment.deliveredWaterContamination,
  );
  assert.ok(b.health > a.health);
  assert.equal(b.utilities.water.supply, a.utilities.water.supply);
});
test("town hall site and supply rules reject atomically and civic actions receive authoritative metrics", () => {
  const s = flat();
  s.sandbox = false;
  s.civic.eligible = true;
  reject(s, { type: "build", tool: "townHall", x: 35, y: 4 });
  build(s, "townHall", 5, 15);
  const before = s.cash;
  assert.equal(
    applyAction(s, { type: "department", department: "utilities" }).ok,
    true,
  );
  assert.equal(before - s.cash, 200000);
  reject(s, { type: "department", department: "utilities" });
  build(s, "waterFilter", 8, 15);
  reject(s, { type: "build", tool: "academy", x: 9, y: 15 });
});
test("new advanced permits never deactivate actual migrated advanced buildings", () => {
  const s = flat();
  s.sandbox = false;
  s.civic.eligible = true;
  place(s, "academy", 8, 15);
  place(s, "residential", 7, 15, { occupancy: 24 });
  const legacyCity = legacy(s),
    a = parseCity(JSON.stringify(legacyCity));
  assert.equal(a.tiles[index(8, 15)].type, "academy");
  assert.ok(measure(a).jobFill[index(8, 15)] > 0);
  reject(a, { type: "build", tool: "academy", x: 9, y: 15 });
});
test("request completion occurs after ledger and explicit claims pay exactly once without rewriting history", () => {
  const s = createCity();
  assert.equal(
    applyAction(s, { type: "request", id: "housing", operation: "accept" }).ok,
    true,
  );
  for (const t of s.tiles)
    if (t.type === "residential") {
      t.level = 3;
      t.occupancy = 50;
    }
  const cash = s.cash;
  advanceMonth(s);
  assert.equal(s.cash - cash, s.history.at(-1).net);
  assert.equal(s.civic.requests.housing.status, "completed");
  const h = structuredClone(s.history),
    b = s.cash;
  assert.equal(
    applyAction(s, { type: "request", id: "housing", operation: "claim" }).ok,
    true,
  );
  assert.equal(s.cash - b, 75000);
  assert.deepEqual(s.history, h);
  reject(s, { type: "request", id: "housing", operation: "claim" });
});
test("bond redemption pays actual outstanding obligation once and respects funds and index boundaries", () => {
  const s = flat();
  s.civic.peakPopulation = 500;
  s.civic.tier = 2;
  s.civic.departments = ["finance"];
  place(s, "townHall", 5, 15);
  applyAction(s, { type: "bond" });
  const balance = s.bonds[0].balance,
    cash = s.cash;
  assert.equal(applyAction(s, { type: "redeemBond", index: 0 }).ok, true);
  assert.equal(s.cash, cash - balance);
  assert.equal(s.bonds.length, 0);
  reject(s, { type: "redeemBond", index: 0 });
  applyAction(s, { type: "bond" });
  s.cash = 0;
  reject(s, { type: "redeemBond", index: 0 });
});
test("schema4 round trip preserves environment, civic progress and exact deterministic future", () => {
  const s = createCity();
  advanceMonth(s);
  const restored = parseCity(serializeCity(s));
  assert.equal(restored.version, 4);
  assert.deepEqual(restored, s);
  advanceMonth(s);
  advanceMonth(restored);
  assert.deepEqual(restored, s);
});
test("strict legacy migration preserves inventories cash RNG all tiles history and does not fabricate past progress", () => {
  const s = createCity();
  advanceMonth(s);
  const old = legacy(s),
    a = parseCity(JSON.stringify(old));
  assert.equal(a.version, 4);
  assert.deepEqual(a.inventory, old.inventory);
  assert.deepEqual(a.tiles, old.tiles);
  assert.deepEqual(a.history, old.history);
  assert.equal(a.cash, old.cash);
  assert.equal(a.rng, old.rng);
  assert.equal(a.environment.lastMonth, old.month - 1);
  assert.equal(a.civic.lastMonth, old.month);
  assert.deepEqual(a.civic.achievements, []);
});
test("schema validation rejects partial migration tampering future processed months and malformed nested fields", () => {
  const s = createCity();
  const changes = [
    (a) => delete a.environment,
    (a) => delete a.civic,
    (a) => a.environment.air.pop(),
    (a) => (a.environment.radiation[1] = -1),
    (a) => (a.environment.lastMonth = a.month + 1),
    (a) => (a.civic.lastMonth = a.month + 1),
    (a) => (a.civic.requests.housing.status = "claimed"),
    (a) => (a.civic.extra = true),
    (a) => {
      a.version = 1;
      delete a.civic;
    },
    (a) => {
      a.version = 1;
      delete a.environment;
    },
  ];
  for (const change of changes) {
    const a = structuredClone(s);
    change(a);
    assert.throws(() => parseCity(JSON.stringify(a)));
  }
  const v1 = legacy(s);
  v1.tiles[4].type = "nuclear";
  assert.throws(() => parseCity(JSON.stringify(v1)));
});
test("legacy region wrapper remains version1 while all three cities migrate independently and conserve regional stock", () => {
  const r = createRegion();
  advanceRegion(r);
  for (const c of r.cities) c.state = legacy(c.state);
  const b = structuredClone(r),
    a = parseRegion(JSON.stringify(r));
  assert.equal(a.version, 1);
  for (let n = 0; n < 3; n++) {
    assert.equal(a.cities[n].state.version, 4);
    assert.deepEqual(a.cities[n].state.inventory, b.cities[n].state.inventory);
    assert.equal(a.cities[n].state.rng, b.cities[n].state.rng);
    assert.equal(a.cities[n].state.cash, b.cities[n].state.cash);
  }
  assert.deepEqual(parseRegion(serializeRegion(a)), a);
});
test("early bond redemption cannot bypass Finance department and operating Town Hall", () => {
  const s = flat();
  applyAction(s, { type: "bond" });
  reject(s, { type: "redeemBond", index: 0 });
  s.civic.peakPopulation = 500;
  s.civic.tier = 2;
  s.civic.departments = ["finance"];
  place(s, "townHall", 5, 15);
  s.tiles[index(5, 15)].enabled = false;
  reject(s, { type: "redeemBond", index: 0 });
});
test("core lookup identifiers require strings and reject array or object coercion without mutation", () => {
  const s = flat();
  s.research.points = 1000;
  place(s, "academy", 7, 15);
  for (const a of [
    { type: "build", tool: ["road"], x: 8, y: 15 },
    { type: "research", topic: ["cleanEnergy"] },
    { type: "funding", service: ["school"], value: 0 },
    { type: "policy", name: ["recycling"], value: true },
    {
      type: "build",
      tool: {
        toString() {
          return "road";
        },
      },
      x: 8,
      y: 15,
    },
  ])
    reject(s, a);
});
test("save research catalog entries reject nonstring coercion before migration", () => {
  const s = createCity();
  s.research.completed = [["cleanEnergy"]];
  assert.throws(() => parseCity(JSON.stringify(s)));
  const old = legacy(s);
  assert.throws(() => parseCity(JSON.stringify(old)));
});
test("within-month environmental forecasts cannot reserve already deducted nuclear fuel twice", () => {
  const s = flat();
  place(s, "factory", 5, 15);
  place(s, "nuclear", 12, 15);
  place(s, "residential", 6, 15, { occupancy: 24 });
  s.inventory.ore = 5;
  s.inventory.oil = 20;
  const opening = measure(s);
  assert.ok(opening.environment.sources.some((v) => v.type === "factory"));
  s.inventory.ore -= opening.nuclearFuelUsed;
  const reserved = measure(s, {
    reservedFuel: {
      fuelUsed: opening.fuelUsed,
      nuclearFuelUsed: opening.nuclearFuelUsed,
    },
  });
  assert.equal(
    reserved.environment.sources.find((v) => v.type === "factory")?.air,
    opening.environment.sources.find((v) => v.type === "factory").air,
  );
});

test("completed schema4 saves reject stale subsystem processing markers", () => {
  const s = createCity();
  advanceMonth(s);
  for (const subsystem of ["environment", "civic"]) {
    const stale = structuredClone(s);
    stale[subsystem].lastMonth--;
    assert.throws(() => parseCity(JSON.stringify(stale)));
  }
});

test("imports cannot exceed the aggregate supported population even when every tower fits its own capacity", () => {
  const s = createCity({ starter: false });
  s.research.completed = ["cleanEnergy", "vertical"];
  for (const tile of s.tiles)
    Object.assign(tile, {
      terrain: "land",
      type: "tower",
      level: 3,
      occupancy: 1080,
    });
  Object.assign(s.tiles[640], { type: "road", occupancy: 0 });
  assert.throws(() => parseCity(JSON.stringify(s)));
});

test("a near-limit accepted population remains supported after a simulated month", () => {
  const s = createCity({ starter: false });
  s.research.completed = ["cleanEnergy", "vertical"];
  let remaining = 1000000;
  for (let i = 0; i < s.tiles.length && remaining; i++) {
    if (i === 640) continue;
    const occupied = Math.min(1080, remaining);
    Object.assign(s.tiles[i], {
      terrain: "land",
      type: "tower",
      level: 3,
      occupancy: occupied,
    });
    remaining -= occupied;
  }
  reconcileHouseholds(s);
  s.future = createFuture(s);
  const restored = parseCity(serializeCity(s));
  advanceMonth(restored);
  assert.ok(measure(restored).population <= 1000000);
  assert.doesNotThrow(() => serializeCity(restored));
});

test("mutating a caller-owned routing report cannot poison later measurements", () => {
  const s = createCity();
  const expected = measure(structuredClone(s));
  const report = measure(s);
  for (const key of [
    "jobFill",
    "homeEmployment",
    "commuterRoadLoad",
    "roadLoad",
    "busLoad",
    "railLoad",
  ])
    report[key].fill(999999);
  const next = measure(s);
  for (const key of [
    "jobFill",
    "homeEmployment",
    "commuterRoadLoad",
    "roadLoad",
    "busLoad",
    "railLoad",
  ])
    assert.deepEqual(next[key], expected[key]);
});

test("routing results stay identical to fresh computation across eligibility and network changes", () => {
  const baseline = flat();
  place(baseline, "nuclear", 1, 15);
  baseline.inventory.ore = 4;
  place(baseline, "residential", 7, 15, { occupancy: 24 });
  place(baseline, "industrial", 16, 15, { occupancy: 18 });
  place(baseline, "bus", 7, 17);
  place(baseline, "bus", 16, 17);
  const changes = [
    (s) => {
      s.research.completed = ["cleanEnergy", "transit"];
    },
    (s) => {
      applyAction(s, { type: "upgrade", x: 7, y: 17 });
    },
    (s) => {
      applyAction(s, { type: "upgrade", x: 12, y: 16 });
    },
    (s) => {
      applyAction(s, { type: "toggle", x: 7, y: 17 });
    },
    (s) => {
      applyAction(s, { type: "funding", service: "school", value: 150 });
    },
    (s) => {
      applyAction(s, { type: "bulldoze", x: 12, y: 16 });
    },
    (s) => {
      s.tiles[index(7, 15)].occupancy = 10;
    },
    (s) => {
      s.tiles[index(16, 15)].occupancy = 5;
    },
    (s) => {
      s.environment.radiation[index(16, 15)] = 500;
    },
    (s) => {
      s.tiles[index(16, 15)].enabled = false;
    },
    (s) => {
      s.tiles[index(16, 15)].fire = 1;
    },
    (s) => {
      s.inventory.ore = 0;
    },
  ];
  for (const change of changes) {
    const s = structuredClone(baseline);
    measure(s);
    change(s);
    const cached = measure(s),
      fresh = measure(structuredClone(s));
    for (const key of [
      "population",
      "workers",
      "jobs",
      "employed",
      "jobFill",
      "roadLoad",
      "busPassengers",
      "railPassengers",
      "busLoad",
      "railLoad",
    ])
      assert.deepEqual(cached[key], fresh[key]);
  }
});

test("construction definitions cannot be mutated after the simulation content is loaded", () => {
  const original = TOOLS.road.capacity;
  try {
    try {
      TOOLS.road.capacity = original + 1000;
    } catch {}
    assert.equal(TOOLS.road.capacity, original);
  } finally {
    try {
      TOOLS.road.capacity = original;
    } catch {}
  }
});
