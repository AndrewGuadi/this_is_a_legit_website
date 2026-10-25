import test from "node:test";
import assert from "node:assert/strict";
import {
  createCivic,
  civicReport,
  civicAction,
  advanceCivic,
  buildPermission,
  validateCivic,
  DEPARTMENTS,
  REQUESTS,
  TUTORIAL_STEPS,
} from "../../static/cmd-city/civic.mjs";

function fixture({ population = 386, sandbox = false, month = 0 } = {}) {
  const city = {
    month,
    sandbox,
    cash: 5000000,
    width: 40,
    height: 32,
    regionalPower: 0,
    research: { points: 0, completed: [] },
    history: [],
    tiles: Array.from({ length: 1280 }, () => ({
      type: "empty",
      terrain: "land",
      enabled: true,
      fire: 0,
      occupancy: 0,
    })),
    civic: createCivic({ sandbox, month }),
  };
  city.tiles[640].type = "road";
  city.tiles[641].type = "road";
  city.tiles[601].type = "residential";
  city.tiles[601].occupancy = 24;
  const metrics = {
    population,
    jobs: 100,
    employed: 100,
    education: 50,
    health: 60,
    crime: 20,
    busPassengers: 0,
    railPassengers: 0,
    access: Array(1280).fill(true),
    utilities: Object.fromEntries(
      ["power", "water", "sewage", "waste"].map((k) => [
        k,
        { supply: 1000, demand: 500, ratio: 1 },
      ]),
    ),
  };
  return { city, metrics };
}
function hall(city) {
  city.tiles[602].type = "townHall";
}
function month(f, { net = 10000, ...patch } = {}) {
  f.city.month++;
  f.city.history.push({ month: f.city.month, net });
  Object.assign(f.metrics, patch);
  return advanceCivic(f.city, f.metrics);
}
function rejected(f, action) {
  const before = structuredClone(f.city);
  assert.equal(civicAction(f.city, action, f.metrics).ok, false);
  assert.deepEqual(f.city, before);
}
function accept(f, id) {
  const r = civicAction(
    f.city,
    { type: "request", id, operation: "accept" },
    f.metrics,
  );
  assert.equal(r.ok, true, r.message);
}

