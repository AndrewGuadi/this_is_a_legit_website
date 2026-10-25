import test from "node:test";
import assert from "node:assert/strict";
import {
  createCommerce,
  validateCommerce,
  advanceCommerce,
  commerceReport,
  commerceRetailStock,
  consumeRetail,
  transferWarehouse,
  preserveCommerceDemolition,
  commerceAction,
} from "../../static/cmd-city/commerce.mjs";
const W = 40,
  H = 32,
  N = W * H,
  ix = (x, y) => y * W + x;
function fixture({ goods = 100, producer = false, shopWorkers = 4 } = {}) {
  const city = {
    width: W,
    height: H,
    month: 0,
    cash: 123400,
    inventory: { goods },
    tiles: Array.from({ length: N }, () => ({
      type: "empty",
      enabled: true,
      fire: 0,
      occupancy: 0,
      modules: 0,
      level: 1,
    })),
  };
  for (let x = 0; x < 39; x++) city.tiles[ix(x, 16)].type = "road";
  city.tiles[ix(20, 15)].type = "commercial";
  if (producer) city.tiles[ix(1, 15)].type = "industrial";
  const metrics = {
    operationAccess: Array(N).fill(true),
    jobFill: Array(N).fill(0),
    roadLoad: Array(N).fill(0),
    utilities: { power: { ratio: 1 }, water: { ratio: 1 } },
  };
  metrics.jobFill[ix(20, 15)] = shopWorkers;
  if (producer) metrics.jobFill[ix(1, 15)] = 10;
  city.commerce = createCommerce(city);
  return { city, metrics };
}
function month(city, metrics) {
  const r = advanceCommerce(city, metrics);
  city.month++;
  assert.equal(validateCommerce(city.commerce, city), true);
  return r;
}
function seed(city, field, index, amount) {
  city.commerce[field][index] += amount;
  city.commerce.counters.produced += amount;
}

