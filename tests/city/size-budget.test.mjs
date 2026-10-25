import { createFuture } from "../../static/cmd-city/future.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  applyAction,
  advanceMonth,
} from "../../static/cmd-city/core.mjs";
import { createHouseholds } from "../../static/cmd-city/households.mjs";
import { createServices } from "../../static/cmd-city/services.mjs";
import {
  parseCity,
  serializeCity,
  cityForExport,
} from "../../static/cmd-city/save.mjs";
import * as regions from "../../static/cmd-city/region.mjs";
const CITY_MAX = 1048576,
  REGION_MAX = 3 * CITY_MAX,
  bytes = (s) =>
    Buffer.byteLength(
      JSON.stringify(s.cities ? regions.regionForExport(s) : cityForExport(s)),
    );
function cityNearLimit(headroom = 16, trading = false) {
  const s = createCity({ starter: false });
  s.cash = 900000000000;
  s.research.completed = ["cleanEnergy", "vertical"];
  for (let i = 0; i < 1280; i++)
    Object.assign(s.tiles[i], {
      terrain: "land",
      type: i === 640 ? "road" : "tower",
      level: 3,
      occupancy: i === 640 ? 0 : 780,
      modules: 3,
      stored: 30000,
      resource: "coal",
      reserve: 1000000,
      enabled: false,
    });
  s.tiles[640].enabled = true;
  s.environment.air.fill(1000);
  s.environment.ground.fill(1000);
  s.environment.radiation.fill(1000);
  if (trading)
    for (const [i, type] of [
      [600, "trade"],
      [641, "wind"],
      [680, "water"],
    ]) {
      Object.assign(s.tiles[i], { type, occupancy: 0, enabled: true });
      s.environment.radiation[i] = 0;
    }
  s.inventory.ore = 20;
  s.future = createFuture(s);
  s.households = createHouseholds(s);
  let cash = 0,
    arrears = 0;
  for (const h of s.households.homes)
    if (h) {
      Object.assign(h, {
        cash: 1e9,
        arrears: 1e9,
        educated: 100,
        trainees: 100,
        study: 11,
        goodMonths: 5,
        badMonths: 2,
        employed: h.adults,
        shoppingWanted: 1000000,
        shoppingBought: 1000000,
        unmet: 0,
        enrolledChildren: h.children,
        enrolledAdults: h.adults,
        wages: 1e9,
        taxes: 1e9,
        spending: 1e9,
      });
      cash += h.cash;
      arrears += h.arrears;
    }
  Object.assign(s.households.ledger, {
    immigration: cash,
    closingCash: cash,
    openingArrears: arrears,
    closingArrears: arrears,
  });
  s.households.shoppingLoad.fill(1000000);
  s.services = createServices(s);
  for (const key of ["waste", "patients", "crimes", "beds", "custody"])
    s.services[key].fill(100000000000);
  Object.assign(s.services.counters, {
    generatedWaste: 128000000000000,
    createdPatients: 256000000000000,
    createdCrimes: 256000000000000,
  });
  s.backlogs.waste = 1000000;
  const path = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 40; x++) path.push(y * 40 + (y % 2 ? 39 - x : x));
  for (let i = 0; i < 64; i++) {
    s.services.vehicles.push({
      id: i + 1,
      kind: "garbage",
      home: 640,
      position: 0,
      status: "returning",
      path: path.slice(),
      cursor: 0,
      payload: 0,
      capacity: 2000,
      taskId: 65 + i,
      destination: path.at(-1),
    });
    s.services.tasks.push({
      id: 65 + i,
      kind: "garbage",
      target: i,
      status: "returning",
      vehicleId: i + 1,
    });
  }
  for (let i = 0; i < 64; i++)
    s.services.tasks.push({
      id: 129 + i,
      kind: "garbage",
      target: 64 + i,
      status: "queued",
      vehicleId: null,
    });
  s.services.nextId = 193;
  let low = 1,
    high = path.length,
    best = 0;
  while (low <= high) {
    const m = Math.floor((low + high) / 2);
    for (const v of s.services.vehicles) {
      v.path = path.slice(0, m);
      v.destination = v.path.at(-1);
    }
    if (bytes(s) <= CITY_MAX - headroom) {
      best = m;
      low = m + 1;
    } else high = m - 1;
  }
  for (const v of s.services.vehicles) {
    v.path = path.slice(0, best);
    v.destination = v.path.at(-1);
  }
  const padding = CITY_MAX - headroom - bytes(s) - 2;
  if (padding >= 0) s.events = ["X".repeat(padding)];
  assert.ok(bytes(s) <= CITY_MAX - headroom);
  return parseCity(JSON.stringify(cityForExport(s)));
}
function regionNearLimit() {
  const r = regions.createRegion();
  for (const c of r.cities) c.state = cityNearLimit(23000, true);
  const target = REGION_MAX - 16;
  while (bytes(r) < target && r.events.length < 24) {
    const room = target - bytes(r) - 2 - (r.events.length ? 1 : 0);
    if (room <= 0) break;
    const controls = Math.min(500, Math.floor(room / 6)),
      ascii = Math.min(500 - controls, room - controls * 6);
    r.events.push("\u0001".repeat(controls) + "X".repeat(ascii));
  }
  assert.equal(bytes(r), target);
  assert.ok(r.events.length < 24);
  return regions.parseRegion(JSON.stringify(regions.regionForExport(r)));
}
function activeCityAction(r, a) {
  // Reproduce the pre-boundary UI flow until the dedicated transaction exists.
  return regions.regionCityAction
    ? regions.regionCityAction(r, a)
    : applyAction(r.cities[r.active].state, a);
}
function failUnchanged(s, fn) {
  const before = structuredClone(s);
  const result = fn();
  assert.equal(result.ok, false);
  assert.deepEqual(s, before);
  return result;
}

