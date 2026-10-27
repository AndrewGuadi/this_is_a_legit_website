import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  applyAction,
  measure,
  advanceMonth,
} from "../../static/cmd-city/core.mjs";
import { createHouseholds } from "../../static/cmd-city/households.mjs";
import { createServices } from "../../static/cmd-city/services.mjs";
import { createFuture, syncFuture } from "../../static/cmd-city/future.mjs";
import { parseCity, serializeCity } from "../../static/cmd-city/save.mjs";
function town() {
  const c = createCity({ starter: false, seed: 505, sandbox: true });
  for (const t of c.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
    });
  for (let x = 0; x < 30; x++) c.tiles[640 + x].type = "avenue";
  for (const [type, x, occupancy] of [
    ["tower", 2, 180],
    ["residential", 4, 100],
    ["commercial", 6, 12],
    ["industrial", 8, 18],
    ["academy", 10, 0],
    ["consortium", 12, 0],
    ["wind", 14, 0],
    ["water", 16, 0],
  ])
    Object.assign(c.tiles[600 + x], {
      type,
      occupancy,
      level: type === "residential" ? 3 : 1,
    });
  c.cash = 100000000;
  c.inventory.goods = 100000;
  c.inventory.oil = 100;
  c.inventory.ore = 100;
  c.research.completed = ["cleanEnergy", "vertical"];
  c.households = createHouseholds(c);
  c.services = createServices(c);
  c.future = createFuture(c);
  return c;
}
test("schema4 strict migration preserves old source fields and creates future state only once", () => {
  const c = createCity();
  assert.equal(c.version, 4);
  const old = structuredClone(c);
  old.version = 3;
  delete old.future;
  const loaded = parseCity(JSON.stringify(old));
  assert.equal(loaded.version, 4);
  assert.ok(loaded.future);
  for (const k of Object.keys(old))
    if (k !== "version") assert.deepEqual(loaded[k], old[k]);
  assert.deepEqual(parseCity(serializeCity(loaded)), loaded);
});
test("real guarded floor controls create jobs, stock-limited internal purchases and housing capacity", () => {
  const c = town();
  assert.equal(
    applyAction(c, {
      type: "future",
      action: { type: "addFloor", index: 602, use: "shops" },
    }).ok,
    true,
  );
  assert.equal(
    applyAction(c, {
      type: "future",
      action: { type: "addFloor", index: 602, use: "offices" },
    }).ok,
    true,
  );
  assert.equal(
    applyAction(c, {
      type: "future",
      action: { type: "addFloor", index: 602, use: "school" },
    }).ok,
    true,
  );
  const m = measure(c);
  assert.ok(m.future.towers[0].jobs > 0);
  assert.ok(m.jobFill[602] > 0);
  const before = c.inventory.goods;
  advanceMonth(c);
  assert.ok(c.households.homes[602].shoppingBought > 0);
  assert.ok(c.households.homes[602].enrolledChildren > 0);
  assert.ok(c.inventory.goods < before);
  assert.deepEqual(parseCity(serializeCity(c)), c);
});
test("critical staffing and internal generation require actual workers and share road and water limits", () => {
  const c = town();
  for (const use of ["power", "water", "offices"])
    assert.equal(
      applyAction(c, {
        type: "future",
        action: { type: "addFloor", index: 602, use },
      }).ok,
      true,
    );
  c.tiles[614].enabled = false;
  c.tiles[616].enabled = false;
  let m = measure(c);
  assert.ok(m.future.towers[0].powerSupply > 0);
  assert.ok(m.future.towers[0].waterSupply > 0);
  assert.equal(
    m.homeEmployment.reduce((a, b) => a + b, 0),
    m.employed,
  );
  assert.equal(
    m.jobFill.reduce((a, b) => a + b, 0),
    m.employed,
  );
  assert.ok(m.roadLoad.every((n, i) => n <= 240));
  c.groundwater = 0;
  m = measure(c);
  assert.equal(m.utilities.water.supply, 0);
  assert.equal(m.future.towers[0].waterSupply, 0);
  for (const t of c.tiles)
    if (["residential", "tower"].includes(t.type)) t.occupancy = 0;
  c.households = createHouseholds(c);
  m = measure(c);
  assert.equal(m.future.towers[0].powerSupply, 0);
});
test("corporate output is booked once with resource, treasury and environmental consequences", () => {
  const c = town();
  const before = structuredClone(c);
  advanceMonth(c);
  const l = c.future.ledger;
  assert.ok(l.produced > 0);
  assert.equal(l.oilUsed, l.produced * 2);
  assert.equal(l.oreUsed, l.produced);
  assert.equal(c.future.composite, l.openingComposite + l.produced - l.sold);
  assert.equal(c.history.at(-1).net, c.cash - before.cash);
  assert.ok(c.history.at(-1).income >= l.revenue);
  assert.ok(c.environment.ground[612] > before.environment.ground[612]);
  assert.deepEqual(parseCity(serializeCity(c)), c);
});
test("a self-supplied tower retains local service under outside grid shortage without duplicated supply or groundwater", () => {
  const c = town();
  for (const use of ["power", "water", "shops", "school"])
    assert.equal(
      applyAction(c, {
        type: "future",
        action: { type: "addFloor", index: 602, use },
      }).ok,
      true,
    );
  c.tiles[614].enabled = false;
  c.tiles[616].enabled = false;
  for (let x = 18; x < 29; x += 2)
    Object.assign(c.tiles[600 + x], {
      type: "residential",
      occupancy: 108,
      level: 3,
    });
  c.households = createHouseholds(c);
  const m = measure(c),
    t = m.future.towers[0];
  assert.ok(m.utilities.power.ratio < 0.9);
  assert.equal(t.powerRatio, 1);
  assert.equal(t.waterRatio, 1);
  assert.ok(t.shopBundles > 0);
  assert.equal(m.retailCapacityByTile[602], t.shopBundles);
  assert.ok(t.schoolPlaces > 0);
  for (const k of ["power", "water"]) {
    const u = m.utilities[k];
    assert.equal(u.totalSupply, u.supply + u.localDelivered);
    assert.equal(u.totalDemand, u.demand + u.localDelivered);
  }
  assert.ok(m.utilities.water.totalSupply <= c.groundwater);
  c.groundwater = 100;
  const dry = measure(c);
  assert.ok(dry.utilities.water.totalSupply <= 100);
  assert.ok(dry.future.towers[0].waterSupply <= 100);
});
test("compact future exports are lossless, bounded and strict against expansion abuse", () => {
  const c = town();
  for (const use of ["shops", "offices", "crown"])
    assert.equal(
      applyAction(c, {
        type: "future",
        action: { type: "addFloor", index: 602, use },
      }).ok,
      true,
    );
  applyAction(c, {
    type: "future",
    action: { type: "setFloorEnabled", index: 602, floor: 2, enabled: false },
  });
  const encoded = JSON.parse(serializeCity(c));
  assert.equal(encoded.future.encoding, "floors-v1");
  assert.equal(typeof encoded.future.towers[0][1], "string");
  assert.deepEqual(parseCity(JSON.stringify(encoded)), c);
  for (const value of [
    [[602, "H".repeat(13)]],
    [[602, "?"]],
    [
      [602, "HH"],
      [602, "HH"],
    ],
    [[1280, "HH"]],
    [[602, "HH", false]],
  ]) {
    const bad = structuredClone(encoded);
    bad.future.towers = value;
    assert.throws(() => parseCity(JSON.stringify(bad)));
  }
  const defaults = createCity();
  assert.deepEqual(JSON.parse(serializeCity(defaults)).future.towers, []);
});
test("advanced clean-power research needs current skilled employed residents and a staffed institute, then actual plant staff generate power", () => {
  const c = town();
  c.research.points = 1000;
  const before = structuredClone(c);
  assert.equal(applyAction(c, { type: "research", topic: "fusion" }).ok, false);
  assert.deepEqual(c, before);
  for (const h of c.households.homes)
    if (h) {
      h.wealth = 1;
      h.educated = h.adults;
    }
  assert.equal(applyAction(c, { type: "research", topic: "fusion" }).ok, true);
  assert.equal(
    applyAction(c, { type: "build", tool: "fusion", x: 18, y: 15 }).ok,
    true,
  );
  c.tiles[614].enabled = false;
  const m = measure(c);
  assert.equal(m.jobFill[618], 12);
  assert.ok(m.utilities.power.totalSupply >= 3000);
  assert.equal(
    m.jobFill.reduce((a, b) => a + b, 0),
    m.employed,
  );
  c.tiles[618].enabled = false;
  assert.equal(measure(c).utilities.power.supply, 0);
  assert.deepEqual(parseCity(serializeCity(c)), c);
});
test("tidal generation is shoreline constrained, finite, staffed and tied to the current tidal cycle", () => {
  const c = town();
  for (const h of c.households.homes)
    if (h) {
      h.wealth = 2;
      h.educated = h.adults;
    }
  c.research.points = 1000;
  assert.equal(applyAction(c, { type: "research", topic: "tidal" }).ok, true);
  let before = structuredClone(c);
  assert.equal(
    applyAction(c, { type: "build", tool: "tidal", x: 18, y: 15 }).ok,
    false,
  );
  assert.deepEqual(c, before);
  c.tiles[578].terrain = "water";
  assert.equal(
    applyAction(c, { type: "build", tool: "tidal", x: 18, y: 15 }).ok,
    true,
  );
  c.tiles[614].enabled = false;
  const m = measure(c);
  assert.equal(m.jobFill[618], 8);
  assert.ok(
    m.utilities.power.totalSupply >= 390 &&
      m.utilities.power.totalSupply <= 600,
  );
  const imported = parseCity(serializeCity(c));
  assert.deepEqual(measure(imported), m);
  c.tiles[618].enabled = false;
  assert.equal(measure(c).utilities.power.supply, 0);
});

