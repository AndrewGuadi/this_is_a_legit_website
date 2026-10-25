import test from "node:test";
import assert from "node:assert/strict";
import {
  createEnvironment,
  validateEnvironment,
  environmentReport,
  advanceEnvironment,
  environmentAction,
} from "../../static/cmd-city/environment.mjs";
const W = 12,
  H = 10,
  N = W * H,
  at = (x, y) => y * W + x;
function fixture() {
  const city = {
    width: W,
    height: H,
    month: 0,
    cash: 500000,
    groundwater: 100000,
    inventory: { ore: 20 },
    environment: createEnvironment(W, H),
    tiles: Array.from({ length: N }, () => ({
      type: "empty",
      occupancy: 0,
      modules: 0,
      enabled: true,
      fire: 0,
      stored: 0,
    })),
  };
  const metrics = {
    access: Array(N).fill(true),
    jobFill: Array(N).fill(0),
    fuelUsed: 0,
    utilities: Object.fromEntries(
      ["power", "water", "sewage", "waste"].map((k) => [
        k,
        { supply: 2000, demand: 1000, ratio: 1 },
      ]),
    ),
  };
  return { city, metrics };
}
function place(city, type, x, y, fields = {}) {
  Object.assign(city.tiles[at(x, y)], { type, ...fields });
  return at(x, y);
}

