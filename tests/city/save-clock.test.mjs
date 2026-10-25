import test from "node:test";
import assert from "node:assert/strict";
import { createCity, advanceMonth } from "../../static/cmd-city/core.mjs";
import { serializeCity, parseCity } from "../../static/cmd-city/save.mjs";
import {
  createClock,
  setRunning,
  setSpeed,
  advanceClock,
} from "../../static/cmd-city/clock.mjs";
test("save round trip restores authoritative state and deterministic future", () => {
  const s = createCity();
  for (let i = 0; i < 8; i++) advanceMonth(s);
  const a = parseCity(serializeCity(s));
  assert.deepEqual(a, s);
  for (let i = 0; i < 4; i++) {
    advanceMonth(a);
    advanceMonth(s);
  }
  assert.deepEqual(a, s);
});
test("malformed, oversize and unknown-version saves fail without changing the current city", () => {
  const s = createCity(),
    before = structuredClone(s);
  for (const text of [
    "{",
    "x".repeat(1048577),
    JSON.stringify({ ...s, version: 4 }),
    JSON.stringify({ ...s, cash: 1e99 }),
    JSON.stringify({ ...s, tiles: [] }),
    JSON.stringify({
      ...s,
      taxes: { residential: -3, commercial: 9, industrial: 9 },
    }),
  ])
    assert.throws(() => parseCity(text));
  assert.deepEqual(s, before);
});
test("all scalar and tile invariants are checked; unknown object keys are rejected", () => {
  const s = createCity();
  const cases = [
    (a) => (a.tiles[10].type = "script"),
    (a) => (a.rng = 0),
    (a) => (a.month = -1),
    (a) => (a.tiles[10].occupancy = 999999),
    (a) => (a.tiles[10].fire = 9),
    (a) => (a.tiles[640].type = "empty"),
    (a) => (a.research.completed = ["fake"]),
    (a) => (a.trade.goods = "evil"),
    (a) => (a.bonds = [{ balance: 9, payment: -1, months: 1 }]),
    (a) => (a.extra = "unknown"),
    (a) => (a.tiles[4].modules = 100),
    (a) => (a.tiles[2].enabled = "yes"),
  ];
  for (const change of cases) {
    const a = structuredClone(s);
    change(a);
    assert.throws(() => parseCity(JSON.stringify(a)));
  }
});
test("import strings are data and bounded, never interpreted as code", () => {
  const s = createCity();
  s.name = "<img src=x onerror=alert(1)>";
  assert.equal(parseCity(serializeCity(s)).name, s.name);
});
test("paused clock never accumulates and lifecycle reset requires explicit resume", () => {
  const c = createClock();
  assert.equal(advanceClock(c, 10), 0);
  setRunning(c, true);
  assert.equal(advanceClock(c, 1), 0);
  assert.equal(advanceClock(c, 1), 1);
  setRunning(c, false);
  assert.equal(advanceClock(c, 10), 0);
  setRunning(c, true);
  assert.equal(advanceClock(c, 1), 0);
});
test("equal simulated duration produces equal months at all speeds", () => {
  for (const speed of [1, 2, 4]) {
    const c = createClock();
    setSpeed(c, speed);
    setRunning(c, true);
    let n = 0;
    for (let i = 0; i < 240 / speed; i++) n += advanceClock(c, 0.1);
    assert.equal(n, 12);
  }
});
test("stalled render is bounded; invalid elapsed does not corrupt future ticks", () => {
  const c = createClock();
  setRunning(c, true);
  setSpeed(c, 4);
  assert.equal(advanceClock(c, 600), 2);
  assert.equal(advanceClock(c, NaN), 0);
  assert.equal(advanceClock(c, -1), 0);
  assert.equal(advanceClock(c, 0.5), 1);
});