test("schema4 inspector reconciles floor upkeep and corporate input blockers", async () => {
  const { inspectTile } = await import("../../static/cmd-city/core.mjs");
  const c = town();
  assert.equal(
    applyAction(c, {
      type: "future",
      action: { type: "addFloor", index: 602, use: "shops" },
    }).ok,
    true,
  );
  const m = measure(c),
    t = m.future.towers[0];
  assert.ok(
    inspectTile(c, 2, 15, m).lines.some(
      (s) =>
        s.includes("Tower floor upkeep:") && s.includes(String(t.upkeep / 100)),
    ),
  );
  c.inventory.oil = 0;
  c.inventory.ore = 0;
  assert.ok(
    inspectTile(c, 12, 15).blockers.some((s) =>
      s.includes("two oil and one ore"),
    ),
  );
});

test("legacy versions reject technology and building introductions from later schemas", () => {
  for (const version of [1, 2, 3]) {
    const c = createCity({ starter: false });
    c.version = version;
    delete c.future;
    if (version < 3) {
      delete c.households;
      delete c.services;
    }
    if (version === 1) {
      delete c.environment;
      delete c.civic;
    }
    const future = structuredClone(c);
    future.research.completed = ["cleanEnergy", "tidal"];
    assert.throws(() => parseCity(JSON.stringify(future)));
    if (version < 3) {
      const maglev = structuredClone(c);
      maglev.research.completed = ["cleanEnergy", "transit", "maglev"];
      assert.throws(() => parseCity(JSON.stringify(maglev)));
    }
    const facility = structuredClone(c);
    facility.tiles[600].terrain = "land";
    facility.tiles[600].type = "consortium";
    assert.throws(() => parseCity(JSON.stringify(facility)));
  }
});
