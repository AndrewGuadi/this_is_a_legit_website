import test from "node:test";
import assert from "node:assert/strict";
import {
  createServices,
  validateServices,
  serviceReport,
  advanceServices,
  serviceAction,
  preserveDemolition,
  serviceNeedsDraft,
} from "../../static/cmd-city/services.mjs";
const W = 40,
  H = 32,
  N = W * H,
  index = (x, y) => y * W + x;
function fixture() {
  const city = {
    width: W,
    height: H,
    month: 0,
    cash: 1e8,
    inventory: { ore: 0 },
    backlogs: { waste: 0 },
    funding: { clinic: 100, fire: 100, police: 100 },
    policies: { recycling: true },
    tiles: Array.from({ length: N }, () => ({
      type: "empty",
      occupancy: 0,
      modules: 0,
      enabled: true,
      fire: 0,
      stored: 0,
    })),
  };
  for (let x = 0; x < 39; x++) city.tiles[index(x, 16)].type = "road";
  const metrics = {
    operationAccess: Array(N).fill(true),
    access: Array(N).fill(true),
    jobFill: Array(N).fill(0),
    roadLoad: Array(N).fill(0),
    utilities: { power: { ratio: 1 }, water: { ratio: 1 } },
    population: 24,
    health: 80,
    crime: 25,
  };
  return { city, metrics };
}
function place(city, type, x, y, fields = {}) {
  Object.assign(city.tiles[index(x, y)], { type, ...fields });
  return index(x, y);
}
function ready(city, metrics, type, x, y, fields = {}) {
  const i = place(city, type, x, y, fields);
  metrics.jobFill[i] = 8;
  return i;
}
function initialize(city) {
  city.services = createServices(city);
  return city.services;
}
function next(city, metrics) {
  const r = advanceServices(city, metrics);
  city.month++;
  return r;
}
function incident(city, kind, x, y, amount = 1) {
  const r = serviceAction(city, {
    type: "serviceIncident",
    kind,
    x,
    y,
    amount,
  });
  assert.equal(r.ok, true, r.message);
}

