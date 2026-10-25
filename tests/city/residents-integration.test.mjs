import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  applyAction,
  measure,
  advanceMonth,
  inspectTile,
} from "../../static/cmd-city/core.mjs";
import { parseCity, serializeCity } from "../../static/cmd-city/save.mjs";
import {
  createRegion,
  advanceRegion,
  parseRegion,
  serializeRegion,
  regionAction,
} from "../../static/cmd-city/region.mjs";
import {
  createHouseholds,
  reconcileHouseholds,
  validateHouseholds,
} from "../../static/cmd-city/households.mjs";
import {
  createServices,
  validateServices,
  serviceReport,
} from "../../static/cmd-city/services.mjs";
const at = (x, y) => y * 40 + x;
function put(s, type, x, y, fields = {}) {
  Object.assign(s.tiles[at(x, y)], {
    type,
    terrain: "land",
    occupancy: 0,
    ...fields,
  });
}
function flat() {
  const s = createCity({ starter: false, sandbox: true, seed: 51 });
  for (const t of s.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      stored: 0,
      fire: 0,
      enabled: true,
    });
  for (let x = 0; x <= 35; x++) put(s, "road", x, 16);
  for (const [type, x] of [
    ["wind", 1],
    ["water", 2],
    ["sewage", 3],
  ])
    put(s, type, x, 15);
  s.cash = 100000000;
  return s;
}
function initialize(s) {
  s.households = createHouseholds(s);
  s.services = createServices(s);
  return s;
}
function legacy(s, version = 2) {
  const old = structuredClone(s);
  old.version = version;
  delete old.households;
  delete old.services;
  if (version === 1) {
    delete old.environment;
    delete old.civic;
    for (const t of old.tiles)
      if (["townHall", "waterFilter", "cleanup", "nuclear"].includes(t.type))
        Object.assign(t, { type: "empty", occupancy: 0 });
  }
  return old;
}
function reject(s, a) {
  const before = structuredClone(s);
  assert.equal(applyAction(s, a).ok, false);
  assert.deepEqual(s, before);
}
function wallet(s, i, value) {
  const h = s.households.homes[i],
    delta = value - h.cash;
  h.cash = value;
  s.households.ledger.immigration += delta;
  s.households.ledger.closingCash += delta;
}

