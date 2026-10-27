import test from 'node:test';
import assert from 'node:assert/strict';
import { roadTopology } from '../../static/cmd-city/road-network.mjs';
import { createCity, advanceMonth } from '../../static/cmd-city/core.mjs';

test('nearest road search consumes a destination collection only once', () => {
  const city = { width: 40, height: 32, tiles: Array.from({length:1280}, () => ({type:'road'})) };
  const graph = roadTopology(city);
  let visits = 0;
  const goals = [1279, 1278];
  goals[Symbol.iterator] = function* () { for (const x of [1279,1278]) { visits++; yield x; } };
  assert.equal(graph.nearest(0, goals).goal, 1278);
  assert.equal(visits, 2);
  // A previously expanded frontier must still choose discovery order, not input order.
  assert.equal(graph.nearest(0, [40, 1]).goal, 1);
});

test('private draft months do not serialize an unused source rollback journal', () => {
  const city = createCity({seed: 77});
  city.cash = 995000000000;
  const original = JSON.stringify;
  let sourceJournals = 0;
  JSON.stringify = function(value, ...args) {
    if (value === city) sourceJournals++;
    return original(value, ...args);
  };
  try { advanceMonth(city); } finally { JSON.stringify = original; }
  assert.equal(sourceJournals, 0);
  assert.equal(city.month, 1);
});