test("service migration allocates legacy backlog once and never duplicates stored landfill stock", () => {
  const { city } = fixture();
  city.backlogs.waste = 100;
  place(city, "landfill", 2, 15, { stored: 40 });
  const s = createServices(city);
  assert.equal(s.looseWaste, 100);
  assert.equal(s.counters.legacyWaste, 100);
  assert.equal(s.counters.initialStoredWaste, 40);
  assert.equal(
    s.waste.reduce((a, b) => a + b, 0),
    0,
  );
  city.services = s;
  assert.equal(serviceReport(city).storedWaste, 40);
  assert.equal(serviceReport(city).uncollectedWaste, 100);
});
test("validator is strict about array sizes quantities IDs references paths and stable clock", () => {
  const { city } = fixture();
  initialize(city);
  assert.equal(validateServices(city.services, city), true);
  for (const change of [
    (s) => (s.waste = []),
    (s) => (s.patients[0] = -1),
    (s) => (s.nextId = 0),
    (s) => (s.lastMonth = 0),
    (s) => (s.extra = 1),
    (s) => (s.counters.generatedWaste = NaN),
    (s) => (s.vehicles = [{ id: 1 }]),
    (s) => (s.tasks = [{ id: 1 }]),
  ]) {
    const s = structuredClone(city.services);
    change(s);
    assert.throws(() => validateServices(s, city));
  }
});
test("reports are pure and opening occupancy generates persistent local bins once per month", () => {
  const { city, metrics } = fixture();
  const i = place(city, "residential", 12, 15, { occupancy: 24 });
  initialize(city);
  const before = structuredClone(city);
  serviceReport(city, metrics);
  assert.deepEqual(city, before);
  assert.equal(advanceServices(city, metrics).changed, true);
  assert.equal(city.services.waste[i], 24);
  const after = structuredClone(city);
  assert.equal(advanceServices(city, metrics).changed, false);
  assert.deepEqual(city, after);
  assert.equal(serviceReport(city, metrics).conservation.waste, true);
});
test("fire response requires actual arrival along a road and does not teleport by coverage", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 1, 15);
  const target = place(city, "residential", 20, 15, { fire: 3 });
  initialize(city);
  next(city, metrics);
  assert.equal(city.tiles[target].fire, 3);
  assert.ok(
    city.services.vehicles.some(
      (v) =>
        v.kind === "fire" &&
        v.status === "outbound" &&
        v.position !== index(20, 16),
    ),
  );
  for (let n = 0; n < 4; n++) next(city, metrics);
  assert.equal(city.tiles[target].fire, 0);
  assert.equal(city.services.counters.extinguishedFires, 1);
  assert.ok(city.services.counters.completedTrips >= 1);
});
test("disconnected fire incidents remain unserved rather than receiving radius service", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 1, 15);
  const t = place(city, "residential", 5, 15, { fire: 3 });
  city.tiles[index(3, 16)].type = "empty";
  initialize(city);
  for (let n = 0; n < 4; n++) next(city, metrics);
  assert.equal(city.tiles[t].fire, 3);
  assert.equal(city.services.counters.extinguishedFires, 0);
});
test("garbage pickup creates cargo and storage only changes after a real return arrival", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(240);
  const depot = ready(city, metrics, "landfill", 1, 15);
  const target = place(city, "residential", 20, 15);
  city.backlogs.waste = 200;
  city.tiles[target].occupancy = 1;
  initialize(city);
  city.tiles[target].occupancy = 0;
  next(city, metrics);
  assert.equal(city.tiles[depot].stored, 0);
  for (let n = 0; n < 2; n++) next(city, metrics);
  let r = serviceReport(city, metrics);
  assert.ok(r.carriedWaste > 0);
  assert.equal(city.tiles[depot].stored, 0);
  for (let n = 0; n < 5; n++) next(city, metrics);
  r = serviceReport(city, metrics);
  assert.equal(city.tiles[depot].stored, 200);
  assert.equal(r.carriedWaste, 0);
  assert.equal(r.conservation.waste, true);
});
test("broken return roads retain cargo and restore movement after repair", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(240);
  ready(city, metrics, "landfill", 1, 15);
  const target = place(city, "residential", 20, 15, { occupancy: 1 });
  city.backlogs.waste = 200;
  initialize(city);
  city.tiles[target].occupancy = 0;
  for (let n = 0; n < 3; n++) next(city, metrics);
  const before = serviceReport(city, metrics);
  assert.ok(before.carriedWaste > 0);
  city.tiles[index(10, 16)].type = "empty";
  for (let n = 0; n < 4; n++) next(city, metrics);
  const blocked = serviceReport(city, metrics);
  assert.equal(blocked.carriedWaste, before.carriedWaste);
  assert.equal(blocked.storedWaste, 0);
  assert.equal(blocked.conservation.waste, true);
  city.tiles[index(10, 16)].type = "road";
  for (let n = 0; n < 6; n++) next(city, metrics);
  assert.equal(serviceReport(city, metrics).carriedWaste, 0);
  assert.equal(serviceReport(city, metrics).storedWaste, 200);
});
test("closed home facility cannot swallow garbage; cargo reroutes to an operational alternative", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(240);
  const home = ready(city, metrics, "landfill", 1, 15);
  const t = place(city, "residential", 20, 15, { occupancy: 1 });
  city.backlogs.waste = 100;
  initialize(city);
  city.tiles[t].occupancy = 0;
  for (let n = 0; n < 3; n++) next(city, metrics);
  assert.ok(serviceReport(city, metrics).carriedWaste > 0);
  city.tiles[home].enabled = false;
  const alternate = ready(city, metrics, "landfill", 27, 15);
  for (let n = 0; n < 7; n++) next(city, metrics);
  assert.equal(city.tiles[home].stored, 0);
  assert.equal(city.tiles[alternate].stored, 100);
  assert.equal(serviceReport(city, metrics).conservation.waste, true);
});
test("recycling deliveries conserve cargo and bound ore output at its inventory capacity", () => {
  const { city, metrics } = fixture();
  const d = ready(city, metrics, "recycling", 1, 15);
  const t = place(city, "residential", 4, 15, { occupancy: 1 });
  city.inventory.ore = 999999;
  city.backlogs.waste = 30;
  initialize(city);
  city.tiles[t].occupancy = 0;
  for (let n = 0; n < 5; n++) next(city, metrics);
  const r = serviceReport(city, metrics);
  assert.equal(city.inventory.ore, 1000000);
  assert.equal(city.services.counters.processedWaste, 10);
  assert.equal(r.uncollectedWaste + r.carriedWaste, 20);
  assert.equal(r.conservation.waste, true);
  assert.equal(city.tiles[d].stored, 0);
});
test("medical pickup and bed admission precede finite later treatment", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "clinic", 1, 15);
  initialize(city);
  incident(city, "medical", 4, 15, 40);
  const before = serviceReport(city, metrics);
  assert.equal(before.untreatedPatients, 40);
  next(city, metrics);
  assert.ok(city.services.beds.reduce((a, b) => a + b, 0) > 0);
  assert.equal(city.services.counters.treatedPatients, 0);
  for (let n = 0; n < 30; n++) next(city, metrics);
  const r = serviceReport(city, metrics);
  assert.equal(r.untreatedPatients, 0);
  assert.equal(city.services.counters.treatedPatients, 40);
  assert.equal(r.conservation.patients, true);
});
test("crime pickup respects finite custody and cases resolve only after return and processing", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "police", 1, 15);
  initialize(city);
  incident(city, "crime", 4, 15, 40);
  next(city, metrics);
  assert.equal(city.services.counters.resolvedCrimes, 0);
  assert.ok(city.services.custody.reduce((a, b) => a + b, 0) > 0);
  for (let n = 0; n < 30; n++) next(city, metrics);
  assert.equal(serviceReport(city, metrics).unresolvedCrimes, 0);
  assert.equal(city.services.counters.resolvedCrimes, 40);
  assert.equal(serviceReport(city, metrics).conservation.crimes, true);
});
test("zero funding or absent real drivers prevents dispatch without deleting cases", () => {
  for (const cause of ["funding", "staff", "power"]) {
    const { city, metrics } = fixture();
    const i = ready(city, metrics, "clinic", 1, 15);
    initialize(city);
    incident(city, "medical", 4, 15, 10);
    if (cause === "funding") city.funding.clinic = 0;
    if (cause === "staff") metrics.jobFill[i] = 0;
    if (cause === "power") metrics.utilities.power.ratio = 0;
    for (let n = 0; n < 3; n++) next(city, metrics);
    assert.equal(serviceReport(city, metrics).untreatedPatients, 10);
    assert.equal(city.services.counters.treatedPatients, 0);
    assert.equal(serviceReport(city, metrics).activeFleet, 0);
  }
});
test("demolition preserves stored waste admitted patients and custody before clearing source", () => {
  const { city, metrics } = fixture();
  const l = ready(city, metrics, "landfill", 1, 15, { stored: 60 });
  initialize(city);
  assert.equal(preserveDemolition(city, l).ok, true);
  assert.equal(city.tiles[l].stored, 0);
  assert.equal(city.services.waste[l], 60);
  assert.equal(preserveDemolition(city, l).ok, true);
  assert.equal(city.services.waste[l], 60);
  assert.equal(serviceReport(city, metrics).conservation.waste, true);
});
test("invalid incidents cannot mutate RNG cash queues or IDs", () => {
  const { city } = fixture();
  initialize(city);
  city.rng = 123;
  for (const action of [
    null,
    { type: "constructor", kind: "medical", x: 1, y: 1, amount: 1 },
    { type: "serviceIncident", kind: "constructor", x: 1, y: 1, amount: 1 },
    { type: "serviceIncident", kind: "medical", x: 1.5, y: 1, amount: 1 },
    { type: "serviceIncident", kind: "medical", x: 1, y: 1, amount: 1e99 },
    {
      type: "serviceIncident",
      kind: "medical",
      x: 1,
      y: 1,
      amount: 1,
      extra: 1,
    },
  ]) {
    const before = structuredClone(city);
    assert.equal(serviceAction(city, action).ok, false);
    assert.deepEqual(city, before);
  }
});
test("congestion reduces movement budget and save state retains actual adjacent paths", () => {
  const a = fixture(),
    b = fixture();
  for (const f of [a, b]) {
    ready(f.city, f.metrics, "fire", 1, 15);
    place(f.city, "residential", 20, 15, { fire: 3 });
    initialize(f.city);
  }
  b.metrics.roadLoad.fill(80);
  next(a.city, a.metrics);
  next(b.city, b.metrics);
  const va = a.city.services.vehicles.find((v) => v.status === "outbound"),
    vb = b.city.services.vehicles.find((v) => v.status === "outbound");
  assert.ok(va.position > vb.position);
  const copy = structuredClone(a.city.services);
  assert.equal(validateServices(copy, a.city), true);
  copy.vehicles.find((v) => v.status === "outbound").path = [
    index(1, 16),
    index(20, 16),
  ];
  assert.throws(() => validateServices(copy, a.city));
});
test("new emergencies preempt queued garbage tickets when the bounded task queue is full", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 1, 15);
  for (let i = 0; i < N; i++)
    if (city.tiles[i].type === "empty")
      Object.assign(city.tiles[i], { type: "residential", occupancy: 1 });
  initialize(city);
  next(city, metrics);
  assert.equal(city.services.tasks.length, 128);
  const target = place(city, "residential", 5, 15, { fire: 3 });
  next(city, metrics);
  assert.equal(city.tiles[target].fire, 0);
  assert.equal(city.services.counters.extinguishedFires, 1);
});
test("overflowing a valid near-bound bin leaves the entire standalone city unchanged", () => {
  const { city, metrics } = fixture();
  const i = place(city, "residential", 5, 15, { occupancy: 1 });
  initialize(city);
  city.services.waste[i] = 1e12;
  city.services.counters.generatedWaste = 1e12;
  assert.equal(validateServices(city.services, city), true);
  const before = structuredClone(city);
  assert.throws(() => advanceServices(city, metrics));
  assert.deepEqual(city, before);
});
test("finite admitted beds remain full while a closed clinic preserves unmet patients", () => {
  const { city, metrics } = fixture();
  const c = ready(city, metrics, "clinic", 1, 15);
  initialize(city);
  incident(city, "medical", 4, 15, 40);
  next(city, metrics);
  const before = serviceReport(city, metrics).untreatedPatients;
  city.tiles[c].enabled = false;
  for (let n = 0; n < 3; n++) next(city, metrics);
  assert.equal(serviceReport(city, metrics).untreatedPatients, before);
  assert.equal(serviceReport(city, metrics).conservation.patients, true);
});
test("demolishing an occupied clinic or station returns admitted cases to persistent local queues", () => {
  for (const [type, kind, field] of [
    ["clinic", "medical", "beds"],
    ["police", "crime", "custody"],
  ]) {
    const { city, metrics } = fixture();
    const d = ready(city, metrics, type, 1, 15);
    initialize(city);
    incident(city, kind, 4, 15, 6);
    next(city, metrics);
    assert.ok(city.services[field][d] > 0);
    const cases = kind === "medical" ? "patients" : "crimes";
    const amount = city.services[field][d];
    assert.equal(preserveDemolition(city, d).ok, true);
    assert.equal(city.services[field][d], 0);
    assert.equal(city.services[cases][d], amount);
    city.tiles[d].type = "empty";
    assert.ok(
      Object.values(serviceReport(city, metrics).conservation).every(Boolean),
    );
  }
});
test("polluted homes generate deterministic bounded medical demand while healthy homes do not", () => {
  for (const dirty of [false, true]) {
    const { city, metrics } = fixture();
    const h = place(city, "residential", 12, 15, { occupancy: 24 });
    metrics.environment = {
      air: Array(N).fill(0),
      deliveredWaterContamination: dirty ? 30 : 0,
    };
    city.month = (12 - (h % 12)) % 12;
    initialize(city);
    next(city, metrics);
    assert.equal(city.services.counters.createdPatients, dirty ? 1 : 0);
    assert.equal(city.services.counters.naturalPatients, dirty ? 1 : 0);
  }
});
test("high crime pressure and unemployment create bounded deterministic cases without RNG calls", () => {
  const { city, metrics } = fixture();
  const h = place(city, "residential", 12, 15, { occupancy: 24 });
  city.rng = 456;
  city.month = (12 - (h % 12)) % 12;
  metrics.crime = 70;
  metrics.unemployment = 30;
  initialize(city);
  next(city, metrics);
  assert.equal(city.services.counters.createdCrimes, 1);
  assert.equal(city.services.counters.naturalCrimes, 1);
  assert.equal(city.rng, 456);
});
test("material units survive landfill demolition and recollection without double-counted stock", () => {
  const { city, metrics } = fixture();
  const d = ready(city, metrics, "landfill", 1, 15, { stored: 100 });
  initialize(city);
  assert.equal(preserveDemolition(city, d).ok, true);
  city.tiles[d].type = "empty";
  const alternate = ready(city, metrics, "landfill", 5, 15);
  for (let n = 0; n < 6; n++) next(city, metrics);
  assert.equal(city.tiles[alternate].stored, 100);
  assert.equal(city.services.counters.initialStoredWaste, 100);
  assert.equal(city.services.counters.processedWaste, 0);
  assert.equal(serviceReport(city, metrics).conservation.waste, true);
});
test("saved IDs and cross references cannot be aliased or forge completed work", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 1, 15);
  place(city, "residential", 20, 15, { fire: 3 });
  initialize(city);
  next(city, metrics);
  for (const change of [
    (s) => s.vehicles.push(structuredClone(s.vehicles[0])),
    (s) => (s.tasks[0].vehicleId = 999999),
    (s) => (s.vehicles.find((v) => v.taskId !== null).taskId = 999999),
    (s) => (s.counters.completedTrips = -1),
  ]) {
    const copy = structuredClone(city.services);
    change(copy);
    assert.throws(() => validateServices(copy, city));
  }
});
test("services state remains bounded saveable and conserved over repeated generation and deliveries", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "recycling", 1, 15, { modules: 3 });
  ready(city, metrics, "clinic", 5, 15);
  ready(city, metrics, "police", 9, 15);
  for (let x = 12; x < 25; x++)
    place(city, "residential", x, 15, { occupancy: 24 });
  initialize(city);
  for (let n = 0; n < 60; n++) {
    next(city, metrics);
    assert.equal(validateServices(city.services, city), true);
    assert.ok(city.services.vehicles.length <= 64);
    assert.ok(city.services.tasks.length <= 128);
    assert.ok(
      Object.values(serviceReport(city, metrics).conservation).every(Boolean),
    );
  }
  assert.ok(Buffer.byteLength(JSON.stringify(city.services)) < 1000000);
});