test("city schema3 creates aligned conserved households and finite service state after starter construction", () => {
  const s = createCity();
  assert.equal(s.version, 3);
  assert.equal(s.households.lastMonth, 0);
  assert.equal(s.services.lastMonth, -1);
  assert.equal(validateHouseholds(s.households, s), true);
  assert.equal(validateServices(s.services, s), true);
  const m = measure(s);
  assert.equal(m.homeEmployment.length, 1280);
  assert.equal(m.households.population, m.population);
  assert.ok(m.services.conservation.waste);
});
test("actual routed adult cohorts bound each home assignment and provider positions are staffed", () => {
  const s = flat();
  put(s, "residential", 8, 15, { occupancy: 24 });
  put(s, "school", 7, 15);
  put(s, "clinic", 10, 15);
  initialize(s);
  const m = measure(s);
  assert.equal(m.jobs, 16);
  assert.equal(m.homeEmployment[at(8, 15)], m.employed);
  assert.ok(
    m.homeEmployment[at(8, 15)] <= s.households.homes[at(8, 15)].adults,
  );
  assert.ok(m.jobFill[at(7, 15)] > 0);
  assert.equal(
    m.homeEmployment.reduce((a, b) => a + b, 0),
    m.employed,
  );
  const before = structuredClone(s);
  measure(s);
  assert.deepEqual(s, before);
});
test("adult composition affects routing cache without changing raw home occupancy", () => {
  const s = flat();
  put(s, "residential", 8, 15, { occupancy: 24 });
  put(s, "industrial", 9, 15, { occupancy: 18 });
  initialize(s);
  const a = measure(s);
  const h = s.households.homes[at(8, 15)];
  h.children += h.adults - 1;
  h.adults = 1;
  const b = measure(s);
  assert.equal(b.workers, 1);
  assert.equal(b.employed, 1);
  assert.ok(b.employed < a.employed);
  assert.deepEqual(
    b.homeEmployment,
    measure(structuredClone(s)).homeEmployment,
  );
});
test("prefinance household receipts book actual paid taxes once with exactly reconciling municipal and private ledgers", () => {
  const s = flat();
  put(s, "residential", 8, 15, { occupancy: 12 });
  initialize(s);
  wallet(s, at(8, 15), 0);
  applyAction(s, { type: "tax", sector: "residential", value: 20 });
  const before = s.cash;
  advanceMonth(s);
  assert.equal(s.households.lastMonth, s.month);
  assert.equal(s.services.lastMonth, s.month - 1);
  assert.equal(s.households.ledger.residentialTaxes, 0);
  assert.equal(s.history.at(-1).income, 0);
  assert.equal(s.cash - before, s.history.at(-1).net);
  assert.ok(s.households.ledger.closingArrears > 0);
  assert.equal(validateHouseholds(s.households, s), true);
});
test("legacy taxes set every wealth class while class-specific actions need Finance and a supplied Hall", () => {
  const s = createCity();
  assert.equal(
    applyAction(s, { type: "tax", sector: "residential", value: 7 }).ok,
    true,
  );
  assert.deepEqual(s.households.wealthTaxes.residential, [7, 7, 7]);
  reject(s, { type: "classTax", sector: "residential", wealth: 2, value: 12 });
  s.civic.peakPopulation = 500;
  s.civic.tier = 2;
  s.civic.departments = ["finance"];
  assert.equal(
    applyAction(s, {
      type: "classTax",
      sector: "residential",
      wealth: 2,
      value: 12,
    }).ok,
    true,
  );
  assert.deepEqual(s.households.wealthTaxes.residential, [7, 7, 12]);
});
test("real shops consume only purchased bundles and booked shopping loads persist across save and pure reports", () => {
  const s = flat();
  put(s, "residential", 8, 15, { occupancy: 24 });
  put(s, "commercial", 9, 15, { occupancy: 12 });
  initialize(s);
  s.inventory.goods = 1000;
  const before = s.inventory.goods;
  advanceMonth(s);
  const m = measure(s);
  assert.equal(before - s.inventory.goods, s.households.ledger.shoppingBought);
  assert.ok(m.households.shopping.bought > 0);
  assert.ok(m.shoppingLoad.some((n) => n > 0));
  assert.ok(
    m.roadLoad.every((n, i) => n === m.commuterRoadLoad[i] + m.shoppingLoad[i]),
  );
  const a = parseCity(serializeCity(s));
  assert.deepEqual(measure(a).shoppingLoad, m.shoppingLoad);
  const snapshot = structuredClone(s);
  inspectTile(s, 8, 15);
  measure(s);
  assert.deepEqual(s, snapshot);
});
test("routed school attendance is finite and actual service workers limit enrollment", () => {
  const s = flat();
  put(s, "residential", 8, 15, { occupancy: 24 });
  put(s, "school", 7, 15);
  put(s, "commercial", 9, 15, { occupancy: 12 });
  initialize(s);
  advanceMonth(s);
  assert.ok(s.households.ledger.enrolledChildren > 0);
  assert.ok(s.households.ledger.enrolledChildren <= 60);
  assert.ok(measure(s).jobFill[at(7, 15)] > 0);
});
test("a nearby station cannot extinguish a remote fire by radius before a road vehicle arrives", () => {
  const s = flat();
  put(s, "residential", 7, 15, { occupancy: 24 });
  put(s, "fire", 6, 15);
  put(s, "industrial", 19, 15, { occupancy: 18, fire: 3 });
  initialize(s);
  advanceMonth(s);
  assert.ok(s.tiles[at(19, 15)].fire > 0);
  assert.ok(
    s.services.vehicles.some(
      (v) => v.kind === "fire" && v.status === "outbound",
    ),
  );
});
test("actual fire arrival prevents that months casualties and stored waste is preserved if a facility burns down", () => {
  const s = flat();
  put(s, "residential", 7, 15, { occupancy: 24 });
  put(s, "fire", 6, 15);
  put(s, "industrial", 9, 15, { occupancy: 18, fire: 1 });
  initialize(s);
  advanceMonth(s);
  assert.equal(s.tiles[at(9, 15)].fire, 0);
  assert.equal(s.tiles[at(9, 15)].type, "industrial");
  assert.equal(s.services.counters.extinguishedFires, 1);
  const b = flat();
  put(b, "landfill", 9, 15, { stored: 80, fire: 1 });
  initialize(b);
  advanceMonth(b);
  assert.equal(b.tiles[at(9, 15)].type, "ruins");
  assert.equal(b.services.waste[at(9, 15)], 80);
  assert.ok(serviceReport(b).conservation.waste);
});
test("garbage remains in bins until actual road collection and demolition preserves old landfill material", () => {
  const s = flat();
  put(s, "residential", 25, 15, { occupancy: 24 });
  put(s, "landfill", 6, 15, { stored: 80 });
  initialize(s);
  advanceMonth(s);
  assert.ok(serviceReport(s).pendingWaste > 0);
  assert.equal(s.tiles[at(6, 15)].stored, 80);
  assert.equal(applyAction(s, { type: "bulldoze", x: 6, y: 15 }).ok, true);
  assert.equal(s.tiles[at(6, 15)].stored, 0);
  assert.equal(s.services.waste[at(6, 15)], 80);
  assert.ok(serviceReport(s).conservation.waste);
});
test("admitted patient and custody cases survive whole-core demolition without money or case duplication", () => {
  for (const [type, kind, field, queue] of [
    ["clinic", "medical", "beds", "patients"],
    ["police", "crime", "custody", "crimes"],
  ]) {
    const s = flat();
    put(s, "residential", 7, 15, { occupancy: 24 });
    put(s, type, 6, 15);
    initialize(s);
    assert.equal(
      applyAction(s, { type: "serviceIncident", kind, x: 9, y: 15, amount: 6 })
        .ok,
      true,
    );
    advanceMonth(s);
    const admitted = s.services[field][at(6, 15)];
    assert.ok(admitted > 0);
    const cash = s.cash;
    assert.equal(applyAction(s, { type: "bulldoze", x: 6, y: 15 }).ok, true);
    assert.equal(s.cash, cash - 2500);
    assert.equal(s.services[field][at(6, 15)], 0);
    assert.equal(s.services[queue][at(6, 15)], admitted);
    assert.ok(Object.values(serviceReport(s).conservation).every(Boolean));
  }
});
test("legacy1 and legacy2 migration retain old fields and add only declared new demographic and service baselines", () => {
  for (const version of [1, 2]) {
    const s = createCity();
    advanceMonth(s);
    s.backlogs.waste = 300;
    s.tiles.find((t) => t.type === "landfill").stored = 120;
    const old = legacy(s, version);
    old.taxes.residential = 7;
    const a = parseCity(JSON.stringify(old));
    assert.equal(a.version, 3);
    for (const key of Object.keys(old))
      if (key !== "version") assert.deepEqual(a[key], old[key]);
    assert.deepEqual(a.households.wealthTaxes.residential, [7, 7, 7]);
    assert.equal(a.households.lastMonth, old.month);
    assert.equal(a.services.lastMonth, old.month - 1);
    assert.equal(a.services.counters.legacyWaste, 300);
    assert.equal(a.services.counters.initialStoredWaste, 120);
    assert.equal(validateHouseholds(a.households, a), true);
    assert.equal(validateServices(a.services, a), true);
  }
});
test("schema3 rejects partial new subsystems, malformed cross-tile cohorts, material identities and unsupported versions", () => {
  const s = createCity();
  for (const change of [
    (a) => delete a.households,
    (a) => delete a.services,
    (a) => a.households.lastMonth++,
    (a) => a.services.lastMonth--,
    (a) => a.households.homes.find(Boolean).adults++,
    (a) => a.services.waste[0]++,
    (a) => (a.version = 4),
    (a) => {
      a.version = 2;
      delete a.services;
    },
  ]) {
    const a = structuredClone(s);
    change(a);
    assert.throws(() => parseCity(JSON.stringify(a)));
  }
});
test("new state roundtrip preserves deterministic future and every city in legacy regional wrapper migrates independently", () => {
  const s = createCity();
  advanceMonth(s);
  const a = parseCity(serializeCity(s));
  assert.deepEqual(a, s);
  advanceMonth(a);
  advanceMonth(s);
  assert.deepEqual(a, s);
  const r = createRegion();
  advanceRegion(r);
  for (const c of r.cities) c.state = legacy(c.state);
  const old = structuredClone(r),
    region = parseRegion(JSON.stringify(r));
  for (let n = 0; n < 3; n++) {
    assert.equal(region.cities[n].state.version, 3);
    assert.deepEqual(
      region.cities[n].state.inventory,
      old.cities[n].state.inventory,
    );
    assert.equal(region.cities[n].state.rng, old.cities[n].state.rng);
  }
  assert.deepEqual(parseRegion(serializeRegion(region)), region);
});
test("near-bound service failure preserves the entire city and whole region including earlier shipment deliveries", () => {
  const s = flat();
  put(s, "residential", 7, 15, { occupancy: 24 });
  initialize(s);
  s.services.waste[at(7, 15)] = 1e12;
  s.services.counters.generatedWaste = 1e12;
  const before = structuredClone(s);
  assert.throws(() => advanceMonth(s));
  assert.deepEqual(s, before);
  const r = createRegion();
  r.cities[0].state.inventory.ore = 30;
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 20,
    }).ok,
    true,
  );
  const target = r.cities[1].state,
    home = target.tiles.findIndex((t) => t.type === "residential");
  target.services.waste[home] = 1e12;
  target.services.counters.generatedWaste = 1e12;
  const original = structuredClone(r);
  assert.throws(() => advanceRegion(r));
  assert.deepEqual(r, original);
});