test("new environment uses independent bounded arrays and strict dimensions", () => {
  const a = createEnvironment(W, H),
    b = createEnvironment(W, H);
  a.air[0] = 55;
  assert.equal(a.ground[0], 0);
  assert.equal(b.air[0], 0);
  assert.equal(a.air.length, N);
  assert.equal(a.wind, "E");
  assert.equal(a.lastMonth, -1);
  for (const dims of [
    [0, H],
    [-1, H],
    [2.5, H],
    [Infinity, H],
    [100000, 100000],
  ])
    assert.throws(() => createEnvironment(...dims));
});
test("validator rejects malformed arrays, values, keys, wind and future months without mutation", () => {
  const env = createEnvironment(W, H);
  for (const change of [
    (e) => (e.air = []),
    (e) => (e.air[0] = -1),
    (e) => (e.ground[0] = 1001),
    (e) => (e.radiation[0] = 0.5),
    (e) => (e.wind = "__proto__"),
    (e) => (e.lastMonth = 2),
    (e) => (e.extra = true),
    (e) => delete e.ground,
  ]) {
    const a = structuredClone(env);
    change(a);
    const before = structuredClone(a);
    assert.throws(() => validateEnvironment(a, W, H, 1));
    assert.deepEqual(a, before);
  }
  assert.equal(validateEnvironment(env, W, H, 0), true);
});
test("reports are pure and sources require real operation and filled jobs", () => {
  const { city, metrics } = fixture();
  const i = place(city, "industrial", 4, 4, { occupancy: 15 });
  const before = structuredClone(city);
  assert.equal(environmentReport(city, metrics).emissions.air, 0);
  metrics.jobFill[i] = 10;
  assert.ok(environmentReport(city, metrics).emissions.air > 0);
  assert.deepEqual(city, before);
  metrics.access[i] = false;
  assert.equal(environmentReport(city, metrics).emissions.air, 0);
  metrics.access[i] = true;
  metrics.utilities.power.ratio = 0;
  assert.equal(environmentReport(city, metrics).emissions.air, 0);
});
test("thermal pollution follows actual shared fuel rather than plant count alone", () => {
  const { city, metrics } = fixture();
  place(city, "coalPlant", 3, 3);
  place(city, "coalPlant", 8, 3);
  assert.equal(environmentReport(city, metrics).emissions.air, 0);
  metrics.fuelUsed = 20;
  const one = environmentReport(city, metrics).emissions.air;
  assert.ok(one > 0);
  metrics.fuelUsed = 40;
  assert.equal(environmentReport(city, metrics).emissions.air, one * 2);
});
test("wind performs directional advection with explicit bounded air accounting", () => {
  const { city, metrics } = fixture();
  city.environment.air[at(5, 5)] = 800;
  const before = structuredClone(city);
  const report = advanceEnvironment(city, metrics);
  assert.ok(city.environment.air[at(6, 5)] > 0);
  assert.equal(city.environment.air[at(4, 5)], 0);
  const balance = report.massBalance;
  assert.equal(
    balance.airBefore +
      balance.airEmitted -
      balance.airClipped -
      balance.airDecay -
      balance.airOutflow,
    balance.airAfter,
  );
  assert.ok(
    city.environment.air.every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 1000,
    ),
  );
  assert.equal(city.cash, before.cash);
  assert.deepEqual(city.inventory, before.inventory);
  assert.equal(city.groundwater, before.groundwater);
});
test("same-month calls cannot duplicate emissions, decay or cleanup", () => {
  const { city, metrics } = fixture();
  const i = place(city, "industrial", 4, 4, { occupancy: 18 });
  metrics.jobFill[i] = 12;
  advanceEnvironment(city, metrics);
  const before = structuredClone(city);
  assert.equal(advanceEnvironment(city, metrics).changed, false);
  assert.deepEqual(city, before);
  city.month++;
  assert.equal(advanceEnvironment(city, metrics).changed, true);
  assert.ok(city.environment.ground.some((v) => v > 0));
});
test("ground contamination persists after emitter removal and later decays slowly", () => {
  const { city, metrics } = fixture();
  const i = place(city, "industrial", 4, 4, { occupancy: 18 });
  metrics.jobFill[i] = 12;
  for (let n = 0; n < 5; n++) {
    city.month = n;
    advanceEnvironment(city, metrics);
  }
  const dirty = city.environment.ground[i];
  assert.ok(dirty > 0);
  city.tiles[i].type = "empty";
  city.month++;
  advanceEnvironment(city, metrics);
  assert.ok(city.environment.ground[i] > 0);
  assert.ok(city.environment.ground[i] < dirty);
});
test("water quality is weighted by operating pump throughput and actual delivery", () => {
  const { city, metrics } = fixture();
  place(city, "water", 3, 3);
  place(city, "water", 8, 3, { modules: 2 });
  for (let y = 1; y <= 5; y++)
    for (let x = 1; x <= 5; x++) city.environment.ground[at(x, y)] = 1000;
  const report = environmentReport(city, metrics);
  assert.ok(
    report.pumpWeightedRawContamination > 20 &&
      report.pumpWeightedRawContamination < 40,
  );
  assert.equal(
    report.deliveredWaterContamination,
    report.pumpWeightedRawContamination,
  );
  metrics.utilities.water.supply = 0;
  metrics.utilities.water.ratio = 0;
  const dry = environmentReport(city, metrics);
  assert.equal(dry.deliveredWater, 0);
  assert.equal(dry.deliveredWaterContamination, 0);
});
test("filter throughput cleans only the share it can actually process", () => {
  const { city, metrics } = fixture();
  place(city, "water", 3, 3);
  city.environment.ground.fill(1000);
  const f = place(city, "waterFilter", 6, 3);
  metrics.jobFill[f] = 8;
  const filtered = environmentReport(city, metrics);
  assert.equal(filtered.filteredWater, 500);
  assert.equal(filtered.waterFilterCapacity, 500);
  assert.ok(filtered.deliveredWaterContamination > 0);
  assert.ok(
    filtered.deliveredWaterContamination <
      filtered.pumpWeightedRawContamination,
  );
  metrics.jobFill[f] = 0;
  assert.equal(environmentReport(city, metrics).filteredWater, 0);
  metrics.jobFill[f] = 8;
  city.tiles[f].enabled = false;
  assert.equal(environmentReport(city, metrics).filteredWater, 0);
});
test("nuclear incident requires a real plant, persists and disables its source", () => {
  const { city, metrics } = fixture();
  const i = place(city, "nuclear", 5, 5);
  assert.equal(
    environmentAction(city, { type: "radiation", x: 5, y: 5 }).ok,
    true,
  );
  assert.equal(city.tiles[i].type, "ruins");
  assert.equal(city.tiles[i].enabled, false);
  assert.ok(city.environment.radiation[i] >= 900);
  assert.equal(environmentReport(city, metrics).restricted[i], true);
  const before = structuredClone(city);
  assert.equal(
    environmentAction(city, { type: "radiation", x: 5, y: 5 }).ok,
    false,
  );
  assert.deepEqual(city, before);
  advanceEnvironment(city, metrics);
  assert.ok(city.environment.radiation[i] > 0);
});
test("radiation exposure and contaminated water have tangible bounded health penalties", () => {
  const { city, metrics } = fixture();
  place(city, "residential", 5, 5, { occupancy: 24 });
  place(city, "water", 3, 3);
  city.environment.ground.fill(1000);
  city.environment.air[at(5, 5)] = 800;
  city.environment.radiation[at(5, 5)] = 600;
  const r = environmentReport(city, metrics);
  assert.ok(r.residentAirExposure > 0);
  assert.ok(r.residentRadiationExposure > 0);
  assert.ok(r.healthPenalty > 0 && r.healthPenalty <= 80);
  assert.ok(r.blockers[at(5, 5)].some((x) => /radiation/i.test(x)));
});
test("cleanup is local, staffed, supplied, finite and cannot repeat in the same month", () => {
  const { city, metrics } = fixture();
  city.environment.ground.fill(800);
  city.environment.radiation.fill(500);
  const c = place(city, "cleanup", 5, 5);
  metrics.jobFill[c] = 8;
  const beforeGround = city.environment.ground.reduce((a, b) => a + b, 0),
    beforeRad = city.environment.radiation.reduce((a, b) => a + b, 0);
  advanceEnvironment(city, metrics);
  const groundLoss =
      beforeGround - city.environment.ground.reduce((a, b) => a + b, 0),
    radLoss = beforeRad - city.environment.radiation.reduce((a, b) => a + b, 0);
  assert.ok(groundLoss > 2 * N && groundLoss <= 2 * N + 80);
  assert.ok(radLoss > N && radLoss <= N + 20);
  assert.equal(city.environment.ground[at(0, 0)], 798);
  const after = structuredClone(city);
  advanceEnvironment(city, metrics);
  assert.deepEqual(city, after);
});
test("unpowered, unstaffed or closed cleanup facility cannot perform remediation", () => {
  for (const field of ["power", "staff", "closed"]) {
    const { city, metrics } = fixture();
    city.environment.ground.fill(800);
    const c = place(city, "cleanup", 5, 5);
    metrics.jobFill[c] = 8;
    if (field === "power") metrics.utilities.power.ratio = 0;
    if (field === "staff") metrics.jobFill[c] = 0;
    if (field === "closed") city.tiles[c].enabled = false;
    advanceEnvironment(city, metrics);
    assert.ok(city.environment.ground.every((x) => x === 798));
  }
});
test("invalid environment actions preserve all fields including RNG-like and treasury data", () => {
  const { city } = fixture();
  city.rng = 123;
  for (const action of [
    { type: "constructor", x: 5, y: 5 },
    { type: "radiation", x: 1e99, y: 3 },
    { type: "radiation", x: 1.2, y: 3 },
    { type: "radiation", x: 3, y: 3 },
    { type: "wind", direction: "constructor" },
    { type: "wind", direction: "E", extra: true },
    null,
  ]) {
    const before = structuredClone(city);
    assert.equal(environmentAction(city, action).ok, false);
    assert.deepEqual(city, before);
  }
  assert.equal(
    environmentAction(city, { type: "wind", direction: "N" }).ok,
    true,
  );
  assert.equal(city.environment.wind, "N");
});
test("continued emissions and repeated incidents remain integer-bounded over long play", () => {
  const { city, metrics } = fixture();
  const i = place(city, "industrial", 5, 5, { occupancy: 180 });
  metrics.jobFill[i] = 120;
  for (let n = 0; n < 200; n++) {
    city.month = n;
    advanceEnvironment(city, metrics);
    assert.equal(validateEnvironment(city.environment, W, H, n), true);
  }
  assert.ok(city.environment.ground.some((x) => x > 0));
  assert.ok(city.environment.air.every((x) => x <= 1000));
});
test("emission forecast reserves shared factory inputs once without changing inventories", () => {
  const { city, metrics } = fixture();
  city.inventory = { ore: 15, oil: 10, alloy: 0, electronics: 0 };
  const a = place(city, "factory", 3, 3),
    b = place(city, "factory", 8, 3);
  metrics.jobFill[a] = 12;
  metrics.jobFill[b] = 12;
  const before = structuredClone(city);
  const report = environmentReport(city, metrics);
  assert.equal(report.emissions.air, 80);
  assert.equal(report.emissions.ground, 40);
  assert.deepEqual(city, before);
  const advanced = advanceEnvironment(city, metrics);
  assert.equal(advanced.massBalance.airEmitted, 80);
  assert.deepEqual(city.inventory, before.inventory);
});
test("emission forecast shares finite inventory headroom across mines", () => {
  const { city, metrics } = fixture();
  city.inventory.ore = 999995;
  const a = place(city, "mine", 3, 3, { resource: "ore", reserve: 100 }),
    b = place(city, "mine", 8, 3, { resource: "ore", reserve: 100 });
  metrics.jobFill[a] = 8;
  metrics.jobFill[b] = 8;
  const before = structuredClone(city);
  const report = environmentReport(city, metrics);
  assert.equal(report.emissions.air, 5);
  assert.equal(report.emissions.ground, 10);
  assert.deepEqual(city, before);
});
test("emission forecast reserves industrial goods headroom across all producing lots", () => {
  const { city, metrics } = fixture();
  city.inventory.goods = 999995;
  const a = place(city, "industrial", 3, 3, { occupancy: 18 }),
    b = place(city, "industrial", 8, 3, { occupancy: 18 });
  metrics.jobFill[a] = 10;
  metrics.jobFill[b] = 10;
  const before = structuredClone(city);
  const report = environmentReport(city, metrics);
  assert.equal(report.emissions.air, 20);
  assert.equal(report.emissions.ground, 10);
  assert.deepEqual(city, before);
});
test("nuclear ore reservation precedes the shared factory forecast", () => {
  const { city, metrics } = fixture();
  city.inventory = { ore: 15, oil: 10, alloy: 0, electronics: 0 };
  metrics.nuclearFuelUsed = 3;
  const a = place(city, "factory", 3, 3),
    b = place(city, "factory", 8, 3);
  metrics.jobFill[a] = 12;
  metrics.jobFill[b] = 12;
  assert.equal(environmentReport(city, metrics).emissions.air, 64);
  assert.equal(city.inventory.ore, 15);
});
test("production forecast follows tile order when factories free later extraction headroom", () => {
  const { city, metrics } = fixture();
  city.inventory = { ore: 999995, oil: 10, alloy: 0, electronics: 0 };
  const a = place(city, "factory", 3, 3),
    b = place(city, "mine", 8, 3, { resource: "ore", reserve: 100 });
  metrics.jobFill[a] = 12;
  metrics.jobFill[b] = 8;
  const before = structuredClone(city);
  const report = environmentReport(city, metrics);
  assert.equal(report.emissions.air, 100);
  assert.equal(report.emissions.ground, 80);
  assert.deepEqual(city, before);
});