test("near-bound accepted service states request whole-month drafting before preceding model mutations", () => {
  const { city } = fixture();
  initialize(city);
  assert.equal(serviceNeedsDraft(city), false);
  city.services.nextId = 1e12;
  assert.equal(serviceNeedsDraft(city), true);
  city.services.nextId = 1;
  city.services.waste[2] = 1e12;
  city.services.counters.generatedWaste = 1e12;
  assert.equal(validateServices(city.services, city), true);
  assert.equal(serviceNeedsDraft(city), true);
});

test("hospital fleet and throughput require all twelve configured staff rather than treating eight as full", () => {
  const partial = fixture(),
    full = fixture();
  for (const f of [partial, full]) {
    const h = ready(f.city, f.metrics, "hospital", 1, 15);
    f.metrics.jobFill[h] = f === partial ? 8 : 12;
    initialize(f.city);
    incident(f.city, "medical", 4, 15, 40);
    next(f.city, f.metrics);
  }
  assert.ok(
    serviceReport(partial.city).totalFleet <
      serviceReport(full.city).totalFleet,
  );
});

// Independent breadth-first reference retains the pre-optimization neighbor/tie order.
function referenceServicePath(city, start, target) {
  const valid = (i) =>
    ["road", "avenue", "bridge"].includes(city.tiles[i]?.type) &&
    city.tiles[i].enabled !== false &&
    !city.tiles[i].fire;
  const near = (i) => {
    const out = [];
    if (i % W) out.push(i - 1);
    if (i % W < W - 1) out.push(i + 1);
    if (i >= W) out.push(i - W);
    if (i < N - W) out.push(i + W);
    return out;
  };
  if (!valid(start)) return null;
  const goals = new Set(valid(target) ? [target] : near(target).filter(valid));
  const queue = [start],
    previous = Array(N).fill(-2);
  previous[start] = -1;
  let goal = -1;
  for (let k = 0; k < queue.length; k++) {
    const here = queue[k];
    if (goals.has(here)) {
      goal = here;
      break;
    }
    for (const next of near(here))
      if (previous[next] === -2 && valid(next)) {
        previous[next] = here;
        queue.push(next);
      }
  }
  if (goal < 0) return null;
  const path = [];
  for (let p = goal; p !== -1; p = previous[p]) path.push(p);
  return path.reverse();
}
test("shared-start route planning preserves fresh BFS routes and tie order for distinct incidents", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 1, 15);
  for (let x = 0; x < 39; x++) place(city, "road", x, 14);
  for (let y = 14; y <= 16; y++) place(city, "road", 20, y);
  place(city, "residential", 30, 15, { fire: 3 });
  place(city, "residential", 32, 15, { fire: 3 });
  initialize(city);
  const before = structuredClone(city);
  next(city, metrics);
  const vehicles = city.services.vehicles.filter(
    (v) => v.status === "outbound",
  );
  assert.equal(vehicles.length, 2);
  for (const v of vehicles) {
    const task = city.services.tasks.find((t) => t.id === v.taskId);
    assert.deepEqual(
      v.path,
      referenceServicePath(before, v.path[0], task.target),
    );
  }
  assert.notEqual(vehicles[0].path, vehicles[1].path);
});
test("routing is recomputed on the next service tick after a road deletion changes the shortest path", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 1, 15);
  place(city, "residential", 32, 15, { fire: 3 });
  for (let x = 10; x <= 32; x++) place(city, "road", x, 18);
  for (const x of [10, 32])
    for (let y = 16; y <= 18; y++) place(city, "road", x, y);
  initialize(city);
  next(city, metrics);
  const v = city.services.vehicles.find((v) => v.status === "outbound"),
    position = v.position;
  place(city, "empty", 11, 16);
  const expected = referenceServicePath(city, position, index(32, 15));
  assert.ok(expected);
  next(city, metrics);
  const moved = city.services.vehicles.find((x) => x.id === v.id);
  assert.deepEqual(moved.path, expected);
  assert.ok(!moved.path.includes(index(11, 16)));
});
test("extinguishing an actual road invalidates routing within the same service tick", () => {
  const { city, metrics } = fixture();
  ready(city, metrics, "fire", 2, 15);
  const landfill = ready(city, metrics, "landfill", 1, 15);
  const home = place(city, "residential", 20, 15, { occupancy: 1 });
  city.backlogs.waste = 100;
  metrics.roadLoad.fill(240);
  initialize(city);
  city.tiles[home].occupancy = 0;
  for (let n = 0; n < 3; n++) next(city, metrics);
  assert.ok(serviceReport(city, metrics).carriedWaste > 0);
  city.tiles[index(10, 16)].fire = 1;
  metrics.roadLoad.fill(0);
  next(city, metrics);
  assert.equal(city.tiles[index(10, 16)].fire, 0);
  assert.equal(city.tiles[landfill].stored, 100);
  assert.equal(serviceReport(city, metrics).carriedWaste, 0);
});
test("reported fleet arrays are detached and closed destinations do not reuse an earlier route choice", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(240);
  const a = ready(city, metrics, "landfill", 1, 15);
  const h = place(city, "residential", 20, 15, { occupancy: 1 });
  city.backlogs.waste = 100;
  initialize(city);
  city.tiles[h].occupancy = 0;
  for (let n = 0; n < 3; n++) next(city, metrics);
  const snapshot = structuredClone(city),
    report = serviceReport(city, metrics);
  report.vehicles[0].position = 0;
  report.vehicles.push({ id: -1 });
  report.counters.completedTrips = -1;
  assert.deepEqual(city, snapshot);
  city.tiles[a].enabled = false;
  const b = ready(city, metrics, "landfill", 27, 15);
  for (let n = 0; n < 7; n++) next(city, metrics);
  assert.equal(city.tiles[a].stored, 0);
  assert.equal(city.tiles[b].stored, 100);
});

