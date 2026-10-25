import test from "node:test";
import assert from "node:assert/strict";
import { createCity, measure } from "../../static/cmd-city/core.mjs";
import { createHouseholds } from "../../static/cmd-city/households.mjs";
const idx = (x, y) => y * 40 + x;
function fixture() {
  const s = createCity({ starter: false, seed: 404 });
  for (const t of s.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
    });
  for (let x = 0; x < 16; x++) s.tiles[idx(x, 16)].type = "road";
  for (const [type, x, y, occupancy] of [
    ["residential", 3, 15, 20],
    ["residential", 6, 15, 20],
    ["commercial", 10, 15, 10],
    ["wind", 1, 15, 0],
    ["water", 2, 15, 0],
  ])
    Object.assign(s.tiles[idx(x, y)], { type, occupancy });
  s.households = createHouseholds(s);
  return s;
}
test("scarce jobs rotate between equal eligible homes instead of starving the same home forever", () => {
  const s = fixture(),
    a = idx(3, 15),
    b = idx(6, 15),
    totals = [0, 0];
  for (let month = 0; month < 4; month++) {
    s.month = month;
    s.households.lastMonth = month;
    s.households.ledger.month = month;
    s.services.lastMonth = month - 1;
    s.civic.lastMonth = month;
    s.environment.lastMonth = month - 1;
    const m = measure(s);
    totals[0] += m.homeEmployment[a];
    totals[1] += m.homeEmployment[b];
    assert.ok(
      m.homeEmployment[month % 2 === 0 ? a : b] >
        m.homeEmployment[month % 2 === 0 ? b : a],
    );
    assert.equal(m.employed, 10);
    assert.equal(
      m.jobFill.reduce((a, b) => a + b, 0),
      10,
    );
    assert.equal(
      m.homeEmployment.reduce((a, b) => a + b, 0),
      10,
    );
    assert.ok(m.roadLoad.every((n) => n <= 80));
    assert.deepEqual(measure(s), measure(structuredClone(s)));
  }
  assert.equal(totals[0], totals[1]);
});
test("inactive homes do not take turns ahead of eligible commuters", () => {
  const s = fixture();
  s.tiles[idx(3, 15)].enabled = false;
  for (let month = 0; month < 4; month++) {
    s.month = month;
    s.households.lastMonth = month;
    s.households.ledger.month = month;
    s.services.lastMonth = month - 1;
    s.civic.lastMonth = month;
    s.environment.lastMonth = month - 1;
    const m = measure(s);
    assert.equal(m.homeEmployment[idx(3, 15)], 0);
    assert.equal(m.homeEmployment[idx(6, 15)], 10);
  }
});
