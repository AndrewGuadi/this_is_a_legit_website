import test from "node:test";
import assert from "node:assert/strict";
import { createCity, measure } from "../../static/cmd-city/core.mjs";

test("repeated reports remain identical to fresh-city reports after routing and coverage changes", () => {
  const city = createCity({ seed: 402 });
  const home = city.tiles.findIndex((t) => t.type === "residential");
  const road = city.tiles.findIndex((t) => t.type === "road");
  const facility = city.tiles.findIndex((t) => t.type === "park");
  const changes = [
    () => (city.funding.school = 150),
    () => (city.funding.school = 0),
    () => (city.tiles[facility].type = "school"),
    () => (city.tiles[facility].modules = 3),
    () => (city.tiles[facility].enabled = false),
    () => (city.tiles[facility].enabled = true),
    () => (city.tiles[facility].fire = 3),
    () => (city.tiles[facility].fire = 0),
    () => city.research.completed.push("serviceDrones", "transit"),
    () => (city.tiles[road].enabled = false),
    () => (city.tiles[road].enabled = true),
    () => (city.tiles[home].occupancy = 24),
    () => (city.regionalPower = 1000),
    () => (city.environment.radiation[facility] = 300),
    () => (city.environment.radiation[facility] = 0),
  ];
  for (const change of changes) {
    measure(city);
    change();
    assert.deepEqual(measure(city), measure(structuredClone(city)));
  }
});

test("mutating a returned report cannot corrupt future coverage or commute reports", () => {
  const city = createCity({ seed: 403 });
  const expected = measure(city);
  const report = measure(city);
  for (const a of Object.values(report.coverage)) a.fill(-999);
  for (const key of [
    "jobFill",
    "homeEmployment",
    "roadLoad",
    "railLoad",
    "busLoad",
  ])
    report[key].fill(-999);
  assert.deepEqual(measure(city), expected);
});