test("a newly staffed provider receives a fair fleet slot when the global cap is occupied by idle vehicles", () => {
  const { city, metrics } = fixture();
  for (let x = 1; x <= 16; x++) ready(city, metrics, "clinic", x, 15, { modules: 3 });
  initialize(city);
  next(city, metrics);
  assert.equal(city.services.vehicles.length, 64);
  assert.ok(city.services.vehicles.every((v) => v.status === "idle"));
  const depot = ready(city, metrics, "landfill", 30, 15);
  const target = place(city, "residential", 31, 15, { occupancy: 24 });
  next(city, metrics);
  assert.ok(city.services.vehicles.some((v) => v.home === depot), "idle fleets must release a fair slot to a new operational provider");
  assert.ok(city.services.vehicles.length <= 64);
  for (let n = 0; n < 4; n++) next(city, metrics);
  assert.ok(city.tiles[depot].stored > 0, "new provider actually collects and returns local waste");
  assert.ok(city.services.waste[target] < 24 * 5);
  assert.equal(serviceReport(city).conservation.waste, true);
});

test("redistributing idle fleet slots preserves blocked loaded journeys and their task identities", () => {
  const { city, metrics } = fixture();
  metrics.roadLoad.fill(240);
  ready(city, metrics, "landfill", 1, 15);
  const target = place(city, "residential", 20, 15, { occupancy: 1 });
  city.backlogs.waste = 200;
  initialize(city);
  city.tiles[target].occupancy = 0;
  for (let n = 0; n < 3; n++) next(city, metrics);
  const loaded = city.services.vehicles.filter((v) => v.payload > 0).map((v) => ({id: v.id, taskId: v.taskId, payload: v.payload}));
  assert.ok(loaded.length > 0);
  city.tiles[index(10, 16)].type = "empty";
  for (let x = 1; x <= 16; x++) ready(city, metrics, "clinic", x, 17, { modules: 3 });
  next(city, metrics);
  assert.equal(city.services.vehicles.length, 64);
  const police = ready(city, metrics, "police", 30, 17);
  next(city, metrics);
  assert.ok(city.services.vehicles.some((v) => v.home === police));
  assert.equal(city.services.vehicles.length, 64);
  for (const old of loaded) {
    const vehicle = city.services.vehicles.find((v) => v.id === old.id);
    assert.ok(vehicle);
    assert.equal(vehicle.taskId, old.taskId);
    assert.equal(vehicle.payload, old.payload);
    const task = city.services.tasks.find((t) => t.id === old.taskId);
    assert.equal(task.vehicleId, old.id);
    assert.equal(task.status, "returning");
  }
  assert.equal(serviceReport(city).conservation.waste, true);
  assert.equal(validateServices(city.services, city), true);
});
