import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegion,
  regionAction,
  advanceRegion,
  regionalBenefits,
  serializeRegion,
  parseRegion,
} from "../../static/cmd-city/region.mjs";

const clone = (value) => structuredClone(value);
const failUnchanged = (region, action) => {
  const before = clone(region);
  assert.equal(regionAction(region, action).ok, false);
  assert.deepEqual(region, before);
};
const reserve = (region, amount = 40) => {
  region.cities[0].state.inventory.ore = amount;
  const response = regionAction(region, {
    type: "shipment",
    from: 0,
    to: 1,
    resource: "ore",
    amount,
  });
  assert.equal(response.ok, true, response.message);
};

test("region creates three distinct deterministic independently seeded cities", () => {
  const a = createRegion({ seed: 42 }),
    b = createRegion({ seed: 42 });
  assert.deepEqual(a, b);
  assert.equal(a.cities.length, 3);
  assert.equal(new Set(a.cities.map((c) => c.id)).size, 3);
  assert.equal(new Set(a.cities.map((c) => c.state.seed)).size, 3);
  assert.equal(a.active, 0);
  assert.equal(a.month, 0);
  assert.ok(a.cities.every((c) => c.state.regionalPower === 0));
});
test("switching retains independent city state and invalid switches are transactional", () => {
  const r = createRegion();
  r.cities[0].state.name = "My first city";
  const first = clone(r.cities[0]);
  assert.equal(regionAction(r, { type: "switch", index: 1 }).ok, true);
  assert.equal(r.active, 1);
  assert.deepEqual(r.cities[0], first);
  failUnchanged(r, { type: "switch", index: 3 });
  failUnchanged(r, { type: "switch", index: 0.5 });
});
test("shipment reserves stock and freight exactly once without immediate receiver gain", () => {
  const r = createRegion();
  r.cities[0].state.inventory.ore = 100;
  const cash = r.cities[0].state.cash,
    receiver = r.cities[1].state.inventory.ore;
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 40,
    }).ok,
    true,
  );
  assert.equal(r.cities[0].state.inventory.ore, 60);
  assert.equal(r.cities[1].state.inventory.ore, receiver);
  assert.equal(r.cities[0].state.cash, cash - 8000);
  assert.equal(r.shipments.length, 1);
  assert.equal(r.shipments[0].arrivalMonth, 1);
  assert.equal(r.shipments[0].amount, 40);
});
test("next region month delivers stock once and advances all cities once", () => {
  const r = createRegion();
  const before = r.cities[1].state.inventory.ore;
  reserve(r, 40);
  const metrics = advanceRegion(r);
  assert.equal(r.month, 1);
  assert.ok(r.cities.every((c) => c.state.month === 1));
  assert.equal(r.cities[1].state.inventory.ore, before + 40);
  assert.equal(r.shipments.length, 0);
  assert.equal(typeof metrics.population, "number");
  advanceRegion(r);
  assert.equal(r.cities[1].state.inventory.ore, before + 40);
  assert.ok(r.cities.every((c) => c.state.month === 2));
});
test("stock in source, receiver and transit is conserved", () => {
  const r = createRegion();
  r.cities[0].state.inventory.ore = 100;
  const total = () =>
    r.cities.reduce((n, c) => n + c.state.inventory.ore, 0) +
    r.shipments
      .filter((s) => s.resource === "ore")
      .reduce((n, s) => n + s.amount, 0);
  const before = total();
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 30,
    }).ok,
    true,
  );
  assert.equal(total(), before);
  advanceRegion(r);
  assert.equal(total(), before);
});
test("receiver headroom is reserved across every pending shipment", () => {
  const r = createRegion();
  r.cities[0].state.inventory.ore = 100;
  r.cities[2].state.inventory.ore = 100;
  r.cities[1].state.inventory.ore = 999950;
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 40,
    }).ok,
    true,
  );
  failUnchanged(r, {
    type: "shipment",
    from: 2,
    to: 1,
    resource: "ore",
    amount: 11,
  });
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 2,
      to: 1,
      resource: "ore",
      amount: 10,
    }).ok,
    true,
  );
  advanceRegion(r);
  assert.equal(r.cities[1].state.inventory.ore, 1000000);
});
test("shipment rejects invalid quantities, stock, money, destinations and lookup names unchanged", () => {
  const r = createRegion();
  const base = { type: "shipment", from: 0, to: 1, resource: "ore", amount: 1 };
  for (const patch of [
    { amount: 0 },
    { amount: -1 },
    { amount: 0.5 },
    { amount: NaN },
    { amount: Infinity },
    { amount: 1000001 },
    { from: 4 },
    { to: 4 },
    { to: 0 },
    { resource: "constructor" },
    { resource: "__proto__" },
  ])
    failUnchanged(r, { ...base, ...patch });
  failUnchanged(r, base);
  r.cities[0].state.inventory.ore = 10;
  r.cities[0].state.cash = 0;
  failUnchanged(r, base);
});
test("both endpoints need connected, open and supplied trade infrastructure", () => {
  for (const endpoint of [0, 1])
    for (const invalid of ["closed", "fire", "disconnected", "power"]) {
      const r = createRegion();
      r.cities[0].state.inventory.ore = 10;
      const city = r.cities[endpoint].state;
      const depot = city.tiles.find((t) => t.type === "trade");
      if (invalid === "closed") depot.enabled = false;
      if (invalid === "fire") depot.fire = 1;
      if (invalid === "disconnected")
        for (const t of city.tiles)
          if (["road", "avenue", "bridge"].includes(t.type)) t.type = "empty";
      if (invalid === "power")
        for (const t of city.tiles) if (t.type === "wind") t.enabled = false;
      failUnchanged(r, {
        type: "shipment",
        from: 0,
        to: 1,
        resource: "ore",
        amount: 1,
      });
    }
});
test("pending shipment cap is enforced transactionally", () => {
  const r = createRegion();
  r.cities[0].state.inventory.ore = 100;
  for (let n = 0; n < 20; n++)
    assert.equal(
      regionAction(r, {
        type: "shipment",
        from: 0,
        to: 1,
        resource: "ore",
        amount: 1,
      }).ok,
      true,
    );
  failUnchanged(r, {
    type: "shipment",
    from: 0,
    to: 1,
    resource: "ore",
    amount: 1,
  });
});
test("project reserves actual goods/alloy, completes exactly once and grants fixed regional power", () => {
  const r = createRegion();
  assert.deepEqual(regionalBenefits(r), {
    renewablePowerPerCity: 0,
    active: false,
  });
  r.cities[0].state.inventory.goods = 1000;
  r.cities[1].state.inventory.alloy = 500;
  assert.equal(
    regionAction(r, {
      type: "contribute",
      from: 0,
      resource: "goods",
      amount: 1000,
    }).ok,
    true,
  );
  assert.equal(r.cities[0].state.inventory.goods, 0);
  assert.equal(r.project.complete, false);
  assert.equal(
    regionAction(r, {
      type: "contribute",
      from: 1,
      resource: "alloy",
      amount: 500,
    }).ok,
    true,
  );
  assert.deepEqual(regionalBenefits(r), {
    renewablePowerPerCity: 200,
    active: true,
  });
  assert.ok(r.cities.every((c) => c.state.regionalPower === 200));
  const after = clone(r);
  failUnchanged(r, {
    type: "contribute",
    from: 0,
    resource: "goods",
    amount: 1,
  });
  assert.deepEqual(r, after);
  const beforeCash = r.cities.map((c) => c.state.cash);
  regionalBenefits(r);
  regionalBenefits(r);
  assert.deepEqual(
    r.cities.map((c) => c.state.cash),
    beforeCash,
  );
});
test("project rejects over-contribution, wrong resources, missing stock and unavailable depots unchanged", () => {
  const r = createRegion();
  for (const patch of [
    { resource: "ore" },
    { amount: -1 },
    { amount: 1001 },
    { from: 9 },
    { resource: "constructor" },
  ])
    failUnchanged(r, {
      type: "contribute",
      from: 0,
      resource: "goods",
      amount: 1,
      ...patch,
    });
  failUnchanged(r, {
    type: "contribute",
    from: 0,
    resource: "alloy",
    amount: 1,
  });
  r.cities[0].state.tiles.find((t) => t.type === "trade").enabled = false;
  failUnchanged(r, {
    type: "contribute",
    from: 0,
    resource: "goods",
    amount: 1,
  });
});
test("region save round-trip preserves pending deliveries and deterministic next state", () => {
  const r = createRegion({ seed: 77 });
  reserve(r, 30);
  const copy = parseRegion(serializeRegion(r));
  assert.deepEqual(copy, r);
  advanceRegion(r);
  advanceRegion(copy);
  assert.deepEqual(copy, r);
});
test("region parser rejects malformed, oversized, unknown or impossible envelopes", () => {
  const r = createRegion();
  for (const text of [
    "{",
    "x".repeat(3 * 1048576 + 1),
    JSON.stringify({ ...r, version: 2 }),
    JSON.stringify({ ...r, extra: true }),
  ])
    assert.throws(() => parseRegion(text));
  const cases = [
    (a) => a.cities.pop(),
    (a) => (a.cities[1].id = a.cities[0].id),
    (a) => (a.cities[0].state.cash = 1e99),
    (a) => (a.active = 9),
    (a) => (a.month = -1),
    (a) => (a.events = ["x".repeat(501)]),
    (a) => (a.project.goods = 1001),
    (a) => (a.project.complete = true),
    (a) => (a.cities[1].state.regionalPower = 200),
    (a) => (a.project = { goods: 1000, alloy: 500, complete: false }),
  ];
  for (const change of cases) {
    const a = clone(r);
    change(a);
    assert.throws(() => parseRegion(JSON.stringify(a)));
  }
});
test("parser rejects tampered freight, delivery month, stock reservations and shipment destinations", () => {
  const r = createRegion();
  reserve(r, 20);
  const cases = [
    (a) => (a.shipments[0].amount = 0),
    (a) => (a.shipments[0].freight = 1),
    (a) => (a.shipments[0].arrivalMonth = 5),
    (a) => (a.shipments[0].to = 0),
    (a) => (a.shipments[0].resource = "constructor"),
    (a) => (a.cities[1].state.inventory.ore = 999990),
    (a) => (a.shipments[0].extra = true),
  ];
  for (const change of cases) {
    const a = clone(r);
    change(a);
    assert.throws(() => parseRegion(JSON.stringify(a)));
  }
});
test("region event history and simulation state remain bounded and saveable", () => {
  const r = createRegion();
  for (let n = 0; n < 30; n++) advanceRegion(r);
  assert.ok(r.events.length <= 24);
  assert.ok(r.cities.every((c) => c.state.history.length <= 24));
  assert.deepEqual(parseRegion(serializeRegion(r)), r);
});
test("delivery preflight considers aggregate arrivals and rejects before any mutation", () => {
  const r = createRegion();
  r.cities[0].state.inventory.ore = 100;
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 40,
    }).ok,
    true,
  );
  assert.equal(
    regionAction(r, {
      type: "shipment",
      from: 0,
      to: 1,
      resource: "ore",
      amount: 40,
    }).ok,
    true,
  );
  // Simulate invalid external state mutation; never silently discard a reserved cargo.
  r.cities[1].state.inventory.ore = 999950;
  const before = clone(r);
  assert.throws(() => advanceRegion(r));
  assert.deepEqual(r, before);
});
test("accepted cargo still arrives after destination depot closes, with no duplicate freight", () => {
  const r = createRegion();
  reserve(r, 20);
  const cash = r.cities[0].state.cash;
  r.cities[1].state.tiles.find((t) => t.type === "trade").enabled = false;
  advanceRegion(r);
  assert.equal(r.cities[1].state.inventory.ore, 20);
  assert.equal(r.shipments.length, 0);
  assert.equal(
    r.cities[0].state.cash - cash,
    r.cities[0].state.history.at(-1).net,
  );
});
test("region cash boundary failure preserves all cities and accepted shipments atomically", () => {
  const r = createRegion();
  r.cities[1].state.cash = 1e12;
  const before = structuredClone(r);
  assert.throws(() => advanceRegion(r), /treasury|limit/i);
  assert.deepEqual(r, before);
  assert.doesNotThrow(() => serializeRegion(r));
});
