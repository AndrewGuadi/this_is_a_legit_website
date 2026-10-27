import test from "node:test";
import assert from "node:assert/strict";
import {
  createFuture,
  validateFuture,
  futureTowerCapacity,
  futureReport,
  futureAction,
  advanceFuture,
  syncFuture,
  canResearchFuture,
} from "../../static/cmd-city/future.mjs";
function fixture() {
  const city = {
    width: 8,
    height: 4,
    month: 0,
    cash: 10_000_000,
    groundwater: 1_000_000,
    inventory: { oil: 100, ore: 100 },
    research: { completed: ["cleanEnergy", "vertical"] },
    tiles: Array.from({ length: 32 }, () => ({
      type: "empty",
      level: 1,
      occupancy: 0,
      enabled: true,
      fire: 0,
      modules: 0,
    })),
    households: { homes: Array(32).fill(null) },
  };
  Object.assign(city.tiles[1], { type: "tower", occupancy: 180 });
  Object.assign(city.tiles[2], { type: "academy" });
  Object.assign(city.tiles[3], { type: "consortium" });
  Object.assign(city.tiles[4], { type: "commercial", occupancy: 12 });
  city.households.homes[1] = {
    wealth: 2,
    educated: 20,
    employed: 40,
    adults: 100,
  };
  city.future = createFuture(city);
  return city;
}
function metrics(city) {
  return {
    access: Array(32).fill(true),
    operationAccess: Array(32).fill(true),
    jobFill: Array(32).fill(80),
    homeEmployment: Array(32).fill(80),
    utilities: { power: { ratio: 1 }, water: { ratio: 1 } },
  };
}
test("migration retains canonical tower population and legacy capacity with complete strict state", () => {
  const c = fixture();
  validateFuture(c.future, c);
  assert.equal(futureTowerCapacity(c, 1), 180);
  assert.equal(c.tiles[1].occupancy, 180);
  c.tiles[1].level = 3;
  c.tiles[1].occupancy = 1080;
  c.future = createFuture(c);
  assert.equal(c.future.towers[0].floors.length, 12);
  assert.equal(futureTowerCapacity(c, 1), 1080);
  validateFuture(c.future, c);
});
test("floor actions charge once, enforce occupied capacity, limits, research and closure", () => {
  const c = fixture(),
    m = metrics(c),
    cash = c.cash;
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "shops" }, m).ok,
    true,
  );
  assert.ok(c.cash < cash);
  assert.equal(futureTowerCapacity(c, 1), 180);
  const saved = JSON.stringify(c);
  assert.equal(
    futureAction(c, { type: "removeFloor", index: 1, floor: 0 }, m).ok,
    false,
  );
  assert.equal(JSON.stringify(c), saved);
  assert.equal(
    futureAction(
      c,
      { type: "setFloorEnabled", index: 1, floor: 0, enabled: false },
      m,
    ).ok,
    false,
  );
  assert.equal(JSON.stringify(c), saved);
  c.tiles[1].occupancy = 90;
  assert.equal(
    futureAction(c, { type: "removeFloor", index: 1, floor: 0 }, m).ok,
    true,
  );
  assert.equal(futureTowerCapacity(c, 1), 90);
  validateFuture(c.future, c);
  c.research.completed = [];
  const before = JSON.stringify(c);
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "offices" }, m).ok,
    false,
  );
  assert.equal(JSON.stringify(c), before);
});
test("mixed floors have distinct finite capacities and internal utility dependence without report writes", () => {
  const c = fixture(),
    m = metrics(c);
  for (const use of [
    "shops",
    "offices",
    "power",
    "water",
    "school",
    "park",
    "crown",
  ])
    assert.equal(
      futureAction(c, { type: "addFloor", index: 1, use }, m).ok,
      true,
    );
  const before = JSON.stringify(c),
    r = futureReport(c, m),
    t = r.towers[0];
  assert.equal(t.population, 180);
  assert.equal(t.housingCapacity, 180);
  assert.ok(t.jobs > 0);
  assert.ok(t.shopBundles > 0);
  assert.ok(t.schoolPlaces > 0);
  assert.ok(t.powerSupply > 0);
  assert.ok(t.waterSupply > 0);
  assert.ok(t.parkBenefit > 0);
  assert.ok(t.crownBenefit > 0);
  r.towers[0].floors[0].use = "hacked";
  assert.equal(JSON.stringify(c), before);
  assert.equal(futureReport(c, m).towers[0].floors[0].use, "homes");
  m.utilities.power.ratio = 0;
  m.jobFill[1] = 0;
  const blocked = futureReport(c, m).towers[0];
  assert.equal(blocked.shopBundles, 0);
  assert.equal(blocked.schoolPlaces, 0);
  assert.ok(blocked.blockers.length > 0);
});
test("corporate production consumes real finite oil and ore and books bounded product sales once", () => {
  const c = fixture(),
    m = metrics(c),
    before = { ...c.inventory },
    cash = c.cash;
  const r = advanceFuture(c, m);
  assert.ok(r.ledger.produced > 0);
  assert.equal(before.oil - c.inventory.oil, r.ledger.oilUsed);
  assert.equal(before.ore - c.inventory.ore, r.ledger.oreUsed);
  assert.equal(r.ledger.oilUsed, r.ledger.produced * 2);
  assert.equal(r.ledger.oreUsed, r.ledger.produced);
  assert.equal(
    r.ledger.openingComposite + r.ledger.produced - r.ledger.sold,
    r.ledger.closingComposite,
  );
  assert.equal(c.future.composite, r.ledger.closingComposite);
  assert.equal(r.ledger.revenue, r.ledger.sold * 5000);
  assert.equal(c.cash, cash, "core books returned revenue once");
  const saved = JSON.stringify(c);
  assert.deepEqual(advanceFuture(c, m).ledger, r.ledger);
  assert.equal(JSON.stringify(c), saved);
  validateFuture(c.future, c);
  c.month++;
  validateFuture(c.future, c);
  c.inventory.oil = 0;
  const next = advanceFuture(c, m);
  assert.equal(next.ledger.produced, 0);
});
test("closed, disconnected or unstaffed corporate facilities cannot produce or conjure demand", () => {
  for (const mode of ["closed", "disconnected", "unstaffed", "noBuyers"]) {
    const c = fixture(),
      m = metrics(c);
    if (mode === "closed") c.tiles[3].enabled = false;
    if (mode === "disconnected") m.operationAccess[3] = false;
    if (mode === "unstaffed") m.jobFill[3] = 0;
    if (mode === "noBuyers") m.jobFill[4] = 0;
    const r = advanceFuture(c, m);
    if (mode === "noBuyers") {
      assert.equal(r.ledger.sold, 0);
      assert.equal(c.future.composite, r.ledger.produced);
    } else assert.equal(r.ledger.produced, 0);
  }
});
test("research requires actual staffed institute and educated employed middle/high wealth adults", () => {
  const c = fixture(),
    m = metrics(c);
  assert.equal(canResearchFuture(c, m).ok, true);
  m.jobFill[2] = 0;
  assert.equal(canResearchFuture(c, m).ok, false);
  m.jobFill[2] = 12;
  c.households.homes[1].wealth = 0;
  assert.equal(canResearchFuture(c, m).ok, false);
  c.households.homes[1].wealth = 2;
  c.households.homes[1].educated = 0;
  assert.equal(canResearchFuture(c, m).ok, false);
});
test("strict validation rejects altered keys, ledgers, indexes, floor counts and non-finite values", () => {
  const c = fixture();
  for (const alter of [
    (s) => (s.extra = 1),
    (s) => (s.towers[0].tile = 100),
    (s) => s.towers[0].floors.push({ use: "unknown", enabled: true }),
    (s) => (s.composite = NaN),
    (s) => (s.ledger.produced = 1),
    (s) => (s.lastMonth = 10),
    (s) => s.towers.push(structuredClone(s.towers[0])),
  ]) {
    const bad = structuredClone(c.future);
    alter(bad);
    assert.throws(() => validateFuture(bad, c));
  }
});
test("reconciliation removes demolished tower floors without losing corporate stock and initializes new towers", () => {
  const c = fixture();
  c.future.composite = 0;
  c.tiles[1].type = "empty";
  c.tiles[1].occupancy = 0;
  Object.assign(c.tiles[10], { type: "tower", occupancy: 90 });
  syncFuture(c);
  assert.deepEqual(
    c.future.towers.map((t) => t.tile),
    [10],
  );
  assert.equal(futureTowerCapacity(c, 10), 180);
  validateFuture(c.future, c);
});
test("removing essential internal power disables dependent tower uses when external supply is absent", () => {
  const c = fixture(),
    m = metrics(c);
  for (const use of ["shops", "offices", "power", "water", "school"])
    assert.equal(
      futureAction(c, { type: "addFloor", index: 1, use }, m).ok,
      true,
    );
  m.utilities.power.ratio = 0;
  m.utilities.water.ratio = 0;
  const before = futureReport(c, m).towers[0];
  assert.ok(before.shopBundles > 0);
  assert.ok(before.schoolPlaces > 0);
  const power = c.future.towers[0].floors.findIndex((f) => f.use === "power");
  assert.equal(
    futureAction(c, { type: "removeFloor", index: 1, floor: power }, m).ok,
    true,
  );
  const after = futureReport(c, m).towers[0];
  assert.equal(after.shopBundles, 0);
  assert.equal(after.schoolPlaces, 0);
  assert.equal(after.population, 180);
  assert.ok(after.blockers.includes("Insufficient power"));
});
test("stored composite cannot sell through a closed or unstaffed corporate network", () => {
  for (const mode of ["closed", "unstaffed", "disconnected", "noPower"]) {
    const c = fixture(),
      m = metrics(c);
    m.jobFill[4] = 0;
    advanceFuture(c, m);
    c.month++;
    assert.ok(c.future.composite > 0);
    m.jobFill[4] = 12;
    if (mode === "closed") c.tiles[3].enabled = false;
    if (mode === "unstaffed") m.jobFill[3] = 0;
    if (mode === "disconnected") m.operationAccess[3] = false;
    if (mode === "noPower") m.utilities.power.ratio = 0;
    const stock = c.future.composite;
    const r = advanceFuture(c, m);
    assert.equal(r.ledger.sold, 0);
    assert.equal(r.ledger.revenue, 0);
    assert.equal(c.future.composite, stock);
  }
});
test("strict current state rejects ledgers beyond real stock and canonical floor bounds", () => {
  const c = fixture();
  for (const alter of [
    (s) => {
      s.ledger.produced = 600000;
      s.ledger.sold = 600000;
      s.ledger.oilUsed = 1200000;
      s.ledger.oreUsed = 600000;
      s.ledger.revenue = 3000000000;
      s.ledger.pollution = 2400000;
    },
    (s) =>
      (s.towers[0].floors = Array.from({ length: 13 }, () => ({
        use: "homes",
        enabled: true,
      }))),
    (s) => (s.towers[0].floors[0].enabled = false),
  ]) {
    const state = structuredClone(c.future);
    alter(state);
    assert.throws(() => validateFuture(state, c));
  }
});
test("invalid research, unknown actions, crowns, maximum floors and insufficient cash are atomic", () => {
  const c = fixture(),
    m = metrics(c);
  for (const action of [
    { type: "addFloor", index: 1, use: "__proto__" },
    { type: "unknown", index: 1 },
    { type: "setFloorEnabled", index: 1, floor: 0, enabled: 1 },
    { type: "removeFloor", index: 1, floor: NaN },
  ]) {
    const before = JSON.stringify(c);
    assert.equal(futureAction(c, action, m).ok, false);
    assert.equal(JSON.stringify(c), before);
  }
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "crown" }, m).ok,
    true,
  );
  let before = JSON.stringify(c);
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "crown" }, m).ok,
    false,
  );
  assert.equal(JSON.stringify(c), before);
  while (c.future.towers[0].floors.length < 12)
    assert.equal(
      futureAction(c, { type: "addFloor", index: 1, use: "offices" }, m).ok,
      true,
    );
  before = JSON.stringify(c);
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "park" }, m).ok,
    false,
  );
  assert.equal(JSON.stringify(c), before);
  const poor = fixture();
  poor.cash = 0;
  before = JSON.stringify(poor);
  assert.equal(
    futureAction(poor, { type: "addFloor", index: 1, use: "shops" }, m).ok,
    false,
  );
  assert.equal(JSON.stringify(poor), before);
});
test("progression overflow and invalid inventory reject before any mutation", () => {
  const c = fixture(),
    m = metrics(c);
  c.inventory.oil = Infinity;
  const before = structuredClone(c);
  assert.throws(() => advanceFuture(c, m));
  assert.deepEqual(c, before);
  const end = fixture();
  end.month = 1000000;
  end.future = createFuture(end);
  const saved = JSON.stringify(end);
  assert.throws(() => advanceFuture(end, m));
  assert.equal(JSON.stringify(end), saved);
});

