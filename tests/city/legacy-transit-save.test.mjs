import test from "node:test";
import assert from "node:assert/strict";
import { createCity } from "../../static/cmd-city/core.mjs";
import { parseCity } from "../../static/cmd-city/save.mjs";
for (const version of [1, 2])
  test(`schema ${version} rejects a research topic introduced with new transport`, () => {
    const city = createCity({ seed: 510 });
    city.version = version;
    delete city.households;
    delete city.services;
    delete city.future;
    if (version === 1) {
      delete city.environment;
      delete city.civic;
      for (const t of city.tiles)
        if (["townHall", "waterFilter", "cleanup", "nuclear"].includes(t.type))
          Object.assign(t, { type: "empty", occupancy: 0 });
    }
    city.research.completed = ["cleanEnergy", "transit"];
    assert.equal(parseCity(JSON.stringify(city)).version, 4);
    city.research.completed.push("maglev");
    assert.throws(() => parseCity(JSON.stringify(city)));
  });
