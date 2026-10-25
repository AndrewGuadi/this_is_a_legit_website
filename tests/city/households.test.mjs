import test from "node:test";
import assert from "node:assert/strict";
import {
  createHouseholds,
  reconcileHouseholds,
  householdReport,
  advanceHouseholds,
  validateHouseholds,
  householdAction,
  setSectorTaxes,
  taxRevenue,
  effectiveTaxRate,
} from "../../static/cmd-city/households.mjs";
const N = 1280,
  W = 40,
  idx = (x, y) => y * W + x;
function fixture({ occupancy = 20, two = false } = {}) {
  const city = {
    width: 40,
    height: 32,
    month: 0,
    cash: 5000000,
    rng: 77,
    sandbox: false,
    funding: { school: 100 },
    civic: { departments: ["finance"] },
    inventory: { goods: 1000 },
    tiles: Array.from({ length: N }, () => ({
      type: "empty",
      occupancy: 0,
      enabled: true,
      fire: 0,
      modules: 0,
    })),
  };
  for (let x = 0; x <= 15; x++) city.tiles[idx(x, 16)].type = "road";
  city.tiles[idx(3, 15)].type = "residential";
  city.tiles[idx(3, 15)].occupancy = occupancy;
  if (two) {
    city.tiles[idx(6, 15)].type = "residential";
    city.tiles[idx(6, 15)].occupancy = 20;
  }
  for (const [type, x, y] of [
    ["commercial", 10, 15],
    ["school", 7, 17],
    ["university", 8, 17],
    ["townHall", 5, 17],
  ])
    city.tiles[idx(x, y)].type = type;
  city.tiles[idx(10, 15)].occupancy = 10;
  const metrics = {
    access: Array(N).fill(true),
    operationAccess: Array(N).fill(true),
    landValue: Array(N).fill(60),
    coverage: { school: Array(N).fill(100) },
    jobFill: Array(N).fill(0),
    homeEmployment: Array(N).fill(0),
    utilities: Object.fromEntries(
      ["power", "water", "sewage", "waste"].map((k) => [
        k,
        { supply: 10000, demand: 100, ratio: 1 },
      ]),
    ),
  };
  metrics.jobFill[idx(10, 15)] = 10;
  metrics.jobFill[idx(7, 17)] = 8;
  metrics.jobFill[idx(8, 17)] = 12;
  metrics.homeEmployment[idx(3, 15)] = Math.floor(occupancy * 0.6);
  if (two) metrics.homeEmployment[idx(6, 15)] = 12;
  city.households = createHouseholds(city);
  return { city, metrics };
}
function tick(f) {
  const result = advanceHouseholds(f.city, f.metrics);
  f.city.month++;
  return result;
}
function reject(f, action) {
  const before = structuredClone(f.city);
  assert.equal(householdAction(f.city, action, f.metrics).ok, false);
  assert.deepEqual(f.city, before);
}
function credit(f, index, amount) {
  const h = f.city.households.homes[index];
  h.cash += amount;
  f.city.households.ledger.immigration += amount;
  f.city.households.ledger.closingCash += amount;
}
const home = idx(3, 15),
  shop = idx(10, 15);