test("research does not reuse last-month wages or disconnected households as current skilled workers", () => {
  const c = fixture(),
    m = metrics(c);
  m.homeEmployment[1] = 0;
  assert.equal(canResearchFuture(c, m).ok, false);
  m.homeEmployment[1] = 40;
  m.operationAccess[1] = false;
  assert.equal(canResearchFuture(c, m).ok, false);
  m.operationAccess[1] = true;
  c.tiles[1].enabled = false;
  assert.equal(canResearchFuture(c, m).ok, false);
});
test("corporate report site ledger cannot mutate state or hide emitted production", () => {
  const c = fixture(),
    m = metrics(c);
  const r = advanceFuture(c, m);
  assert.equal(
    r.ledger.sites.reduce((n, s) => n + s.produced, 0),
    r.ledger.produced,
  );
  const saved = JSON.stringify(c);
  r.ledger.sites[0].produced = 999;
  assert.equal(JSON.stringify(c), saved);
  const bad = structuredClone(c.future);
  bad.ledger.sites[0].produced = 0;
  assert.throws(() => validateFuture(bad, c));
});
test("free floor shutdown remains available during a treasury deficit", () => {
  const c = fixture(),
    m = metrics(c);
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "offices" }, m).ok,
    true,
  );
  c.cash = -1;
  assert.equal(
    futureAction(
      c,
      { type: "setFloorEnabled", index: 1, floor: 2, enabled: false },
      m,
    ).ok,
    true,
  );
  assert.equal(c.cash, -1);
  assert.equal(c.future.towers[0].floors[2].enabled, false);
});
test("the single crown remains the top floor when a use is added below it", () => {
  const c = fixture(),
    m = metrics(c);
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "crown" }, m).ok,
    true,
  );
  assert.equal(
    futureAction(c, { type: "addFloor", index: 1, use: "shops" }, m).ok,
    true,
  );
  assert.equal(c.future.towers[0].floors.at(-1).use, "crown");
  const bad = structuredClone(c.future);
  bad.towers[0].floors.reverse();
  assert.throws(() => validateFuture(bad, c));
});
test("240 varied months preserve resource and product identities and exact restored continuation", () => {
  const city = fixture();
  let importedOil = 100,
    importedOre = 100,
    usedOil = 0,
    usedOre = 0,
    produced = 0,
    sold = 0;
  for (let month = 0; month < 240; month++) {
    if (month % 5 === 0) {
      city.inventory.oil += 20;
      city.inventory.ore += 10;
      importedOil += 20;
      importedOre += 10;
    }
    city.tiles[3].enabled = month % 7 !== 0;
    city.tiles[3].modules = month % 4;
    const m = metrics(city);
    m.jobFill[3] = month % 6 === 0 ? 0 : 12;
    m.utilities.water.ratio = month % 11 === 0 ? 0 : 1;
    m.jobFill[4] = month % 3 === 0 ? 0 : 12;
    const restored = JSON.parse(JSON.stringify(city));
    const a = advanceFuture(city, m),
      b = advanceFuture(restored, m);
    assert.deepEqual(a, b);
    assert.deepEqual(city, restored);
    usedOil += a.ledger.oilUsed;
    usedOre += a.ledger.oreUsed;
    produced += a.ledger.produced;
    sold += a.ledger.sold;
    assert.equal(city.inventory.oil, importedOil - usedOil);
    assert.equal(city.inventory.ore, importedOre - usedOre);
    assert.equal(city.future.composite, produced - sold);
    const saved = JSON.stringify(city);
    advanceFuture(city, m);
    assert.equal(JSON.stringify(city), saved);
    city.month++;
    validateFuture(city.future, city);
  }
});

