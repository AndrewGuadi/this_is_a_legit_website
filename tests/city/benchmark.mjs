import { createHouseholds } from "../../static/cmd-city/households.mjs";
import { createServices } from "../../static/cmd-city/services.mjs";
/** Reproducible synthetic stress measurement, not physical-phone evidence. */
import os from "node:os";
import {
  createCity,
  advanceMonth,
  measure,
} from "../../static/cmd-city/core.mjs";
import { capacity } from "../../static/cmd-city/content.mjs";
const s = createCity({ starter: false, seed: 42 });
let count = 0;
for (let i = 0; i < s.tiles.length; i++) {
  const t = s.tiles[i],
    x = i % 40,
    y = Math.floor(i / 40);
  t.terrain = "land";
  if (x % 4 === 0 || y % 4 === 0) t.type = "avenue";
  else {
    const k = count++;
    t.type =
      k < 30
        ? "wind"
        : k < 60
          ? "water"
          : k < 90
            ? "sewage"
            : k < 120
              ? "landfill"
              : k % 4 === 0
                ? "industrial"
                : k % 4 === 1
                  ? "commercial"
                  : "residential";
    t.level = 3;
    t.occupancy = capacity(t);
  }
}
s.tiles[640].type = "road";
// This synthetic city is assembled outside player actions. Declare its initial
// demographic capital and material baselines once, never reset during the run.
s.households = createHouseholds(s);
s.services = createServices(s);
const initial = measure(s),
  times = [];
for (let i = 0; i < 120; i++) {
  const start = performance.now();
  advanceMonth(s);
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      node: process.version,
      cpu: os.cpus()[0].model,
      platform: `${os.platform()} ${os.arch()}`,
      tiles: s.tiles.length,
      initialPopulation: initial.population,
      months: s.month,
      medianMs: times[60],
      p95Ms: times[114],
      maxMs: times.at(-1),
      targetP95Ms: 20,
      targetMet: times[114] < 20,
      finalPopulation: measure(s).population,
    },
    null,
    2,
  ),
);