test("demolition immediately updates bounded legacy waste summary and schema3 rejects a forged summary", () => {
  const s = flat();
  put(s, "landfill", 7, 15, { stored: 80 });
  initialize(s);
  assert.equal(applyAction(s, { type: "bulldoze", x: 7, y: 15 }).ok, true);
  assert.equal(s.backlogs.waste, 80);
  assert.doesNotThrow(() => serializeCity(s));
  const bad = structuredClone(s);
  bad.backlogs.waste = 0;
  assert.throws(() => parseCity(JSON.stringify(bad)));
});
test("destructive disasters preserve stored material and departed household wallets without minting money", () => {
  const s = flat();
  for (const t of s.tiles)
    if (t.type !== "road")
      Object.assign(t, { type: "empty", stored: 0, occupancy: 0 });
  put(s, "landfill", 7, 15, { stored: 90 });
  initialize(s);
  const cash = s.cash;
  assert.equal(applyAction(s, { type: "disaster", kind: "meteor" }).ok, true);
  assert.equal(s.tiles[at(7, 15)].type, "ruins");
  assert.equal(s.services.waste[at(7, 15)], 90);
  assert.equal(s.cash, cash);
  assert.ok(serviceReport(s).conservation.waste);
  assert.doesNotThrow(() => serializeCity(s));
});
test("municipal history books collection-class taxes when a home promotes after actual purchases and school attendance", () => {
  const s = flat();
  put(s, "residential", 8, 15, { occupancy: 24 });
  put(s, "residential", 12, 15, { occupancy: 96, level: 3 });
  put(s, "school", 7, 15);
  put(s, "commercial", 9, 15, { occupancy: 12 });
  put(s, "park", 8, 17);
  initialize(s);
  const h = s.households.homes[at(8, 15)];
  wallet(s, at(8, 15), 3000000);
  h.educated = h.adults;
  h.goodMonths = 5;
  s.households.wealthTaxes.residential = [4, 15, 20];
  advanceMonth(s);
  assert.equal(s.households.homes[at(8, 15)].wealth, 1);
  const l = s.households.ledger,
    booked = l.residentialTaxes + l.commercialTaxes + l.industrialTaxes;
  assert.equal(s.history.at(-1).income, booked);
  assert.ok(
    measure(s).households.taxes.forecast.residential > l.residentialTaxes,
  );
});
function arrearsFixture(count = 16) {
  const s = flat();
  for (let i = 0; i < count; i++) {
    const x = (i % 32) + 3,
      y = i < 32 ? 15 : 17;
    if (s.tiles[at(x, y)].type !== "empty") continue;
    put(s, "residential", x, y, { occupancy: 24 });
  }
  initialize(s);
  for (const h of s.households.homes)
    if (h) {
      h.cash = 1e9;
      h.arrears = 1e9;
    }
  const sum = s.households.homes.filter(Boolean).length * 1e9;
  s.households.ledger.immigration = sum;
  s.households.ledger.closingCash = sum;
  s.households.ledger.taxDue = sum;
  s.households.ledger.closingArrears = sum;
  return s;
}
test("large actual arrears receipts remain exactly bookable saveable and distinct from hypothetical tax due", () => {
  const s = arrearsFixture();
  assert.doesNotThrow(() => serializeCity(s));
  const cash = s.cash;
  advanceMonth(s);
  assert.ok(s.history.at(-1).income > 1e10);
  assert.equal(s.cash - cash, s.history.at(-1).net);
  assert.equal(s.history.at(-1).income, s.households.ledger.residentialTaxes);
  assert.doesNotThrow(() => serializeCity(s));
});
test("a valid large private arrears collection cannot overflow treasury after mutating the live month", () => {
  const s = arrearsFixture(50);
  s.cash = 990000000000;
  assert.doesNotThrow(() => serializeCity(s));
  const before = structuredClone(s);
  assert.throws(() => advanceMonth(s), /treasury|limit/i);
  assert.deepEqual(s, before);
});
test("rare accepted household pending-accounting bounds cannot make a successful demolition unsaveable", () => {
  const s = createCity();
  s.households.pending.immigration = 2000000000000000;
  s.households.pending.emigration = 2000000000000000;
  assert.doesNotThrow(() => serializeCity(s));
  const home = s.tiles.findIndex((t) => t.type === "residential");
  const before = structuredClone(s);
  assert.equal(
    applyAction(s, { type: "bulldoze", x: home % 40, y: Math.floor(home / 40) })
      .ok,
    false,
  );
  assert.deepEqual(s, before);
});