test("an accepted near-limit city rejects an ASCII or escaped rename without losing exportability", () => {
  for (const name of ["A".repeat(80), "\u0001".repeat(80), "😀".repeat(40)]) {
    const s = cityNearLimit();
    assert.ok(bytes(s) <= CITY_MAX);
    failUnchanged(s, () => applyAction(s, { type: "rename", value: name }));
    assert.doesNotThrow(() => serializeCity(s));
  }
});
test("ordinary byte-safe actions preserve city identity and remain exactly exportable", () => {
  const s = createCity(),
    identity = s;
  assert.equal(
    applyAction(s, { type: "rename", value: "A saved city" }).ok,
    true,
  );
  assert.equal(s, identity);
  assert.deepEqual(parseCity(serializeCity(s)), s);
});
test("a city month either remains exportable or rejects with every source field preserved", () => {
  const s = cityNearLimit(),
    before = structuredClone(s);
  try {
    advanceMonth(s);
    assert.doesNotThrow(() => serializeCity(s));
  } catch (error) {
    assert.deepEqual(s, before);
    assert.match(error.message, /limit|save|accounting/i);
  }
});
test("a city action cannot cross the region wrapper budget even when its individual city still fits", () => {
  const r = regionNearLimit(),
    states = r.cities.map((c) => c.state);
  failUnchanged(r, () =>
    activeCityAction(r, { type: "rename", value: "A".repeat(80) }),
  );
  for (let i = 0; i < 3; i++) assert.equal(r.cities[i].state, states[i]);
  assert.doesNotThrow(() => regions.serializeRegion(r));
});
for (const [type, fields] of [
  ["shipment", { from: 0, to: 1, resource: "ore", amount: 20 }],
  ["contribute", { from: 0, resource: "goods", amount: 20 }],
])
  test(`near-limit regional ${type} preserves stock cash shipments project and events on rejection`, () => {
    const r = regionNearLimit();
    failUnchanged(r, () => regions.regionAction(r, { type, ...fields }));
    assert.doesNotThrow(() => regions.serializeRegion(r));
  });
test("region switching and monthly advancement retain exportability or reject the whole region atomically", () => {
  const r = regionNearLimit();
  assert.equal(regions.regionAction(r, { type: "switch", index: 1 }).ok, true);
  assert.doesNotThrow(() => regions.serializeRegion(r));
  const before = structuredClone(r);
  try {
    regions.advanceRegion(r);
    assert.doesNotThrow(() => regions.serializeRegion(r));
  } catch (error) {
    assert.deepEqual(r, before);
    assert.match(error.message, /limit|save|accounting/i);
  }
});

test("legacy migration rejects near-limit states whose exact compact export cannot fit", () => {
  const old = cityNearLimit(16);
  old.version = 3;
  delete old.future;
  let delta = CITY_MAX - 16 - Buffer.byteLength(JSON.stringify(old));
  old.events[0] += "X".repeat(Math.max(0, delta));
  const text = JSON.stringify(old);
  assert.ok(Buffer.byteLength(text) <= CITY_MAX);
  assert.throws(() => parseCity(text), /1 MiB/);
});
test("a nondefault floor encoding cannot cross the city byte budget through a free floor toggle", () => {
  const s = cityNearLimit(),
    before = structuredClone(s);
  const result = applyAction(s, {
    type: "future",
    action: { type: "setFloorEnabled", index: 0, floor: 0, enabled: false },
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /limit|save/i);
  assert.deepEqual(s, before);
  assert.deepEqual(parseCity(serializeCity(s)), s);
});

test("legacy child cities that fit individually cannot exceed the region limit after migration", () => {
  const old = regionNearLimit();
  for (const c of old.cities) {
    c.state.version = 3;
    delete c.state.future;
  }
  let room = REGION_MAX - 16 - Buffer.byteLength(JSON.stringify(old));
  while (room > 2) {
    const controls = Math.min(500, Math.floor((room - 3) / 6)),
      ascii = Math.min(500 - controls, room - 3 - controls * 6);
    old.events.push("\u0001".repeat(controls) + "X".repeat(ascii));
    room = REGION_MAX - 16 - Buffer.byteLength(JSON.stringify(old));
  }
  assert.ok(old.events.length <= 24);
  assert.ok(Buffer.byteLength(JSON.stringify(old)) <= REGION_MAX);
  for (const c of old.cities)
    assert.doesNotThrow(() => parseCity(JSON.stringify(c.state)));
  assert.throws(() => regions.parseRegion(JSON.stringify(old)), /3 MiB/);
});