test("creation preserves warehouse ownership without duplicating stock or inventing opening deliveries", () => {
  const { city } = fixture(),
    before = structuredClone(city);
  const s = createCommerce(city);
  assert.equal(s.counters.openingGoods, 100);
  assert.equal(
    s.retailStock.reduce((a, b) => a + b, 0),
    0,
  );
  assert.equal(
    s.producerStock.reduce((a, b) => a + b, 0),
    0,
  );
  assert.equal(s.vehicles.length, 0);
  assert.deepEqual(city, before);
  assert.equal(validateCommerce(s, city), true);
});
test("actual staffed industrial production enters producer stock once; repeated hook is inert", () => {
  const { city, metrics } = fixture({ goods: 0, producer: true });
  metrics.jobFill[ix(20, 15)] = 0;
  advanceCommerce(city, metrics);
  assert.equal(city.commerce.producerStock[ix(1, 15)], 8);
  assert.equal(city.inventory.goods, 0);
  assert.equal(city.commerce.counters.produced, 8);
  const before = structuredClone(city);
  assert.equal(advanceCommerce(city, metrics).changed, false);
  assert.deepEqual(city, before);
});
test("closed, burning, unstaffed, unserved and unpowered producers generate no goods", () => {
  for (const change of [
    (c, m) => (c.tiles[ix(1, 15)].enabled = false),
    (c, m) => (c.tiles[ix(1, 15)].fire = 1),
    (c, m) => (m.jobFill[ix(1, 15)] = 0),
    (c, m) => (m.operationAccess[ix(1, 15)] = false),
    (c, m) => (m.utilities.power.ratio = 0.5),
  ]) {
    const { city, metrics } = fixture({ goods: 0, producer: true });
    change(city, metrics);
    month(city, metrics);
    assert.equal(city.commerce.counters.produced, 0);
  }
});
test("warehouse cargo travels a real bounded path before a shop receives inventory", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  assert.equal(city.commerce.retailStock[ix(20, 15)], 0);
  assert.ok(
    city.commerce.vehicles.some(
      (v) => v.payload > 0 && v.position !== ix(20, 16),
    ),
  );
  assert.ok(city.inventory.goods < 100);
  month(city, metrics);
  assert.ok(commerceRetailStock(city, ix(20, 15)) > 0);
  assert.equal(commerceReport(city).conservation, true);
});
test("shared shop unloading is finite and goods remain aboard during partial deliveries", () => {
  const { city, metrics } = fixture({ goods: 200, shopWorkers: 20 });
  month(city, metrics);
  month(city, metrics);
  assert.equal(city.commerce.retailStock[ix(20, 15)], 80);
  assert.equal(
    city.commerce.vehicles.reduce((n, v) => n + v.payload, 0),
    80,
  );
  assert.equal(commerceReport(city).conservation, true);
});
test("purchases consume only physically delivered shop stock and do not debit warehouse again", () => {
  const { city, metrics } = fixture();
  for (let n = 0; n < 3; n++) month(city, metrics);
  const warehouse = city.inventory.goods,
    stock = commerceRetailStock(city, ix(20, 15)),
    cash = city.cash;
  assert.ok(stock > 0);
  assert.equal(consumeRetail(city, ix(20, 15), stock + 10), stock);
  assert.equal(commerceRetailStock(city, ix(20, 15)), 0);
  assert.equal(city.inventory.goods, warehouse);
  assert.equal(city.cash, cash);
  assert.equal(city.commerce.counters.consumed, stock);
  assert.equal(commerceReport(city).conservation, true);
});
test("blocked roads hold real cargo and repairs restore its delivery", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  city.tiles[ix(18, 16)].type = "empty";
  const cargo = city.commerce.vehicles.reduce((n, v) => n + v.payload, 0);
  for (let n = 0; n < 3; n++) month(city, metrics);
  assert.equal(commerceRetailStock(city, ix(20, 15)), 0);
  assert.equal(
    city.commerce.vehicles.reduce((n, v) => n + v.payload, 0),
    cargo,
  );
  city.tiles[ix(18, 16)].type = "road";
  for (let n = 0; n < 3; n++) month(city, metrics);
  assert.ok(commerceRetailStock(city, ix(20, 15)) > 0);
  assert.equal(commerceReport(city).conservation, true);
});
test("closing a destination returns its cargo over roads instead of teleporting or losing it", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  city.tiles[ix(20, 15)].enabled = false;
  const before = city.inventory.goods;
  assert.ok(before < 100);
  month(city, metrics);
  assert.equal(city.inventory.goods, 100);
  assert.equal(commerceRetailStock(city, ix(20, 15)), 0);
  assert.ok(city.commerce.counters.returned > 0);
  assert.equal(commerceReport(city).conservation, true);
});
test("freight shares remaining road capacity with commuters and other freight", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(80);
  month(city, metrics);
  assert.ok(city.commerce.vehicles.some((v) => v.payload > 0));
  assert.ok(city.commerce.vehicles.every((v) => v.position === ix(0, 16)));
  assert.ok(city.commerce.roadLoad.every((n) => n === 0));
  metrics.roadLoad.fill(79);
  month(city, metrics);
  assert.ok(city.commerce.roadLoad.some((n) => n === 1));
  assert.ok(city.commerce.roadLoad.every((n) => n <= 1));
  assert.equal(commerceReport(city).conservation, true);
});
test("zero utilities or a closed gateway cannot dispatch warehouse freight", () => {
  for (const change of [
    (c, m) => (m.utilities.water.ratio = 0),
    (c, m) => (c.tiles[ix(0, 16)].enabled = false),
  ]) {
    const { city, metrics } = fixture();
    change(city, metrics);
    month(city, metrics);
    assert.equal(city.commerce.vehicles.length, 0);
    assert.equal(city.inventory.goods, 100);
  }
});
test("external warehouse transfer records only actual bounded stock and preserves money", () => {
  const { city } = fixture({ goods: 999990 }),
    cash = city.cash;
  assert.equal(transferWarehouse(city, 20), 10);
  assert.equal(city.inventory.goods, 1000000);
  assert.equal(transferWarehouse(city, -1000001), -1000000);
  assert.equal(city.inventory.goods, 0);
  assert.equal(city.commerce.counters.externalIn, 10);
  assert.equal(city.commerce.counters.externalOut, 1000000);
  assert.equal(city.cash, cash);
  assert.equal(commerceReport(city).conservation, true);
});
test("demolition conserves producer and retail stock into explicit recovered goods", () => {
  const { city } = fixture({ producer: true });
  seed(city, "producerStock", ix(1, 15), 55);
  seed(city, "retailStock", ix(20, 15), 20);
  assert.equal(preserveCommerceDemolition(city, ix(1, 15)).ok, true);
  assert.equal(preserveCommerceDemolition(city, ix(20, 15)).ok, true);
  city.tiles[ix(1, 15)].type = city.tiles[ix(20, 15)].type = "empty";
  assert.equal(city.commerce.looseGoods, 75);
  assert.equal(city.commerce.counters.salvaged, 75);
  assert.equal(validateCommerce(city.commerce, city), true);
  assert.equal(commerceReport(city).conservation, true);
});
test("recall retains cargo and rejects malformed or missing vehicle actions without state changes", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  const v = city.commerce.vehicles[0];
  assert.ok(v);
  for (const action of [
    { type: "recallFreight", id: 99999 },
    { type: "recallFreight", id: v.id, extra: 1 },
  ]) {
    const before = structuredClone(city);
    assert.equal(commerceAction(city, action).ok, false);
    assert.deepEqual(city, before);
  }
  const payload = v.payload;
  assert.equal(
    commerceAction(city, { type: "recallFreight", id: v.id }).ok,
    true,
  );
  assert.equal(city.commerce.vehicles[0].payload, payload);
  assert.equal(city.commerce.vehicles[0].status, "returning");
  month(city, metrics);
  assert.equal(commerceReport(city).conservation, true);
});
test("a tower shop uses explicitly supplied staffed monthly retail throughput", () => {
  const { city, metrics } = fixture();
  city.tiles[ix(20, 15)].type = "tower";
  metrics.jobFill[ix(20, 15)] = 0;
  metrics.retailCapacityByTile = Array(N).fill(0);
  metrics.retailCapacityByTile[ix(20, 15)] = 10;
  month(city, metrics);
  month(city, metrics);
  assert.equal(commerceRetailStock(city, ix(20, 15)), 10);
  assert.equal(commerceReport(city).conservation, true);
});
test("reporting is pure and returns defensive paths and stock/load arrays", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  const before = structuredClone(city),
    report = commerceReport(city);
  report.retailStock.fill(9999);
  report.roadLoad.fill(9999);
  if (report.vehicles[0]) report.vehicles[0].path.push(9999);
  assert.deepEqual(city, before);
});
test("strict validation rejects malformed keys, clocks, stocks, quantities and broken conservation", () => {
  const { city } = fixture({ producer: true });
  for (const change of [
    (s) => (s.extra = 1),
    (s) => (s.lastMonth = 2),
    (s) => (s.producerStock = []),
    (s) => (s.retailStock[0] = 1),
    (s) => (s.looseGoods = -1),
    (s) => s.counters.produced++,
    (s) => (s.roadLoad[0] = Infinity),
    (s) => (s.nextId = 0),
  ]) {
    const state = structuredClone(city.commerce);
    change(state);
    assert.throws(() => validateCommerce(state, city));
  }
});
test("strict validation rejects malformed in-flight route/cursor/id/payload relationships", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  assert.ok(city.commerce.vehicles.length > 0);
  for (const change of [
    (s) => (s.vehicles[0].payload = -1),
    (s) => (s.vehicles[0].cursor = 9999),
    (s) => (s.vehicles[0].path = [0, 10]),
    (s) => s.vehicles.push(structuredClone(s.vehicles[0])),
    (s) => (s.vehicles[0].destination = 0),
    (s) => (s.vehicles[0].source = "fake"),
  ]) {
    const state = structuredClone(city.commerce);
    change(state);
    assert.throws(() => validateCommerce(state, city));
  }
});
test("counter overflow refuses monthly production atomically", () => {
  const { city, metrics } = fixture({ goods: 0, producer: true });
  city.commerce.counters.produced = 1e15;
  city.commerce.counters.consumed = 1e15;
  assert.equal(validateCommerce(city.commerce, city), true);
  const before = structuredClone(city);
  assert.throws(() => advanceCommerce(city, metrics));
  assert.deepEqual(city, before);
});
test("destroying the road under a loaded recalled truck preserves its position and cargo until repair", () => {
  const { city, metrics } = fixture();
  month(city, metrics);
  const vehicle = city.commerce.vehicles[0],
    position = vehicle.position,
    payload = vehicle.payload;
  assert.equal(
    commerceAction(city, { type: "recallFreight", id: vehicle.id }).ok,
    true,
  );
  city.tiles[position].type = "empty";
  month(city, metrics);
  const waiting = city.commerce.vehicles.find((v) => v.id === vehicle.id);
  assert.ok(waiting);
  assert.equal(waiting.position, position);
  assert.equal(waiting.payload, payload);
  assert.equal(waiting.path.length, 0);
  assert.equal(commerceReport(city).conservation, true);
  city.tiles[position].type = "road";
  month(city, metrics);
  assert.ok(city.commerce.counters.returned >= payload);
  assert.ok(!city.commerce.vehicles.some((v) => v.id === vehicle.id));
  assert.equal(commerceReport(city).conservation, true);
});
test("rotating shop admission eventually serves every shop under a finite shared fleet", () => {
  const { city, metrics } = fixture({ goods: 10000 });
  city.tiles[ix(20, 15)].type = "empty";
  metrics.jobFill.fill(0);
  const shops = [];
  for (let x = 1; x <= 32; x++) {
    const i = ix(x, 15);
    shops.push(i);
    city.tiles[i].type = "commercial";
    metrics.jobFill[i] = 1;
  }
  city.commerce = createCommerce(city);
  const served = new Set();
  for (let n = 0; n < 96; n++) {
    month(city, metrics);
    assert.ok(city.commerce.vehicles.length <= 32);
    for (const i of shops) {
      const got = consumeRetail(city, i, 100);
      if (got) served.add(i);
    }
    assert.equal(commerceReport(city).conservation, true);
  }
  assert.equal(served.size, shops.length);
  assert.ok(city.commerce.counters.completedTrips > 0);
});
test("producer stock bounds preserve actual accepted production without wrapping or losing prior goods", () => {
  const { city, metrics } = fixture({ goods: 0, producer: true });
  metrics.jobFill[ix(20, 15)] = 0;
  seed(city, "producerStock", ix(1, 15), 999999);
  month(city, metrics);
  assert.equal(city.commerce.producerStock[ix(1, 15)], 1000000);
  assert.equal(city.commerce.counters.produced, 1000000);
  assert.equal(commerceReport(city).conservation, true);
});
test("a demolished producer and full warehouse recover returned cargo into explicit loose goods", () => {
  const { city, metrics } = fixture({ goods: 1000000, producer: true });
  month(city, metrics);
  const fromProducer = city.commerce.vehicles.find(
    (v) => v.source === "producer",
  );
  assert.ok(fromProducer);
  assert.equal(
    commerceAction(city, { type: "recallFreight", id: fromProducer.id }).ok,
    true,
  );
  assert.equal(preserveCommerceDemolition(city, ix(1, 15)).ok, true);
  city.tiles[ix(1, 15)].type = "empty";
  metrics.jobFill[ix(1, 15)] = 0;
  city.tiles[ix(20, 15)].enabled = false;
  for (let n = 0; n < 5; n++) month(city, metrics);
  assert.equal(city.inventory.goods, 1000000);
  assert.ok(city.commerce.looseGoods > 0);
  assert.equal(commerceReport(city).conservation, true);
});
test("a mixed road and avenue crossing uses each endpoint remaining capacity rather than mixing unrelated maxima", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(79);
  city.tiles[ix(1, 16)].type = "avenue";
  metrics.roadLoad[ix(1, 16)] = 239;
  month(city, metrics);
  assert.ok(city.commerce.vehicles.some((v) => v.position > ix(0, 16)));
  assert.ok(city.commerce.roadLoad.every((n) => n <= 1));
  assert.equal(commerceReport(city).conservation, true);
});
test("independent producer and warehouse fleets cannot exceed the shared 32 vehicle bound", () => {
  const { city, metrics } = fixture({ goods: 10000 });
  city.tiles[ix(20, 15)].type = "empty";
  metrics.jobFill.fill(0);
  for (let x = 1; x <= 31; x++) {
    city.tiles[ix(x, 15)].type = "industrial";
    metrics.jobFill[ix(x, 15)] = 10;
    city.tiles[ix(x, 17)].type = "commercial";
    metrics.jobFill[ix(x, 17)] = 10;
  }
  city.commerce = createCommerce(city);
  month(city, metrics);
  assert.equal(city.commerce.vehicles.length, 32);
  assert.ok(city.commerce.vehicles.every((v) => v.payload <= 100));
  assert.equal(commerceReport(city).conservation, true);
});
test("scalar consumption and external transfer overflows preserve both affected stock and counter", () => {
  const { city } = fixture();
  city.commerce.retailStock[ix(20, 15)] = 1;
  city.inventory.goods = 99;
  city.commerce.counters.produced = 1e15;
  city.commerce.counters.consumed = 1e15;
  assert.equal(validateCommerce(city.commerce, city), true);
  const before = structuredClone(city);
  assert.throws(() => consumeRetail(city, ix(20, 15), 1));
  assert.deepEqual(city, before);
  city.commerce.counters.externalIn = 1e15;
  city.commerce.counters.externalOut = 1e15;
  assert.equal(validateCommerce(city.commerce, city), true);
  const externalBefore = structuredClone(city);
  assert.throws(() => transferWarehouse(city, 1));
  assert.deepEqual(city, externalBefore);
});
test("malformed observation rejects monthly work before any warehouse or commerce mutation", () => {
  const { city, metrics } = fixture({ producer: true });
  for (const change of [
    (m) => (m.jobFill = []),
    (m) => (m.roadLoad[0] = NaN),
    (m) => (m.retailCapacityByTile = [-1]),
    (m) => (m.utilities.power.ratio = Infinity),
  ]) {
    const m = structuredClone(metrics);
    change(m);
    const before = structuredClone(city);
    assert.throws(() => advanceCommerce(city, m));
    assert.deepEqual(city, before);
  }
});