test("closed and burning road flags invalidate physical access and wages rather than leaving cached ghost routes", () => {
  for (const [tile, field, value] of [
    [640, "enabled", false],
    [640, "fire", 2],
    [at(10, 16), "enabled", false],
    [at(10, 16), "fire", 2],
  ]) {
    const s = flat();
    put(s, "residential", 12, 15, { occupancy: 24 });
    put(s, "industrial", 14, 15, { occupancy: 18 });
    initialize(s);
    assert.ok(measure(s).employed > 0);
    s.tiles[tile][field] = value;
    const m = measure(s);
    assert.equal(m.access[at(12, 15)], false);
    assert.equal(m.employed, 0);
    assert.equal(m.homeEmployment[at(12, 15)], 0);
    advanceMonth(s);
    assert.equal(s.households.ledger.wages, 0);
  }
});
test("an accepted closed gateway can reopen through a road action and restores actual service access", () => {
  const initial = createCity();
  initial.tiles[640].enabled = false;
  const s = parseCity(JSON.stringify(initial));
  assert.equal(measure(s).access[640], false);
  assert.equal(applyAction(s, { type: "toggle", x: 0, y: 16 }).ok, true);
  assert.equal(s.tiles[640].enabled, true);
  assert.ok(measure(s).employed > 0);
  assert.doesNotThrow(() => serializeCity(s));
});
test("burnout of a protected gateway preserves its legal road type and permits a saveable recovered connection", () => {
  const initial = createCity();
  initial.tiles[640].fire = 1;
  const s = parseCity(JSON.stringify(initial));
  assert.equal(measure(s).access[640], false);
  advanceMonth(s);
  assert.ok(["road", "avenue"].includes(s.tiles[640].type));
  assert.equal(s.tiles[640].fire, 0);
  assert.equal(measure(s).access[640], true);
  assert.doesNotThrow(() => serializeCity(s));
});
test("a closed gateway prevents new regional commitments while already reserved shipments remain conserved", () => {
  const r = createRegion();
  r.cities[0].state.inventory.ore = 40;
  r.cities[0].state.tiles[640].enabled = false;
  const before = structuredClone(r);
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 20,
    }).ok,
    false,
  );
  assert.deepEqual(r, before);
  assert.equal(
    regionAction(r, {
      type: "contribute",
      from: 0,
      resource: "goods",
      amount: 20,
    }).ok,
    false,
  );
  assert.deepEqual(r, before);
});
