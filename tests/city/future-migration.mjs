/** Reproduce actual predecessor engines; never manufacture a legacy save by deleting keys. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { parseCity, serializeCity } from "../../static/cmd-city/save.mjs";
import { parseRegion, serializeRegion } from "../../static/cmd-city/region.mjs";
const results = [];
for (const revision of ["a80d994", "0eb19f8", "3c33c76"]) {
  const sha = execFileSync("git", ["rev-parse", revision], {
      encoding: "utf8",
    }).trim(),
    dir = mkdtempSync(join(tmpdir(), "cmd-future-old-"));
  try {
    const archive = execFileSync("git", ["archive", sha, "static/cmd-city"]);
    execFileSync("tar", ["-x", "-C", dir], { input: archive });
    const program = `import {createCity,advanceMonth} from './static/cmd-city/core.mjs';import {serializeCity} from './static/cmd-city/save.mjs';import {createRegion,advanceRegion,serializeRegion} from './static/cmd-city/region.mjs';const c=createCity({sandbox:true,seed:505});for(let i=0;i<3;i++)advanceMonth(c);const r=createRegion({seed:506});for(let i=0;i<2;i++)advanceRegion(r);process.stdout.write(JSON.stringify({city:serializeCity(c),region:serializeRegion(r)}));`;
    writeFileSync(join(dir, "make.mjs"), program);
    const output = JSON.parse(
      execFileSync(process.execPath, ["make.mjs"], {
        cwd: dir,
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      }),
    );
    const old = JSON.parse(output.city),
      city = parseCity(output.city);
    for (const k of Object.keys(old))
      if (k !== "version") assert.deepEqual(city[k], old[k]);
    assert.equal(city.version, 4);
    assert.equal(city.future.lastMonth, city.month);
    assert.deepEqual(parseCity(serializeCity(city)), city);
    const oldRegion = JSON.parse(output.region),
      region = parseRegion(output.region);
    for (let i = 0; i < 3; i++) {
      for (const k of Object.keys(oldRegion.cities[i].state))
        if (k !== "version")
          assert.deepEqual(
            region.cities[i].state[k],
            oldRegion.cities[i].state[k],
          );
      assert.equal(region.cities[i].state.version, 4);
    }
    assert.deepEqual(parseRegion(serializeRegion(region)), region);
    results.push({
      sha,
      oldVersion: old.version,
      cityMonth: old.month,
      regionMonth: oldRegion.month,
      citySourceSHA256: createHash("sha256").update(output.city).digest("hex"),
      regionSourceSHA256: createHash("sha256")
        .update(output.region)
        .digest("hex"),
      currentCityBytes: Buffer.byteLength(serializeCity(city)),
      currentRegionBytes: Buffer.byteLength(serializeRegion(region)),
      status: "PASS",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(
  JSON.stringify(
    { command: "node tests/city/future-migration.mjs", results },
    null,
    2,
  ),
);
