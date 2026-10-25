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

if(process.argv[2] === 'hazards') {
  city.tiles[idx(25,1)].type='coalPlant';
  city.tiles[idx(25,5)].type='nuclear';
  city.inventory.coal=10000;city.inventory.ore=10000;
  city.tiles[idx(31,1)].fire=2;
  city.environment.ground[idx(1,1)]=900;
  city.environment.radiation[idx(39,1)]=900;
  city.services.patients[idx(3,1)]=4;
  city.services.counters.createdPatients=4;
  city.services.crimes[idx(3,1)]=3;
  city.services.counters.createdCrimes=3;
}
const hashes=[];
for(let month=0;month<120;month++) {
  if(process.argv[2] === 'hazards'){
    if(month===12) city.tiles[idx(12,16)].enabled=false;
    if(month===18) city.tiles[idx(12,16)].enabled=true;
    if(month===24) city.tiles[idx(31,5)].enabled=false;
    if(month===30) city.tiles[idx(31,5)].enabled=true;
    if(month===36) city.tiles[idx(25,9)].fire=2;
  }
  const metrics=advanceMonth(city);
  const encoded=serializeCity(city);
  assert.deepEqual(parseCity(encoded),city);
  hashes.push(crypto.createHash('sha256').update(JSON.stringify({city,metrics})).digest('hex'));
}
console.log(JSON.stringify(hashes));
