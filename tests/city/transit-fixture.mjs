import assert from "node:assert/strict";
import { createCity, applyAction } from "../../static/cmd-city/core.mjs";
import { createHouseholds } from "../../static/cmd-city/households.mjs";
import { createServices } from "../../static/cmd-city/services.mjs";
const ix = (x, y) => y * 40 + x;
export function transitCity(mode) {
  const city = createCity({ starter: false, sandbox: true });
  for (const t of city.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
    });
  city.tiles[ix(0, 16)].type = "road";
  city.cash = 1e8;
  city.research.completed = ["cleanEnergy", "transit", "maglev"];
  const build = (tool, x, y) =>
    assert.equal(
      applyAction(city, { type: "build", tool, x, y }).ok,
      true,
      `${tool} at ${x},${y}`,
    );
  for (let x = 1; x < 20; x++) build("road", x, 16);
  for (const [type, x] of [
    ["wind", 2],
    ["water", 3],
    ["sewage", 4],
    ["landfill", 5],
    ["residential", 7],
    ["industrial", 16],
  ])
    build(type, x, 15);
  if (mode === "ferry")
    for (let x = 7; x <= 16; x++) city.tiles[ix(x, 18)].terrain = "water";
  const stop = {
    streetcar: "streetcarStop",
    ferry: "ferryTerminal",
    maglev: "maglevStation",
  }[mode];
  for (const x of [7, 16]) build(stop, x, 17);
  if (mode !== "ferry")
    for (let x = 7; x <= 16; x++) build(`${mode}Track`, x, 18);
  city.tiles[ix(7, 15)].occupancy = 24;
  city.tiles[ix(16, 15)].occupancy = 18;
  city.households = createHouseholds(city);
  city.services = createServices(city);
  return city;
}