test("fresh state is deterministic, bounded and migration starts at the supplied month", () => {
  const a = createCivic(),
    b = createCivic();
  assert.deepEqual(a, b);
  assert.equal(validateCivic(a, 0, false), true);
  assert.equal(createCivic({ month: 37 }).lastMonth, 37);
  assert.equal(createCivic({ sandbox: true }).eligible, false);
});
test("government observes actual peak population and never loses a tier after decline", () => {
  const f = fixture();
  month(f, { population: 1700 });
  assert.equal(f.city.civic.tier, 3);
  assert.equal(f.city.civic.peakPopulation, 1700);
  month(f, { population: 50 });
  assert.equal(f.city.civic.tier, 3);
  assert.equal(civicReport(f.city, f.metrics).government.slots, 3);
});
test("town hall opening requires a gateway and real supply without a self-readiness loop", () => {
  const f = fixture({ population: 0 });
  assert.equal(buildPermission(f.city, "townHall", f.metrics).ok, true);
  f.metrics.utilities.power.supply = 0;
  f.metrics.utilities.power.demand = 0;
  f.metrics.utilities.power.ratio = 1;
  assert.equal(buildPermission(f.city, "townHall", f.metrics).ok, false);
  f.metrics.utilities.power.supply = 1000;
  f.city.tiles[640].type = "empty";
  assert.equal(buildPermission(f.city, "townHall", f.metrics).ok, false);
});
test("installing a department needs an open supplied connected hall, costs once and enforces slots", () => {
  const f = fixture();
  rejected(f, { type: "department", department: "utilities" });
  hall(f.city);
  const before = f.city.cash;
  assert.equal(
    civicAction(
      f.city,
      { type: "department", department: "utilities" },
      f.metrics,
    ).ok,
    true,
  );
  assert.equal(f.city.cash, before - DEPARTMENTS.utilities.cost);
  rejected(f, { type: "department", department: "utilities" });
  rejected(f, { type: "department", department: "safety" });
  f.metrics.population = 600;
  month(f);
  assert.equal(
    civicAction(
      f.city,
      { type: "department", department: "education" },
      f.metrics,
    ).ok,
    true,
  );
  assert.equal(civicReport(f.city, f.metrics).government.slotsRemaining, 0);
});
test("extra halls do not multiply slots and inactive hall variants cannot host departments", () => {
  for (const change of [
    (f) => (f.city.tiles[602].enabled = false),
    (f) => (f.city.tiles[602].fire = 1),
    (f) => (f.metrics.access[602] = false),
    (f) => (f.metrics.utilities.water.ratio = 0.5),
  ]) {
    const f = fixture();
    hall(f.city);
    change(f);
    rejected(f, { type: "department", department: "utilities" });
  }
  const f = fixture();
  hall(f.city);
  f.city.tiles[603].type = "townHall";
  assert.equal(civicReport(f.city, f.metrics).government.slots, 1);
});
test("department money bounds and catalog lookups reject before mutation", () => {
  const f = fixture({ population: 5000 });
  hall(f.city);
  f.city.cash = 0;
  rejected(f, { type: "department", department: "education" });
  f.city.cash = 5e6;
  for (const name of ["constructor", "__proto__", "toString", "economy"])
    rejected(f, { type: "department", department: name });
  const action = Object.create({ type: "department", department: "education" });
  rejected(f, action);
});
test("advanced construction uses the specified departments and sandbox bypasses building restrictions", () => {
  const f = fixture({ population: 5000 });
  for (const tool of [
    "university",
    "hospital",
    "academy",
    "airport",
    "casino",
    "waterFilter",
    "nuclear",
  ])
    assert.equal(buildPermission(f.city, tool, f.metrics).ok, false, tool);
  hall(f.city);
  assert.equal(
    civicAction(
      f.city,
      { type: "department", department: "education" },
      f.metrics,
    ).ok,
    true,
  );
  assert.equal(buildPermission(f.city, "university", f.metrics).ok, true);
  assert.equal(buildPermission(f.city, "academy", f.metrics).ok, true);
  assert.equal(buildPermission(f.city, "nuclear", f.metrics).ok, false);
  assert.equal(
    civicAction(
      f.city,
      { type: "department", department: "utilities" },
      f.metrics,
    ).ok,
    true,
  );
  assert.equal(buildPermission(f.city, "nuclear", f.metrics).ok, true);
  const sandbox = fixture({ sandbox: true });
  assert.equal(
    buildPermission(sandbox.city, "nuclear", sandbox.metrics).ok,
    true,
  );
});
test("migration never disables existing advanced facilities or unlocks unlimited new ones by their presence", () => {
  const f = fixture();
  f.city.tiles[5].type = "airport";
  const before = structuredClone(f.city);
  assert.equal(buildPermission(f.city, "airport", f.metrics).ok, false);
  assert.deepEqual(f.city, before);
  assert.equal(f.city.tiles[5].type, "airport");
});
test("accept, reject and cancel are finite real request transitions", () => {
  const f = fixture();
  accept(f, "housing");
  assert.equal(f.city.civic.requests.housing.status, "active");
  rejected(f, { type: "request", id: "housing", operation: "accept" });
  assert.equal(
    civicAction(
      f.city,
      { type: "request", id: "housing", operation: "cancel" },
      f.metrics,
    ).ok,
    true,
  );
  rejected(f, { type: "request", id: "housing", operation: "accept" });
  assert.equal(
    civicAction(
      f.city,
      { type: "request", id: "balancedBooks", operation: "reject" },
      f.metrics,
    ).ok,
    true,
  );
  rejected(f, { type: "request", id: "balancedBooks", operation: "accept" });
});
test("completed requests pay only on explicit claim and only once", () => {
  const f = fixture();
  accept(f, "housing");
  const cash = f.city.cash;
  month(f, { population: 650 });
  assert.equal(f.city.civic.requests.housing.status, "completed");
  assert.equal(f.city.cash, cash);
  const history = structuredClone(f.city.history);
  assert.equal(
    civicAction(
      f.city,
      { type: "request", id: "housing", operation: "claim" },
      f.metrics,
    ).ok,
    true,
  );
  assert.equal(f.city.cash, cash + REQUESTS.housing.reward);
  assert.deepEqual(f.city.history, history);
  rejected(f, { type: "request", id: "housing", operation: "claim" });
});
test("cash overflow rejects a claim while preserving its eligibility for later claim", () => {
  const f = fixture();
  accept(f, "housing");
  month(f, { population: 650 });
  f.city.cash = 1e12;
  rejected(f, { type: "request", id: "housing", operation: "claim" });
  assert.equal(f.city.civic.requests.housing.status, "completed");
  f.city.cash -= REQUESTS.housing.reward;
  assert.equal(
    civicAction(
      f.city,
      { type: "request", id: "housing", operation: "claim" },
      f.metrics,
    ).ok,
    true,
  );
  assert.equal(f.city.cash, 1e12);
});
test("consecutive booked operating months drive requests; report and repeated tick cannot create progress", () => {
  const f = fixture();
  accept(f, "balancedBooks");
  month(f, { net: 100 });
  assert.equal(f.city.civic.requests.balancedBooks.progress, 1);
  const before = structuredClone(f.city);
  civicReport(f.city, f.metrics);
  advanceCivic(f.city, f.metrics);
  assert.deepEqual(f.city, before);
  month(f, { net: -1 });
  assert.equal(f.city.civic.requests.balancedBooks.progress, 0);
  for (let n = 0; n < 3; n++) month(f, { net: 1 });
  assert.equal(f.city.civic.requests.balancedBooks.status, "completed");
});
test("requests can complete at their deadline and otherwise expire with no reward", () => {
  const a = fixture(),
    b = fixture();
  accept(a, "housing");
  accept(b, "housing");
  for (let n = 1; n <= REQUESTS.housing.duration; n++) {
    month(a, { population: n === REQUESTS.housing.duration ? 600 : 386 });
    month(b, { population: 386 });
  }
  assert.equal(a.city.civic.requests.housing.status, "completed");
  assert.equal(b.city.civic.requests.housing.status, "expired");
  rejected(b, { type: "request", id: "housing", operation: "accept" });
});
test("invalid or inherited request IDs and operations preserve all city fields", () => {
  const f = fixture();
  for (const id of ["constructor", "__proto__", "toString", "missing"])
    rejected(f, { type: "request", id, operation: "accept" });
  for (const operation of ["award", "constructor", null])
    rejected(f, { type: "request", id: "housing", operation });
  rejected(f, { type: "tutorial", operation: "constructor" });
});
test("tutorial checks actual prerequisites, advances once per observation and can be dismissed or replayed explicitly", () => {
  const f = fixture();
  let report = civicReport(f.city, f.metrics);
  assert.equal(report.tutorial.step, 0);
  assert.equal(
    civicAction(f.city, { type: "tutorial", operation: "check" }, f.metrics).ok,
    true,
  );
  assert.equal(f.city.civic.tutorial.step, 1);
  assert.equal(
    civicAction(f.city, { type: "tutorial", operation: "dismiss" }, f.metrics)
      .ok,
    true,
  );
  const step = f.city.civic.tutorial.step;
  month(f);
  assert.equal(f.city.civic.tutorial.step, step);
  assert.equal(
    civicAction(f.city, { type: "tutorial", operation: "resume" }, f.metrics)
      .ok,
    true,
  );
  assert.equal(
    civicAction(f.city, { type: "tutorial", operation: "replay" }, f.metrics)
      .ok,
    true,
  );
  assert.equal(f.city.civic.tutorial.step, 0);
  assert.equal(f.city.civic.tutorial.replays, 1);
  const empty = fixture();
  empty.city.tiles[641].type = "empty";
  rejected(empty, { type: "tutorial", operation: "check" });
  assert.equal(TUTORIAL_STEPS.length, 8);
});
test("normal achievements grant no cash and sandbox ineligibility is permanent", () => {
  const f = fixture({ population: 6000 });
  const cash = f.city.cash;
  month(f);
  assert.ok(f.city.civic.achievements.includes("firstResidents"));
  assert.ok(f.city.civic.achievements.includes("metropolis"));
  assert.equal(f.city.cash, cash);
  const earned = structuredClone(f.city.civic.achievements);
  month(f);
  assert.deepEqual(f.city.civic.achievements, earned);
  const sandbox = fixture({ sandbox: true, population: 6000 });
  month(sandbox);
  assert.deepEqual(sandbox.city.civic.achievements, []);
  sandbox.city.sandbox = false;
  month(sandbox);
  assert.deepEqual(sandbox.city.civic.achievements, []);
  assert.equal(sandbox.city.civic.eligible, false);
});
test("validator rejects malformed state, inconsistent tiers, timestamps, eligibility and unbounded collections", () => {
  const base = createCivic();
  const changes = [
    (s) => (s.extra = true),
    (s) => (s.version = 2),
    (s) => (s.tier = 5),
    (s) => (s.lastMonth = 1),
    (s) => (s.departments = ["constructor"]),
    (s) => (s.departments = ["utilities", "utilities"]),
    (s) => (s.requests.housing.status = "claimed"),
    (s) => (s.requests.housing.reward = 999999),
    (s) => (s.requests.housing.progress = 999999),
    (s) => (s.tutorial.step = 999),
    (s) => (s.tutorial.completed = true),
    (s) => (s.achievements = ["constructor"]),
    (s) => (s.eligible = false),
  ];
  for (const change of changes) {
    const state = structuredClone(base);
    change(state);
    if (state.eligible === false) state.achievements = ["firstResidents"];
    assert.throws(() => validateCivic(state, 0, false));
  }
  assert.throws(() => validateCivic(createCivic(), 0, true));
});
test("skipped months, unsupported dates and invalid metric observations cannot invent historical progress", () => {
  const f = fixture();
  accept(f, "balancedBooks");
  f.city.month = 2;
  f.city.history = [{ month: 2, net: 1 }];
  const before = structuredClone(f.city);
  assert.throws(() => advanceCivic(f.city, f.metrics));
  assert.deepEqual(f.city, before);
  assert.throws(() => createCivic({ month: -1 }));
  const bad = fixture();
  bad.metrics.population = NaN;
  const saved = structuredClone(bad.city);
  assert.throws(() => advanceCivic(bad.city, bad.metrics));
  assert.deepEqual(bad.city, saved);
});
test("Finance permits one explicit bond redemption without rewriting operating history", () => {
  const f = fixture({ population: 600 });
  hall(f.city);
  f.city.bonds = [{ balance: 2200000, payment: 91667, months: 24 }];
  assert.equal(
    civicAction(
      f.city,
      { type: "department", department: "finance" },
      f.metrics,
    ).ok,
    true,
  );
  const before = f.city.cash,
    history = structuredClone(f.city.history);
  assert.equal(
    civicAction(f.city, { type: "redeemBond", index: 0 }, f.metrics).ok,
    true,
  );
  assert.equal(f.city.cash, before - 2200000);
  assert.deepEqual(f.city.bonds, []);
  assert.deepEqual(f.city.history, history);
  rejected(f, { type: "redeemBond", index: 0 });
});
test("redemption rejects missing Finance, closed hall, bad indices, malformed obligations and insufficient funds unchanged", () => {
  const f = fixture({ population: 600 });
  hall(f.city);
  f.city.bonds = [{ balance: 2200000, payment: 91667, months: 24 }];
  rejected(f, { type: "redeemBond", index: 0 });
  assert.equal(
    civicAction(
      f.city,
      { type: "department", department: "finance" },
      f.metrics,
    ).ok,
    true,
  );
  for (const index of [-1, 0.5, NaN, "constructor", 1])
    rejected(f, { type: "redeemBond", index });
  f.city.cash = 0;
  rejected(f, { type: "redeemBond", index: 0 });
  f.city.cash = 5000000;
  f.city.tiles[602].enabled = false;
  rejected(f, { type: "redeemBond", index: 0 });
  f.city.tiles[602].enabled = true;
  f.city.bonds[0].balance = -1;
  rejected(f, { type: "redeemBond", index: 0 });
});
test("inherited construction names and invalid research observations never create progress or money", () => {
  const f = fixture({ population: 600 });
  for (const tool of ["valueOf", "hasOwnProperty", "__defineGetter__"])
    assert.equal(buildPermission(f.city, tool, f.metrics).ok, false);
  f.city.research.points = NaN;
  const before = structuredClone(f.city);
  assert.equal(
    civicAction(
      f.city,
      { type: "request", id: "researchDrive", operation: "accept" },
      f.metrics,
    ).ok,
    false,
  );
  assert.deepEqual(f.city, before);
});
test("opening Town Hall requires complete current power and water service", () => {
  const f = fixture();
  f.metrics.utilities.water.ratio = 0.95;
  assert.equal(buildPermission(f.city, "townHall", f.metrics).ok, false);
});
test("non-string catalog identifiers are rejected transactionally instead of coerced", () => {
  const f = fixture({ population: 600 });
  hall(f.city);
  for (const department of [
    ["utilities"],
    new String("utilities"),
    { toString: () => "utilities" },
    0,
    null,
    true,
  ])
    rejected(f, { type: "department", department });
  for (const id of [
    ["housing"],
    new String("housing"),
    { toString: () => "housing" },
    0,
    null,
    true,
  ])
    rejected(f, { type: "request", id, operation: "accept" });
  for (const tool of [
    ["waterFilter"],
    new String("waterFilter"),
    { toString: () => "waterFilter" },
    0,
    null,
    true,
  ])
    assert.equal(buildPermission(f.city, tool, f.metrics).ok, false);
  for (const type of [["department"], new String("department")])
    rejected(f, { type, department: "utilities" });
  for (const operation of [["accept"], new String("accept")])
    rejected(f, { type: "request", id: "housing", operation });
});
test("persisted department and achievement lists require primitive string IDs", () => {
  for (const id of [
    ["utilities"],
    new String("utilities"),
    { toString: () => "utilities" },
    0,
    null,
    true,
  ]) {
    const state = createCivic();
    state.departments = [id];
    assert.throws(() => validateCivic(state, 0, false));
  }
  for (const id of [
    ["firstResidents"],
    new String("firstResidents"),
    { toString: () => "firstResidents" },
    0,
    null,
    true,
  ]) {
    const state = createCivic();
    state.peakPopulation = 100;
    state.achievements = [id];
    assert.throws(() => validateCivic(state, 0, false));
  }
});
