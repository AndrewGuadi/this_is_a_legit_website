// Run with the baseline static/cmd-city directory as the sole argument.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as after from '../../static/cmd-city/core.mjs';
if (!process.argv[2]) throw Error('Supply the baseline static/cmd-city directory.');
const before = await import(pathToFileURL(resolve(process.argv[2], 'core.mjs')));
let comparisons = 0;
for (const seed of [42, 77, 509, 1024]) {
  const a = before.createCity({seed}), b = structuredClone(a);
  for (let month = 0; month < 120; month++) {
    assert.deepEqual(after.advanceMonth(b), before.advanceMonth(a));
    assert.deepEqual(b, a);
    comparisons++;
  }
}
console.log(`${comparisons} monthly reports and complete states match baseline exactly.`);
