import test from "node:test";
import assert from "node:assert/strict";
import { createCity, measure } from "../../static/cmd-city/core.mjs";
import { advanceEnvironment } from "../../static/cmd-city/environment.mjs";
import { advanceServices } from "../../static/cmd-city/services.mjs";
import { advanceHouseholds } from "../../static/cmd-city/households.mjs";

for (const [name, advance] of [
  ["environment", advanceEnvironment],
  ["services", advanceServices],
  ["households", advanceHouseholds],
]) {
  test(`${name} omitted presentation report preserves identical simulation and financial state`, () => {
    const full = createCity({ seed: 505 }),
      compact = structuredClone(full);
    const metrics = measure(full);
    const result = advance(full, metrics),
      smaller = advance(compact, metrics, { report: false });
    assert.deepEqual(compact, full);
    if (name === "households")
      assert.deepEqual(smaller.bookedTaxes, result.bookedTaxes);
    else assert.equal(smaller.changed, result.changed);
    const snapshot = structuredClone(compact);
    advance(compact, metrics, { report: false });
    assert.deepEqual(compact, snapshot);
  });
}

test("omitting reports does not bypass any service or household input validation", () => {
  for (const kind of ["services", "households"]) {
    const city = createCity({ seed: 506 });
    const metrics = measure(city);
    city[kind].unrecognized = 1;
    const before = structuredClone(city);
    assert.throws(() =>
      (kind === "services" ? advanceServices : advanceHouseholds)(
        city,
        metrics,
        { report: false },
      ),
    );
    assert.deepEqual(city, before);
  }
});
