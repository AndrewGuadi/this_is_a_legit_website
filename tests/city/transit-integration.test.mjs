import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  applyAction,
  measure,
} from "../../static/cmd-city/core.mjs";
import { serializeCity, parseCity } from "../../static/cmd-city/save.mjs";
import { createHouseholds } from "../../static/cmd-city/households.mjs";
import { createServices } from "../../static/cmd-city/services.mjs";
import { transitCity } from "./transit-fixture.mjs";
const ix = (x, y) => y * 40 + x;

for (const mode of ["streetcar", "ferry", "maglev"])
  test(`${mode} displaces real car commuters and restores after save/reload; route removal invalidates cached assignment`, () => {
    const city = transitCity(mode),
      m = measure(city);
    assert.ok(m[`${mode}Passengers`] > 0);
    const beforeRoad = m.roadLoad[ix(12, 16)];
    const restored = parseCity(serializeCity(city));
    assert.deepEqual(measure(restored), m);
    m[`${mode}Load`].fill(9999);
    assert.ok(measure(city)[`${mode}Load`].every((x) => x !== 9999));
    if (mode === "ferry") city.tiles[ix(12, 18)].terrain = "land";
    else
      assert.equal(
        applyAction(city, { type: "bulldoze", x: 12, y: 18 }).ok,
        true,
      );
    const broken = measure(city);
    assert.equal(broken[`${mode}Passengers`], 0);
    assert.ok(broken.roadLoad[ix(12, 16)] > beforeRoad);
    assert.equal(broken.employed, m.employed);
  });
test("new infrastructure placement rejects inland ferries, unresearched maglev and ineffective track modules without charging", () => {
  for (const mode of ["streetcar", "maglev"]) {
    const city = transitCity(mode),
      before = serializeCity(city);
    assert.equal(
      applyAction(city, { type: "upgrade", x: 12, y: 18 }).ok,
      false,
    );
    assert.equal(serializeCity(city), before);
  }
  const city = transitCity("streetcar");
  city.research.completed = [];
  for (const tool of ["ferryTerminal", "maglevTrack", "maglevStation"]) {
    const before = serializeCity(city);
    assert.equal(
      applyAction(city, { type: "build", tool, x: 25, y: 15 }).ok,
      false,
    );
    assert.equal(serializeCity(city), before);
  }
});
test("a complete five-topic research save is valid but forged unresearched maglev is rejected", () => {
  const city = transitCity("maglev");
  city.research.completed.push("vertical", "serviceDrones");
  assert.deepEqual(parseCity(serializeCity(city)), city);
  city.research.completed = city.research.completed.filter(
    (x) => x !== "maglev",
  );
  assert.throws(() => parseCity(JSON.stringify(city)));
});
