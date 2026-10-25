import { createHouseholds } from "../../static/cmd-city/households.mjs";
import { createServices } from "../../static/cmd-city/services.mjs";
/** Sustained synthetic-load evidence. No per-month state replenishment or model overrides. */
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  createCity,
  advanceMonth,
  measure,
} from "../../static/cmd-city/core.mjs";
import { capacity } from "../../static/cmd-city/content.mjs";
import { serializeCity, parseCity } from "../../static/cmd-city/save.mjs";

const W = 40,
  H = 32,
  MONTHS = 120;
const output = path.resolve("dev_docs/evidence/CMD-03/sustained");
const city = createCity({
  starter: false,
  seed: 42002,
  name: "Sustained Riverplain Benchmark",
  sandbox: true,
});
const idx = (x, y) => y * W + x;
const frontage = (x, y) =>
  (x > 0 && (x - 1) % 4 === 0) ||
  (x + 1 < W && (x + 1) % 4 === 0) ||
  (y > 0 && (y - 1) % 4 === 0) ||
  (y + 1 < H && (y + 1) % 4 === 0);
const place = (type, x, y, modules = 0) => {
  const t = city.tiles[idx(x, y)];
  assert.equal(t.type, "park", `Fixture collision at ${x},${y}: ${t.type}`);
  Object.assign(t, { type, modules, level: 1, occupancy: 0 });
  t.occupancy = ["residential", "commercial", "industrial"].includes(type)
    ? capacity(t)
    : 0;
};
// A prebuilt synthetic city, not a claim that these assets were acquired through progression.
// Every tile is populated exactly once before the run. Interior-block parks may lack road
// frontage; no residence, utility, shop, workplace or civic service is placed there.
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    Object.assign(city.tiles[idx(x, y)], {
      terrain: "land",
      type: x % 4 === 0 || y % 4 === 0 ? "avenue" : "park",
      occupancy: 0,
      level: 1,
      modules: 0,
      fire: 0,
      resource: null,
      reserve: 0,
      age: 0,
      stored: 0,
      enabled: true,
    });
for (const x of [1, 5]) for (const y of [1, 9, 17, 25]) place("water", x, y, 3);
for (const y of [1, 5, 9, 13, 17, 21, 25, 29]) {
  place("wind", 25, y, 3);
  place("sewage", 27, y, 3);
  place("recycling", 31, y, 3);
}
for (const x of [3, 11, 19])
  for (const y of [3, 11, 19, 27]) place("school", x, y, 3);
for (const x of [1, 9, 17])
  for (const y of [5, 13, 21, 29]) place("clinic", x, y, 3);
for (const x of [7, 15]) for (const y of [7, 15, 23]) place("police", x, y, 3);
place("townHall", 23, 15, 0);
const western = [];
for (let y = 1; y < H; y++)
  for (let x = 1; x <= 23; x++)
    if (city.tiles[idx(x, y)].type === "park" && frontage(x, y))
      western.push({ x, y });
western.sort(
  (a, b) =>
    ((a.x * 7 + a.y * 11) % 97) - ((b.x * 7 + b.y * 11) % 97) ||
    a.y - b.y ||
    a.x - b.x,
);
assert.ok(western.length >= 320);
for (let n = 0; n < 320; n++)
  place(n < 200 ? "residential" : "commercial", western[n].x, western[n].y);
let industry = 0;
for (let x = 39; x >= 25 && industry < 80; x--)
  for (let y = 1; y < H && industry < 80; y++) {
    if (city.tiles[idx(x, y)].type === "park" && frontage(x, y)) {
      place("industrial", x, y);
      industry++;
    }
  }
assert.equal(industry, 80);
// All remaining parks are actual built types, with upkeep charged by the real model.
// Modules on functional parks expand their real coverage; disconnected park centers do not.
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (city.tiles[idx(x, y)].type === "park" && frontage(x, y))
      city.tiles[idx(x, y)].modules = 3;
city.cash = 1000000000; // Explicit synthetic capital: 10,000,000 display-currency units.
city.groundwater = 1000000; // One finite citywide quantity, never duplicated or refreshed.
city.inventory.goods = 1000000; // Explicit initial goods reserve; actual monthly consumption remains active.
city.inventory.coal = 0;
city.policies.recycling = true;
city.policies.disasters = false;
city.environment.wind = "E";
city.funding = { school: 150, clinic: 150, fire: 100, police: 150 };
// Declare the assembled fixture's household external-capital and material
// baselines once, before validation. No demographic/material reset occurs later.
city.households = createHouseholds(city);
city.services = createServices(city);
assert.equal(city.version, 3);
assert.equal(city.month, 0);
assert.equal(city.environment.lastMonth, -1);
assert.equal(city.civic.lastMonth, 0);
assert.equal(city.households.lastMonth, 0);
assert.equal(city.services.lastMonth, -1);
assert.equal(city.civic.eligible, false);
const beforeJSON = serializeCity(city);
assert.deepEqual(parseCity(beforeJSON), city);
const typeCounts = Object.fromEntries(
  [...new Set(city.tiles.map((t) => t.type))]
    .sort()
    .map((type) => [type, city.tiles.filter((t) => t.type === type).length]),
);
assert.equal(typeCounts.avenue, 560);
assert.equal(typeCounts.residential, 200);
assert.equal(city.tiles.filter((t) => t.type === "empty").length, 0);
const pack = (m) => ({
  population: m.population,
  workers: m.workers,
  jobs: m.jobs,
  employed: m.employed,
  health: m.health,
  happiness: m.happiness,
  crime: m.crime,
  education: m.education,
  utilities: Object.fromEntries(
    Object.entries(m.utilities).map(([k, v]) => [
      k,
      { supply: v.supply, demand: v.demand, ratio: v.ratio },
    ]),
  ),
  cash: city.cash,
  groundwater: city.groundwater,
  goods: city.inventory.goods,
  deliveredWaterContamination: m.environment.deliveredWaterContamination,
  airExposure: m.environment.residentAirExposure,
  groundMaximum: Math.max(...city.environment.ground),
  backlog: { ...city.backlogs },
  warnings: m.warnings.slice(),
  month: city.month,
});
let current = measure(city);
const initial = pack(current),
  samples = [];