test("new per-home cohorts exactly partition actual population and begin low wealth", () => {
  const f = fixture({ two: true }),
    r = householdReport(f.city, f.metrics);
  assert.equal(r.population, 40);
  assert.deepEqual(r.demographics, {
    children: 10,
    adults: 24,
    seniors: 6,
    educatedAdults: 0,
  });
  assert.equal(f.city.households.homes[home].wealth, 0);
  assert.equal(f.city.households.homes[home].cash, 200000);
  assert.equal(f.city.households.homes[shop], null);
  assert.equal(validateHouseholds(f.city.households, f.city), true);
});
test("migration starts at current month with no invented past learning", () => {
  const f = fixture();
  f.city.month = 37;
  f.city.households = createHouseholds(f.city, { month: 37 });
  assert.equal(f.city.households.lastMonth, 37);
  assert.equal(f.city.households.homes[home].study, 0);
  assert.equal(f.city.households.homes[home].educated, 0);
  assert.equal(validateHouseholds(f.city.households, f.city), true);
});
test("growth reconciliation adds declared external capital without inventing residents or municipal money", () => {
  const f = fixture(),
    cash = f.city.cash,
    old = f.city.households.homes[home].cash;
  f.city.tiles[home].occupancy = 24;
  reconcileHouseholds(f.city);
  const h = f.city.households.homes[home];
  assert.equal(h.children + h.adults + h.seniors, 24);
  assert.equal(h.adults, 14);
  assert.equal(h.cash - old, 40000);
  assert.equal(f.city.households.pending.immigration, 40000);
  assert.equal(f.city.cash, cash);
  assert.equal(f.city.tiles[home].occupancy, 24);
});
test("departures proportionally remove private cash, educated adults and uncollected debt", () => {
  const f = fixture();
  f.city.households.homes[home].educated = 6;
  f.city.tiles[home].occupancy = 10;
  reconcileHouseholds(f.city);
  const h = f.city.households.homes[home];
  assert.equal(h.cash, 100000);
  assert.equal(h.educated, 3);
  assert.equal(f.city.households.pending.emigration, 100000);
  assert.equal(h.children + h.adults + h.seniors, 10);
});
test("demolition clears the departed home without transferring its private wallet to treasury", () => {
  const f = fixture(),
    cash = f.city.cash;
  f.city.tiles[home].type = "empty";
  f.city.tiles[home].occupancy = 0;
  reconcileHouseholds(f.city);
  assert.equal(f.city.households.homes[home], null);
  assert.equal(f.city.households.pending.emigration, 200000);
  assert.equal(f.city.cash, cash);
});
test("reports virtually reconcile changed occupants but never mutate any source state or RNG", () => {
  const f = fixture();
  f.city.tiles[home].occupancy = 24;
  const before = structuredClone(f.city);
  const r = householdReport(f.city, f.metrics);
  assert.equal(r.population, 24);
  assert.equal(r.demographics.adults, 14);
  assert.deepEqual(f.city, before);
});
test("private wages come only from actual routed employment and ledger cash reconciles", () => {
  const f = fixture();
  f.metrics.homeEmployment[home] = 8;
  const before = f.city.cash,
    r = tick(f),
    l = f.city.households.ledger;
  assert.equal(l.wages, 25600);
  assert.equal(
    l.openingCash +
      l.immigration -
      l.emigration +
      l.wages -
      l.residentialTaxes -
      l.spending,
    l.closingCash,
  );
  assert.equal(
    l.openingArrears + l.taxDue - l.residentialTaxes - l.writtenOffTaxes,
    l.closingArrears,
  );
  assert.equal(f.city.cash, before);
  assert.equal(
    r.bookedTaxes.total,
    r.bookedTaxes.residential +
      r.bookedTaxes.commercial +
      r.bookedTaxes.industrial,
  );
});
test("unemployed households receive no ghost wage income", () => {
  const f = fixture();
  f.metrics.homeEmployment[home] = 0;
  tick(f);
  assert.equal(f.city.households.ledger.wages, 0);
  assert.equal(f.city.households.homes[home].employed, 0);
});
test("private-wallet saturation records capped external wages without overflow or hidden loss", () => {
  const f = fixture();
  credit(f, home, 1000000000 - 200000);
  const r = tick(f);
  assert.ok(f.city.households.ledger.cappedWages > 0);
  assert.ok(f.city.households.homes[home].cash <= 1000000000);
  assert.equal(validateHouseholds(f.city.households, f.city), true);
  assert.equal(
    r.report.budgets.currentCash,
    f.city.households.homes[home].cash,
  );
});
test("shopping consumes actual shared goods and household money along a real road path", () => {
  const f = fixture(),
    goods = f.city.inventory.goods,
    result = tick(f),
    h = f.city.households.homes[home];
  assert.equal(h.shoppingWanted, 5);
  assert.equal(h.shoppingBought, 5);
  assert.equal(goods - f.city.inventory.goods, 5);
  assert.equal(h.spending, 5000);
  assert.ok(result.trips.length > 0);
  assert.equal(result.trips[0].from, home);
  assert.equal(result.trips[0].to, shop);
  assert.ok(
    result.trips[0].path.every((i) =>
      ["road", "avenue", "bridge"].includes(f.city.tiles[i].type),
    ),
  );
  assert.ok(result.shoppingLoad.some((n) => n > 0));
});
test("a broken physical road prevents shopping even if aggregate access and coverage say yes", () => {
  const f = fixture();
  f.city.tiles[idx(8, 16)].type = "empty";
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 0);
  assert.equal(f.city.households.homes[home].unmet, 5);
});
test("closed, burning, unstaffed or unsupplied shops do not sell", () => {
  for (const change of [
    (f) => (f.city.tiles[shop].enabled = false),
    (f) => (f.city.tiles[shop].fire = 1),
    (f) => (f.metrics.jobFill[shop] = 0),
    (f) => (f.metrics.operationAccess[shop] = false),
    (f) => (f.metrics.utilities.power.ratio = 0),
  ]) {
    const f = fixture();
    change(f);
    tick(f);
    assert.equal(f.city.households.homes[home].shoppingBought, 0);
  }
});
test("all homes share finite shop capacity and finite goods without overselling", () => {
  const f = fixture({ two: true });
  f.metrics.jobFill[shop] = 1;
  f.city.inventory.goods = 3;
  const goods = f.city.inventory.goods;
  tick(f);
  const a = f.city.households.homes[home],
    b = f.city.households.homes[idx(6, 15)];
  assert.equal(a.shoppingBought + b.shoppingBought, 3);
  assert.ok(a.shoppingBought > 0 && b.shoppingBought > 0);
  assert.equal(goods - f.city.inventory.goods, 3);
  assert.ok(a.shoppingBought + b.shoppingBought <= 4);
});
test("poor wallets never overspend and unpaid residential taxes remain explicit arrears", () => {
  const f = fixture();
  const h = f.city.households.homes[home],
    old = h.cash;
  h.cash = 0;
  f.city.households.ledger.emigration += old;
  f.city.households.ledger.closingCash = 0;
  f.metrics.homeEmployment[home] = 0;
  const result = tick(f);
  assert.equal(h.cash, 0);
  const after = f.city.households.homes[home];
  assert.equal(after.shoppingBought, 0);
  assert.equal(after.taxes, 0);
  assert.ok(after.arrears > 0);
  assert.equal(result.bookedTaxes.residential, 0);
});
test("actual sales are private merchant receipts, never municipal sales revenue", () => {
  const f = fixture(),
    before = f.city.cash;
  const r = tick(f);
  assert.equal(r.report.shopping.spent, f.city.households.ledger.spending);
  assert.equal(r.report.shopping.bought, 5);
  assert.equal(f.city.cash, before);
});
test("schools and universities share finite enrollment slots instead of granting coverage-based education", () => {
  const f = fixture();
  for (let x = 1; x <= 15; x++) {
    const i = idx(x, 14);
    f.city.tiles[i].type = "residential";
    f.city.tiles[i].occupancy = 20;
    f.metrics.homeEmployment[i] = 12;
    f.city.tiles[idx(x, 15)].type = "road";
  }
  f.metrics.homeEmployment[home] = 0;
  reconcileHouseholds(f.city);
  tick(f);
  const report = householdReport(f.city, f.metrics);
  assert.ok(report.education.enrolledChildren <= 60);
  assert.ok(report.education.enrolledAdults <= 40);
  assert.equal(report.demographics.educatedAdults, 0);
});
test("adult graduation requires twelve attended months, with no retrospective migration credit", () => {
  const f = fixture();
  for (let n = 0; n < 11; n++) {
    tick(f);
    assert.equal(f.city.households.homes[home].educated, 0);
  }
  tick(f);
  assert.equal(f.city.households.homes[home].educated, 12);
  assert.equal(f.city.households.homes[home].study, 0);
});
test("coverage alone or an interruption cannot graduate untrained adults", () => {
  const f = fixture();
  f.city.tiles[idx(8, 17)].enabled = false;
  for (let n = 0; n < 12; n++) tick(f);
  assert.equal(f.city.households.homes[home].educated, 0);
  f.city.tiles[idx(8, 17)].enabled = true;
  for (let n = 0; n < 11; n++) tick(f);
  f.city.tiles[idx(8, 17)].enabled = false;
  tick(f);
  assert.equal(f.city.households.homes[home].educated, 0);
  f.city.tiles[idx(8, 17)].enabled = true;
  tick(f);
  assert.equal(f.city.households.homes[home].educated, 12);
});
test("land value alone cannot promote a poor uneducated unemployed household", () => {
  const f = fixture();
  f.metrics.landValue[home] = 100;
  f.metrics.homeEmployment[home] = 0;
  for (let n = 0; n < 8; n++) tick(f);
  assert.equal(f.city.households.homes[home].wealth, 0);
});
test("wealth changes require sustained real conditions and move only one class at a time", () => {
  const f = fixture();
  credit(f, home, 3000000);
  f.city.households.homes[home].educated = 12;
  f.metrics.landValue[home] = 90;
  for (let n = 0; n < 5; n++) tick(f);
  assert.equal(f.city.households.homes[home].wealth, 0);
  tick(f);
  assert.equal(f.city.households.homes[home].wealth, 1);
  for (let n = 0; n < 6; n++) tick(f);
  assert.equal(f.city.households.homes[home].wealth, 2);
  f.metrics.homeEmployment[home] = 0;
  f.city.inventory.goods = 0;
  for (let n = 0; n < 3; n++) tick(f);
  assert.equal(f.city.households.homes[home].wealth, 1);
});
test("class tax requires Finance and an open operating Town Hall; malformed actions are inert", () => {
  const f = fixture();
  const valid = {
    type: "classTax",
    sector: "residential",
    wealth: 1,
    value: 12,
  };
  assert.equal(householdAction(f.city, valid, f.metrics).ok, true);
  assert.equal(f.city.households.wealthTaxes.residential[1], 12);
  for (const patch of [
    { sector: ["residential"] },
    { sector: "constructor" },
    { wealth: [1] },
    { wealth: new Number(1) },
    { wealth: 3 },
    { value: NaN },
    { value: 21 },
    { type: ["classTax"] },
  ])
    reject(f, { ...valid, ...patch });
  f.city.civic.departments = [];
  reject(f, valid);
  f.city.civic.departments = ["finance"];
  f.city.tiles[idx(5, 17)].enabled = false;
  reject(f, valid);
});
test("uniform rates preserve legacy tax arithmetic and legacy sector changes set all classes", () => {
  const f = fixture(),
    tax = taxRevenue(f.city, f.metrics);
  assert.equal(tax.residential, (20 * 2400 * 9) / 100);
  assert.equal(tax.commercial, (10 * 8000 * 9) / 100);
  assert.equal(effectiveTaxRate(f.city, "residential", f.metrics), 9);
  assert.equal(setSectorTaxes(f.city, "residential", 7).ok, true);
  assert.deepEqual(f.city.households.wealthTaxes.residential, [7, 7, 7]);
  const before = structuredClone(f.city);
  assert.equal(setSectorTaxes(f.city, ["residential"], 7).ok, false);
  assert.deepEqual(f.city, before);
});
test("booked residential taxes retain the old class when wealth changes after collection", () => {
  const f = fixture();
  credit(f, home, 3000000);
  const h = f.city.households.homes[home];
  h.educated = 12;
  h.goodMonths = 5;
  f.metrics.landValue[home] = 90;
  f.city.households.wealthTaxes.residential = [4, 15, 20];
  const r = tick(f);
  assert.equal(f.city.households.homes[home].wealth, 1);
  assert.equal(r.bookedTaxes.residential, (20 * 2400 * 4) / 100);
  assert.equal(
    taxRevenue(f.city, f.metrics).residential,
    (20 * 2400 * 15) / 100,
  );
});
test("strict validation catches malformed counts, money, study, tax arrays, unknown keys and phase markers", () => {
  const f = fixture(),
    base = structuredClone(f.city.households);
  const changes = [
    (s) => (s.extra = true),
    (s) => (s.version = 2),
    (s) => s.homes[home].adults++,
    (s) => (s.homes[home].cash = NaN),
    (s) => (s.homes[home].educated = 13),
    (s) => (s.homes[home].wealth = ["1"]),
    (s) => (s.homes[home].study = 12),
    (s) => (s.wealthTaxes.residential = [9, 9, 21]),
    (s) => (s.homes[shop] = structuredClone(s.homes[home])),
    (s) => (s.lastMonth = 1),
  ];
  for (const change of changes) {
    const s = structuredClone(base);
    change(s);
    assert.throws(() => validateHouseholds(s, f.city));
  }
  f.city.tiles[home].occupancy = 24;
  assert.equal(validateHouseholds(base, f.city, { stable: false }), true);
  assert.throws(() => validateHouseholds(base, f.city));
});
test("monthly hook is idempotent in prefinance phase and preserves authoritative population and RNG", () => {
  const f = fixture(),
    occupancy = f.city.tiles.map((t) => t.occupancy);
  const first = advanceHouseholds(f.city, f.metrics),
    before = structuredClone(f.city),
    second = advanceHouseholds(f.city, f.metrics);
  assert.deepEqual(f.city, before);
  assert.deepEqual(first.bookedTaxes, second.bookedTaxes);
  assert.deepEqual(
    f.city.tiles.map((t) => t.occupancy),
    occupancy,
  );
  assert.equal(f.city.rng, 77);
  assert.equal(
    validateHouseholds(f.city.households, f.city, { stable: false }),
    true,
  );
  f.city.month++;
  assert.equal(validateHouseholds(f.city.households, f.city), true);
});
test("shopping reserves remaining shared road capacity after actual commuting", () => {
  const f = fixture(),
    bottleneck = idx(8, 16);
  f.metrics.roadLoad = Array(N).fill(0);
  f.metrics.roadLoad[bottleneck] = 79;
  const result = tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 1);
  assert.equal(result.shoppingLoad[bottleneck], 1);
  const full = fixture();
  full.metrics.roadLoad = Array(N).fill(0);
  full.metrics.roadLoad[bottleneck] = 79.5;
  tick(full);
  assert.equal(full.city.households.homes[home].shoppingBought, 0);
});
test("full booked shopping traffic survives repeated hooks, JSON round-trip and pure reports", () => {
  const f = fixture();
  const first = advanceHouseholds(f.city, f.metrics),
    saved = structuredClone(f.city.households);
  assert.ok(
    Array.isArray(saved.shoppingLoad),
    "Book the complete route load array in household state.",
  );
  assert.ok(saved.shoppingLoad.some((n) => n > 0));
  assert.equal(saved.shoppingLoad.length, N);
  const second = advanceHouseholds(f.city, f.metrics);
  assert.deepEqual(second.shoppingLoad, first.shoppingLoad);
  assert.deepEqual(f.city.households, saved);
  f.city.month++;
  const before = structuredClone(f.city);
  const report = householdReport(f.city, f.metrics);
  assert.deepEqual(report.shopping.load, saved.shoppingLoad);
  assert.deepEqual(f.city, before);
  const loaded = structuredClone(f.city);
  loaded.households = JSON.parse(JSON.stringify(f.city.households));
  assert.equal(validateHouseholds(loaded.households, loaded), true);
  assert.deepEqual(
    householdReport(loaded, f.metrics).shopping.load,
    saved.shoppingLoad,
  );
});
test("caller edits to returned shopping-load arrays cannot poison persisted history", () => {
  const f = fixture();
  const result = advanceHouseholds(f.city, f.metrics),
    saved = structuredClone(f.city.households.shoppingLoad);
  assert.ok(
    Array.isArray(result.report.shopping.load),
    "Report the persisted traffic snapshot.",
  );
  result.shoppingLoad.fill(999);
  result.report.shopping.load.fill(777);
  assert.deepEqual(f.city.households.shoppingLoad, saved);
  const repeated = advanceHouseholds(f.city, f.metrics);
  repeated.shoppingLoad.fill(888);
  assert.deepEqual(f.city.households.shoppingLoad, saved);
  f.city.month++;
  const report = householdReport(f.city, f.metrics);
  report.shopping.load.fill(666);
  assert.deepEqual(f.city.households.shoppingLoad, saved);
});
test("reconciliation retains historical loads across deletion while validator rejects malformed load arrays", () => {
  const f = fixture();
  tick(f);
  const loads = structuredClone(f.city.households.shoppingLoad);
  assert.ok(
    Array.isArray(loads),
    "Persist all booked road loads before reconciliation.",
  );
  f.city.tiles[idx(8, 16)].type = "empty";
  f.city.tiles[home].type = "empty";
  f.city.tiles[home].occupancy = 0;
  f.metrics.homeEmployment[home] = 0;
  reconcileHouseholds(f.city);
  assert.deepEqual(f.city.households.shoppingLoad, loads);
  assert.deepEqual(householdReport(f.city, f.metrics).shopping.load, loads);
  for (const mutate of [
    (s) => s.shoppingLoad.pop(),
    (s) => (s.shoppingLoad[0] = -1),
    (s) => (s.shoppingLoad[0] = 0.5),
    (s) => (s.shoppingLoad[0] = NaN),
    (s) => (s.shoppingLoad[0] = 1000001),
  ]) {
    const state = structuredClone(f.city.households);
    mutate(state);
    assert.throws(() => validateHouseholds(state, f.city));
  }
});
test("route topology caches observe road closure, fire, demolition and restoration across months", () => {
  const f = fixture(),
    road = f.city.tiles[idx(8, 16)];
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 5);
  road.enabled = false;
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 0);
  road.enabled = true;
  road.fire = 1;
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 0);
  road.fire = 0;
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 5);
  road.type = "empty";
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 0);
  road.type = "road";
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 5);
});
test("route reuse never caches shop staffing, wallet, price, utility or goods eligibility", () => {
  const f = fixture();
  tick(f);
  f.metrics.jobFill[shop] = 0;
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 0);
  f.metrics.jobFill[shop] = 1;
  f.metrics.landValue[shop] = 90;
  f.city.inventory.goods = 2;
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 2);
  assert.equal(f.city.households.homes[home].spending, 3000);
  f.metrics.utilities.water.ratio = 0;
  f.city.inventory.goods = 10;
  tick(f);
  assert.equal(f.city.households.homes[home].shoppingBought, 0);
});
test("optimized reports retain deep defensive copies of home balances, tax arrays, ledger and traffic", () => {
  const f = fixture();
  tick(f);
  const before = structuredClone(f.city),
    report = householdReport(f.city, f.metrics);
  report.homes[home].cash = -1;
  report.taxes.rates.residential[0] = 20;
  report.budgets.closingCash = -1;
  report.shopping.load.fill(999);
  assert.deepEqual(f.city, before);
});