test("internal water cannot bypass an exhausted or explicitly unavailable shared water reserve", () => {
  const c = fixture(),
    m = metrics(c);
  for (const use of ["shops", "power", "water"])
    assert.equal(
      futureAction(c, { type: "addFloor", index: 1, use }, m).ok,
      true,
    );
  m.utilities.water.ratio = 0;
  c.groundwater = 0;
  let r = futureReport(c, m).towers[0];
  assert.equal(r.waterSupply, 0);
  assert.equal(r.shopBundles, 0);
  c.groundwater = 1000;
  m.futureWaterAvailable = Array(32).fill(0);
  r = futureReport(c, m).towers[0];
  assert.equal(r.waterSupply, 0);
});
test("actual critical staff power their own floor without being diluted by unpowered office vacancies", () => {
  const c = fixture(),
    m = metrics(c);
  for (const use of ["offices", "power", "water", "shops"])
    assert.equal(
      futureAction(c, { type: "addFloor", index: 1, use }, m).ok,
      true,
    );
  m.utilities.power.ratio = 0;
  m.utilities.water.ratio = 0;
  m.jobFill[1] = 8;
  const r = futureReport(c, m).towers[0];
  assert.equal(r.powerSupply, 400);
  assert.equal(r.waterSupply, 0);
  assert.equal(r.criticalJobs, 16);
  assert.equal(r.staffByUse.power, 8);
  assert.equal(r.staffByUse.offices, 0);
  assert.equal(
    Object.values(r.staffByUse).reduce((a, b) => a + b, 0),
    8,
  );
  assert.equal(r.shopBundles, 0);
});
test("closing a whole tower suspends its enabled-floor operating upkeep", () => {
  const c = fixture(),
    m = metrics(c);
  assert.ok(futureReport(c, m).upkeep > 0);
  c.tiles[1].enabled = false;
  assert.equal(futureReport(c, m).upkeep, 0);
});
test("explicit phase reservations cannot be reassigned into invented critical staffing by a report", () => {
  const c = fixture(),
    m = metrics(c);
  for (const use of ["power", "offices"])
    assert.equal(
      futureAction(c, { type: "addFloor", index: 1, use }, m).ok,
      true,
    );
  m.jobFill[1] = 8;
  m.futureStaffByUse = [];
  m.futureStaffByUse[1] = {
    homes: 0,
    power: 0,
    water: 0,
    school: 0,
    shops: 0,
    offices: 8,
    park: 0,
    crown: 0,
  };
  assert.equal(futureReport(c, m).towers[0].powerSupply, 0);
  m.futureStaffByUse[1].power = 8;
  assert.throws(() => futureReport(c, m));
});