assert.equal(initial.population, 4800);
for (let i = 0; i < city.tiles.length; i++)
  if (city.tiles[i].type !== "park" && city.tiles[i].type !== "avenue")
    assert.equal(
      current.access[i],
      true,
      `Unserved functional fixture tile ${i}: ${city.tiles[i].type}`,
    );
assert.ok(
  initial.utilities.water.demand * MONTHS <= city.groundwater,
  "Initial monthly water requirement exceeds the finite120-month reserve.",
);
for (let n = 0; n < MONTHS; n++) {
  const started = performance.now();
  current = advanceMonth(city);
  const elapsedMs = performance.now() - started;
  samples.push({ elapsedMs, ...pack(current) });
}
const finalJSON = serializeCity(city);
assert.deepEqual(parseCity(finalJSON), city);
assert.equal(city.month, MONTHS);
assert.equal(city.environment.lastMonth, MONTHS - 1);
assert.equal(city.civic.lastMonth, MONTHS);
assert.equal(city.households.lastMonth, MONTHS);
assert.equal(city.services.lastMonth, MONTHS - 1);
const times = samples.map((s) => s.elapsedMs).sort((a, b) => a - b);
const numeric = (key) => [initial[key], ...samples.map((s) => s[key])];
const range = (key) => ({
  min: Math.min(...numeric(key)),
  max: Math.max(...numeric(key)),
});
const minimumPopulation = range("population").min;
const sustained = minimumPopulation >= initial.population * 0.9;
const digest = (relative) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(new URL(`../../${relative}`, import.meta.url)))
    .digest("hex");
const summary = {
  scenario: "Schema3 fully built 40x32 finite-water sustained workload",
  synthetic: true,
  modelOverrides: false,
  midRunReplenishment: false,
  months: MONTHS,
  node: process.version,
  cpu: os.cpus()[0]?.model,
  platform: `${os.platform()} ${os.arch()}`,
  cpuCount: os.cpus().length,
  tiles: city.tiles.length,
  typeCounts,
  wind: "E",
  setup:
    "200 full24-person west/upwind homes;120 full12-position localshops;80 full18-position east/downwind industries;gateway-connected griddedavenues;8each wind/pump/sewage/recycling modules3;financed actualupkeep;initial1m goods and1m finitewater.",
  initial,
  final: pack(current),
  populationRange: range("population"),
  workerRange: range("workers"),
  jobRange: range("jobs"),
  employmentRange: range("employed"),
  medianMs: (times[59] + times[60]) / 2,
  p95Ms: times[Math.ceil(times.length * 0.95) - 1],
  maxMs: times.at(-1),
  sustained,
  sustainedCriterion:
    "Every month retains at least90% of initialpopulation; no source changes or resource/populationrefreshes.",
  serialization: {
    initialValid: true,
    finalValid: true,
    initialBytes: Buffer.byteLength(beforeJSON),
    finalBytes: Buffer.byteLength(finalJSON),
  },
  markers: {
    initial: {
      month: 0,
      environmentLastMonth: -1,
      civicLastMonth: 0,
      householdsLastMonth: 0,
      servicesLastMonth: -1,
    },
    final: {
      month: city.month,
      environmentLastMonth: city.environment.lastMonth,
      civicLastMonth: city.civic.lastMonth,
      householdsLastMonth: city.households.lastMonth,
      servicesLastMonth: city.services.lastMonth,
    },
  },
  sourceHashes: Object.fromEntries(
    [
      "static/cmd-city/core.mjs",
      "static/cmd-city/content.mjs",
      "static/cmd-city/environment.mjs",
      "static/cmd-city/civic.mjs",
      "static/cmd-city/households.mjs",
      "static/cmd-city/services.mjs",
      "static/cmd-city/save.mjs",
      "tests/city/sustained-benchmark.mjs",
    ].map((f) => [f, digest(f)]),
  ),
  limitations: [
    "Synthetic initialcapital/assets/stocks, notprogression proof.",
    "Node CPU measurements, notbrowser render or physicalphone proof.",
    "A sustained workload result does not establish fullfeatureequivalence or predict everypossible city layout.",
  ],
};
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(output, "monthly-samples.json"),
  JSON.stringify(samples, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(output, "summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
if (!sustained) process.exitCode = 1;
