import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  measure,
  advanceMonth,
} from "../../static/cmd-city/core.mjs";
import {
  createServiceReportSnapshot,
  serviceReport,
} from "../../static/cmd-city/services.mjs";
import {
  createEnvironmentReportSnapshot,
  environmentReport,
} from "../../static/cmd-city/environment.mjs";

test("service snapshots own their data, retain historical stock, and use current population penalties", () => {
  const city = createCity({ seed: 507 });
  city.services.patients[0] = 3;
  city.services.counters.createdPatients = 3;
  city.services.nextId = 2;
  city.services.vehicles.push({
    id: 1,
    kind: "medical",
    home: 0,
    position: 640,
    status: "idle",
    path: [],
    cursor: 0,
    payload: 0,
    capacity: 2,
    taskId: null,
    destination: null,
  });
  const snapshot = createServiceReportSnapshot(city);
  const expected = serviceReport(city, { population: 100 });
  assert.deepEqual(snapshot({ population: 100 }), expected);
  assert.equal(snapshot({ population: 10 }).healthPenalty, 30);
  const returned = snapshot({ population: 100 });
  returned.vehicles[0].kind = "fire";
  returned.counters.createdPatients = 999;
  returned.conservation.patients = false;
  assert.deepEqual(snapshot({ population: 100 }), expected);
  city.services.patients[0] = 900;
  assert.deepEqual(snapshot({ population: 100 }), expected);
  assert.throws(() => measure(city));
  assert.throws(() => createServiceReportSnapshot(city));
});

test("environment snapshots isolate captured fields while public reports validate current fields", () => {
  const city = createCity({ seed: 508 }),
    metrics = measure(city);
  const snapshot = createEnvironmentReportSnapshot(city);
  const expected = environmentReport(city, metrics);
  const returned = snapshot(metrics);
  assert.deepEqual(returned, expected);
  returned.air.fill(99);
  returned.ground.fill(99);
  returned.radiation.fill(99);
  returned.blockers[0].push("caller change");
  assert.deepEqual(snapshot(metrics), expected);
  city.environment.air[0] = 250;
  assert.equal(snapshot(metrics).air[0], 0);
  assert.equal(environmentReport(city, metrics).air[0], 25);
  city.environment.air[0] = -1;
  assert.throws(() => measure(city));
});

test("month-end cached phase reports equal fresh reports through real fire decay and facility destruction", () => {
  const city = createCity({ seed: 509 });
  const home = city.tiles.findIndex((t) => t.type === "residential");
  city.tiles[home].fire = 2;
  for (let month = 0; month < 5; month++) {
    const result = advanceMonth(city);
    assert.deepEqual(result, measure(structuredClone(city)));
  }
});
