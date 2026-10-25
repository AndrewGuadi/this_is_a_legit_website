import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  applyAction,
  measure,
  advanceMonth,
  inspectTile,
} from "../../static/cmd-city/core.mjs";
import { TOOLS } from "../../static/cmd-city/content.mjs";
const idx = (s, x, y) => y * s.width + x;
function flat() {
  const s = createCity({ starter: false, seed: 7 });
  for (const t of s.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
    });
  s.tiles[idx(s, 0, 16)].type = "road";
  s.cash = 100000000;
  return s;
}
function build(s, tool, x, y) {
  const r = applyAction(s, { type: "build", tool, x, y });
  assert.equal(r.ok, true, r.message);
}
function street(s) {
  for (let x = 1; x < 18; x++) build(s, "road", x, 16);
}
function utilities(s) {
  build(s, "wind", 2, 15);
  build(s, "water", 3, 15);
  build(s, "sewage", 4, 15);
  build(s, "landfill", 5, 15);
}

test("seeded maps reproduce exactly, include river and protected gateway", () => {
  const a = createCity({ seed: 22 }),
    b = createCity({ seed: 22 });
  assert.deepEqual(a, b);
  assert.equal(a.tiles.length, 1280);
  assert.ok(a.tiles.some((t) => t.terrain === "water"));
  assert.equal(a.tiles[16 * 40].type, "road");
  assert.equal(applyAction(a, { type: "bulldoze", x: 0, y: 16 }).ok, false);
});
test("successful placement charges once; rejected actions do not mutate any state", () => {
  const s = flat(),
    cash = s.cash;
  build(s, "road", 1, 16);
  assert.equal(s.cash, cash - TOOLS.road.cost);
  const before = structuredClone(s);
  for (const a of [
    { type: "build", tool: "road", x: 1, y: 16 },
    { type: "build", tool: "fake", x: 1, y: 15 },
    { type: "build", tool: "road", x: -1, y: 2 },
    { type: "build", tool: "road", x: 1.5, y: 2 },
  ]) {
    assert.equal(applyAction(s, a).ok, false);
    assert.deepEqual(s, before);
  }
});
test("disconnected road island does not grant access; completing the path does", () => {
  const s = flat();
  build(s, "road", 3, 16);
  build(s, "residential", 3, 15);
  assert.equal(measure(s).access[idx(s, 3, 15)], false);
  build(s, "road", 1, 16);
  build(s, "road", 2, 16);
  assert.equal(measure(s).access[idx(s, 3, 15)], true);
});
test("only bridges build on water and a continuous crossing joins road banks", () => {
  const s = flat();
  s.tiles[idx(s, 2, 16)].terrain = "water";
  assert.equal(
    applyAction(s, { type: "build", tool: "road", x: 2, y: 16 }).ok,
    false,
  );
  build(s, "road", 1, 16);
  build(s, "road", 3, 16);
  build(s, "residential", 3, 15);
  assert.equal(measure(s).access[idx(s, 3, 15)], false);
  build(s, "bridge", 2, 16);
  assert.equal(measure(s).access[idx(s, 3, 15)], true);
});
test("isolated utility cannot supply the city", () => {
  const s = flat();
  build(s, "wind", 12, 4);
  assert.equal(measure(s).utilities.power.supply, 0);
  street(s);
  build(s, "wind", 2, 15);
  assert.equal(measure(s).utilities.power.supply, TOOLS.wind.supply);
});
test("new zones remain empty without supply, then grow with all utilities", () => {
  const s = flat();
  street(s);
  build(s, "residential", 7, 15);
  build(s, "industrial", 8, 15);
  for (let i = 0; i < 8; i++) advanceMonth(s);
  assert.equal(s.tiles[idx(s, 7, 15)].occupancy, 0);
  utilities(s);
  for (let i = 0; i < 8; i++) advanceMonth(s);
  assert.ok(measure(s).population > 0);
  assert.ok(measure(s).jobs > 0);
});
test("growth reserves shared capacity across proposals", () => {
  const s = flat();
  street(s);
  utilities(s);
  for (let x = 6; x < 17; x++) {
    build(s, "residential", x, 15);
    s.tiles[idx(s, x, 15)].level = 3;
    s.tiles[idx(s, x, 15)].occupancy = 70;
  }
  for (let i = 0; i < 10; i++) advanceMonth(s);
  const m = measure(s);
  assert.ok(m.utilities.power.demand <= m.utilities.power.supply);
  assert.ok(m.utilities.water.demand <= m.utilities.water.supply);
});
test("employment is bounded by residents and operating jobs and puts real load on roads", () => {
  const s = createCity();
  const m = measure(s);
  assert.ok(m.employed > 0);
  assert.ok(m.employed <= m.workers);
  assert.ok(m.employed <= m.jobs);
  assert.ok(m.roadLoad.some((v) => v > 0));
});
test("removing a connecting road disables downstream jobs and supply", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "industrial", 12, 15);
  s.tiles[idx(s, 12, 15)].occupancy = 10;
  assert.ok(measure(s).jobs > 0);
  assert.equal(applyAction(s, { type: "bulldoze", x: 10, y: 16 }).ok, true);
  assert.equal(measure(s).jobs, 0);
  assert.ok(
    inspectTile(s, 12, 15).blockers.some((x) => /road|access|connect/i.test(x)),
  );
});
test("monthly ledger exactly reconciles treasury and bounded history", () => {
  const s = createCity();
  for (let n = 0; n < 30; n++) {
    const before = s.cash;
    advanceMonth(s);
    const h = s.history.at(-1);
    assert.equal(s.cash - before, h.net);
    assert.equal(h.income - h.upkeep - h.debt + h.trade, h.net);
  }
  assert.equal(s.history.length, 24);
});
test("measure and inspection never mutate authoritative state", () => {
  const s = createCity(),
    before = structuredClone(s);
  for (let i = 0; i < 3; i++) {
    measure(s);
    inspectTile(s, 5, 15);
  }
  assert.deepEqual(s, before);
});
test("deficit blocks construction but allows decommissioning to reduce upkeep", () => {
  const s = flat();
  street(s);
  utilities(s);
  const before = measure(s).monthly.upkeep;
  s.cash = -100;
  assert.equal(
    applyAction(s, { type: "build", tool: "park", x: 8, y: 15 }).ok,
    false,
  );
  assert.equal(applyAction(s, { type: "bulldoze", x: 2, y: 15 }).ok, true);
  assert.ok(s.cash < -100);
  assert.ok(measure(s).monthly.upkeep < before);
});
test("bonds give principal once and repay a bounded fixed obligation", () => {
  const s = flat();
  const before = s.cash;
  assert.equal(applyAction(s, { type: "bond" }).ok, true);
  assert.equal(s.cash - before, 2000000);
  const balance = s.bonds[0].balance;
  assert.equal(balance, 2200000);
  let debt = 0;
  for (let i = 0; i < 24; i++) {
    advanceMonth(s);
    debt += s.history.at(-1).debt;
  }
  assert.equal(debt, balance);
  assert.equal(s.bonds.length, 0);
});
test("pollution is local and parks do not erase industrial emissions", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "industrial", 10, 15);
  s.tiles[idx(s, 10, 15)].occupancy = 10;
  // Persistent emissions require actual staffed production and a booked month.
  build(s, "residential", 9, 15);
  s.tiles[idx(s, 9, 15)].occupancy = 24;
  advanceMonth(s);
  const a = measure(s);
  assert.ok(a.pollution[idx(s, 10, 15)] > a.pollution[idx(s, 35, 5)]);
  build(s, "park", 11, 15);
  const b = measure(s);
  assert.equal(a.pollution[idx(s, 10, 14)], b.pollution[idx(s, 10, 14)]);
});
test("resource extraction is finite and site constrained", () => {
  const s = flat();
  street(s);
  assert.equal(
    applyAction(s, { type: "build", tool: "mine", x: 10, y: 15 }).ok,
    false,
  );
  s.tiles[idx(s, 10, 15)].resource = "ore";
  s.tiles[idx(s, 10, 15)].reserve = 5;
  build(s, "mine", 10, 15);
  utilities(s);
  build(s, "residential", 11, 15);
  s.tiles[idx(s, 11, 15)].occupancy = 24;
  for (let i = 0; i < 5; i++) advanceMonth(s);
  assert.equal(s.tiles[idx(s, 10, 15)].reserve, 0);
  assert.ok(s.inventory.ore <= 5);
});
test("trade mode changes create actual inventory and treasury transactions", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "trade", 8, 15);
  assert.equal(
    applyAction(s, { type: "trade", resource: "goods", mode: "import" }).ok,
    true,
  );
  const goods = s.inventory.goods;
  advanceMonth(s);
  assert.ok(s.inventory.goods > goods);
  assert.ok(s.history.at(-1).trade < 0);
});
test("service funding changes operational coverage", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "school", 7, 15);
  const a = measure(s).coverage.school[idx(s, 8, 15)];
  assert.ok(a > 0);
  assert.equal(
    applyAction(s, { type: "funding", service: "school", value: 0 }).ok,
    true,
  );
  assert.equal(measure(s).coverage.school[idx(s, 8, 15)], 0);
});
test("upgrades charge and expand capacity without inventing occupants", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "residential", 8, 15);
  const t = s.tiles[idx(s, 8, 15)],
    before = s.cash;
  assert.equal(applyAction(s, { type: "upgrade", x: 8, y: 15 }).ok, true);
  assert.equal(t.level, 2);
  assert.equal(t.occupancy, 0);
  assert.ok(s.cash < before);
});
test("research spends points, enforces prerequisites and unlocks actual options", () => {
  const s = flat();
  // This research behavior fixture uses explicit sandbox construction; normal
  // Education department permission is covered by progression.test.mjs.
  s.sandbox = true;
  s.civic.eligible = false;
  s.research.points = 1000;
  assert.equal(
    applyAction(s, { type: "research", topic: "vertical" }).ok,
    false,
  );
  street(s);
  build(s, "academy", 7, 15);
  assert.equal(
    applyAction(s, { type: "research", topic: "cleanEnergy" }).ok,
    true,
  );
  assert.ok(s.research.completed.includes("cleanEnergy"));
  assert.equal(
    applyAction(s, { type: "research", topic: "cleanEnergy" }).ok,
    false,
  );
});
test("disasters damage actual structures rather than only displaying text", () => {
  const s = createCity();
  const before = structuredClone(s.tiles);
  assert.equal(applyAction(s, { type: "disaster", kind: "fire" }).ok, true);
  assert.notDeepEqual(s.tiles, before);
  assert.ok(s.tiles.some((t) => t.fire > 0 || t.type === "ruins"));
});
test("invalid action values preserve city exactly", () => {
  const s = createCity(),
    before = structuredClone(s);
  for (const a of [
    { type: "tax", sector: "residential", value: NaN },
    { type: "tax", sector: "fake", value: 9 },
    { type: "funding", service: "school", value: -1 },
    { type: "rename", value: "x".repeat(81) },
    { type: "trade", resource: "cash", mode: "export" },
    { type: "policy", name: "recycling", value: "true" },
  ]) {
    assert.equal(applyAction(s, a).ok, false);
    assert.deepEqual(s, before);
  }
});
test("long simulation stays finite and capacities remain internally bounded", () => {
  const s = createCity();
  for (let i = 0; i < 120; i++) {
    advanceMonth(s);
    const m = measure(s);
    assert.ok(Number.isSafeInteger(s.cash));
    assert.ok(m.population >= 0);
    assert.ok(m.employed <= m.workers && m.employed <= m.jobs);
    for (const t of s.tiles)
      assert.ok(Number.isInteger(t.occupancy) && t.occupancy >= 0);
  }
  assert.equal(s.month, 120);
  assert.equal(s.history.length, 24);
});
test("prototype names cannot enter tool or research lookup tables", () => {
  const s = flat(),
    before = structuredClone(s);
  for (const tool of ["constructor", "toString", "__proto__"]) {
    assert.equal(
      applyAction(s, { type: "build", tool, x: 1, y: 15 }).ok,
      false,
    );
    assert.deepEqual(s, before);
  }
  for (const topic of ["constructor", "toString", "__proto__"]) {
    assert.equal(applyAction(s, { type: "research", topic }).ok, false);
    assert.deepEqual(s, before);
  }
});
test("generators reserve fuel globally and pumps cannot promise more than the aquifer", () => {
  const s = flat();
  street(s);
  build(s, "coalPlant", 7, 15);
  build(s, "coalPlant", 8, 15);
  s.inventory.coal = 20;
  assert.equal(measure(s).utilities.power.supply, TOOLS.coalPlant.supply);
  build(s, "water", 9, 15);
  s.groundwater = 1;
  assert.ok(measure(s).utilities.water.supply <= 1);
  advanceMonth(s);
  assert.equal(s.inventory.coal, 0);
});
test("productive facilities need actual power and water even when city has no occupied zones", () => {
  const s = flat();
  street(s);
  build(s, "factory", 8, 15);
  s.inventory.ore = 30;
  s.inventory.oil = 20;
  advanceMonth(s);
  assert.equal(s.inventory.alloy, 0);
  assert.equal(s.inventory.electronics, 0);
  utilities(s);
  build(s, "residential", 9, 15);
  s.tiles[idx(s, 9, 15)].occupancy = 24;
  advanceMonth(s);
  assert.ok(s.inventory.alloy > 0);
});
test("disabled recycling contributes no waste supply, then enabling operates it", () => {
  const s = flat();
  street(s);
  build(s, "recycling", 8, 15);
  assert.equal(measure(s).utilities.waste.supply, 0);
  build(s, "wind", 2, 15);
  build(s, "water", 3, 15);
  applyAction(s, { type: "policy", name: "recycling", value: true });
  assert.ok(measure(s).utilities.waste.supply > 0);
});
test("imports cannot overflow bounded inventories or break saveability", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "trade", 8, 15);
  s.inventory.goods = 999990;
  applyAction(s, { type: "trade", resource: "goods", mode: "import" });
  advanceMonth(s);
  assert.equal(s.inventory.goods, 1000000);
  assert.equal(s.history.at(-1).trade, -10 * 700);
});
test("industry without any filled workers cannot manufacture goods", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "industrial", 9, 15);
  s.tiles[idx(s, 9, 15)].occupancy = 18;
  const goods = s.inventory.goods;
  advanceMonth(s);
  assert.equal(measure(s).employed, 0);
  assert.equal(s.inventory.goods, goods);
});
test("rejected disaster preserves random generator and every other field", () => {
  const s = flat();
  street(s);
  build(s, "trade", 8, 15);
  const before = structuredClone(s);
  assert.equal(applyAction(s, { type: "disaster", kind: "flood" }).ok, false);
  assert.deepEqual(s, before);
});
test("visitor revenue is included consistently in forecast and booked income", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "tourism", 8, 15);
  advanceMonth(s);
  assert.equal(s.history.at(-1).income, measure(s).monthly.income);
});
test("full resource inventory stops extraction without consuming the deposit", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "residential", 11, 15);
  s.tiles[idx(s, 11, 15)].occupancy = 24;
  s.tiles[idx(s, 10, 15)].resource = "ore";
  s.tiles[idx(s, 10, 15)].reserve = 100;
  build(s, "mine", 10, 15);
  s.inventory.ore = 1000000;
  advanceMonth(s);
  assert.equal(s.tiles[idx(s, 10, 15)].reserve, 100);
  assert.equal(s.inventory.ore, 1000000);
});
test("trade depot without actual utilities cannot execute orders", () => {
  const s = flat();
  street(s);
  build(s, "trade", 8, 15);
  s.trade.goods = "import";
  const goods = s.inventory.goods;
  advanceMonth(s);
  assert.equal(s.inventory.goods, goods);
  assert.equal(s.history.at(-1).trade, 0);
});
test("unsupported infrastructure upgrades cannot charge for no effect", () => {
  const s = flat();
  street(s);
  build(s, "rail", 8, 15);
  const before = structuredClone(s);
  assert.equal(applyAction(s, { type: "upgrade", x: 8, y: 15 }).ok, false);
  assert.deepEqual(s, before);
});
test("unprocessed waste persists and harms health rather than disappearing", () => {
  const a = createCity(),
    b = structuredClone(a);
  for (const t of b.tiles) if (t.type === "landfill") t.enabled = false;
  advanceMonth(a);
  advanceMonth(b);
  assert.ok(b.backlogs.waste > 0);
  assert.ok(measure(b).health < measure(a).health);
  const debt = b.backlogs.waste;
  advanceMonth(b);
  assert.ok(b.backlogs.waste > debt);
});
test("bus exchanges move actual assigned workers and reduce car road loads", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "residential", 7, 15);
  s.tiles[idx(s, 7, 15)].occupancy = 24;
  build(s, "industrial", 16, 15);
  s.tiles[idx(s, 16, 15)].occupancy = 18;
  const a = measure(s);
  build(s, "bus", 7, 17);
  build(s, "bus", 16, 17);
  const b = measure(s);
  assert.ok(b.busPassengers > 0);
  assert.ok(b.roadLoad[idx(s, 12, 16)] < a.roadLoad[idx(s, 12, 16)]);
  assert.equal(b.employed, a.employed);
});
test("rail commuters require connected tracks and stations, not a decorative station", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "residential", 7, 15);
  s.tiles[idx(s, 7, 15)].occupancy = 24;
  build(s, "industrial", 16, 15);
  s.tiles[idx(s, 16, 15)].occupancy = 18;
  build(s, "station", 7, 17);
  build(s, "station", 16, 17);
  assert.equal(measure(s).railPassengers, 0);
  for (let x = 7; x <= 16; x++) build(s, "rail", x, 18);
  assert.ok(measure(s).railPassengers > 0);
  applyAction(s, { type: "bulldoze", x: 12, y: 18 });
  assert.equal(measure(s).railPassengers, 0);
});
test("sandbox funds are explicit and separate from ordinary starting funds", () => {
  assert.equal(createCity({ sandbox: true }).cash, 25000000);
  assert.equal(createCity({ sandbox: false }).cash, 5000000);
});
test("transit coordination research changes actual bus road use", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "residential", 7, 15);
  s.tiles[idx(s, 7, 15)].occupancy = 24;
  build(s, "industrial", 16, 15);
  s.tiles[idx(s, 16, 15)].occupancy = 18;
  build(s, "bus", 7, 17);
  build(s, "bus", 16, 17);
  const before = measure(s);
  s.research.completed = ["cleanEnergy", "transit"];
  const after = measure(s);
  assert.equal(after.busPassengers, before.busPassengers);
  assert.ok(after.roadLoad[idx(s, 12, 16)] < before.roadLoad[idx(s, 12, 16)]);
});
test("fire casualties resolve before the month books occupied tax bases", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "residential", 7, 15);
  s.tiles[idx(s, 7, 15)].occupancy = 10;
  s.tiles[idx(s, 7, 15)].fire = 1;
  advanceMonth(s);
  assert.equal(s.tiles[idx(s, 7, 15)].type, "ruins");
  assert.equal(s.history.at(-1).income, measure(s).monthly.income);
});
test("extinguished fires restore service before the booked tax census", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "fire", 6, 15);
  build(s, "residential", 7, 15);
  s.tiles[idx(s, 7, 15)].occupancy = 10;
  s.tiles[idx(s, 7, 15)].fire = 1;
  advanceMonth(s);
  assert.equal(s.tiles[idx(s, 7, 15)].fire, 0);
  assert.equal(s.history.at(-1).income, measure(s).monthly.income);
});
test("overfunded services remain bounded to readable 0–100 coverage indicators", () => {
  const s = flat();
  street(s);
  utilities(s);
  build(s, "school", 6, 15);
  build(s, "residential", 7, 15);
  s.tiles[idx(s, 7, 15)].occupancy = 12;
  applyAction(s, { type: "funding", service: "school", value: 150 });
  const m = measure(s);
  assert.ok(m.education <= 100);
  assert.ok(m.coverage.school.every((n) => n >= 0 && n <= 100));
});
test("near-boundary accepted saves cannot be advanced into an unsaveable treasury", () => {
  const s = createCity();
  s.cash = 1e12;
  const before = structuredClone(s);
  assert.throws(() => advanceMonth(s), /treasury|limit/i);
  assert.deepEqual(s, before);
  assert.equal(applyAction(s, { type: "bond" }).ok, false);
  assert.deepEqual(s, before);
  s.cash = -1e12;
  const negative = structuredClone(s);
  assert.equal(applyAction(s, { type: "bulldoze", x: 1, y: 15 }).ok, false);
  assert.deepEqual(s, negative);
});
test("inspector reconciles closed standby upkeep and unpowered facility status", () => {
  const s = flat();
  street(s);
  build(s, "wind", 2, 15);
  applyAction(s, { type: "toggle", x: 2, y: 15 });
  assert.ok(
    inspectTile(s, 2, 15).lines.some((x) => x.includes("Monthly upkeep: 7 ")),
  );
  build(s, "factory", 8, 15);
  const info = inspectTile(s, 8, 15);
  assert.equal(info.operating, false);
  assert.ok(info.blockers.some((x) => /power|water|suppl/i.test(x)));
});
