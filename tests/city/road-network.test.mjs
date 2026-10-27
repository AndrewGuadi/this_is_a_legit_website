import test from "node:test";
import assert from "node:assert/strict";
import { roadTopology } from "../../static/cmd-city/road-network.mjs";
function city(width = 8, height = 6) {
  return {
    width,
    height,
    tiles: Array.from({ length: width * height }, () => ({
      type: "road",
      enabled: true,
      fire: 0,
    })),
  };
}
function reference(topology, roots) {
  const size = topology.size,
    distance = Array(size).fill(-1),
    prev = Array(size).fill(-1),
    rank = Array(size).fill(-1),
    queue = [];
  for (const root of roots)
    if (topology.mask[root] && distance[root] < 0) {
      distance[root] = 0;
      rank[root] = queue.length;
      queue.push(root);
    }
  for (let head = 0; head < queue.length; head++)
    for (const next of topology.adjacent[queue[head]])
      if (topology.mask[next] && distance[next] < 0) {
        prev[next] = queue[head];
        distance[next] = distance[queue[head]] + 1;
        rank[next] = queue.length;
        queue.push(next);
      }
  return { distance, prev, rank };
}
test("shared lazy frontiers preserve single/multiple root order, discovery ties and exact predecessor paths", () => {
  const s = city();
  for (const i of [9, 10, 11, 27, 35]) s.tiles[i].type = "empty";
  const topology = roadTopology(s);
  for (const roots of [[0], [47], [7, 40], [40, 7]]) {
    const expected = reference(topology, roots);
    if (roots.length === 1)
      for (const goals of [[15, 24], [46, 1], [12], [47]]) {
        const got = topology.nearest(roots[0], goals);
        const candidates = goals
          .filter((i) => expected.rank[i] >= 0)
          .sort((a, b) => expected.rank[a] - expected.rank[b]);
        assert.equal(got?.goal ?? null, candidates[0] ?? null);
      }
    const got = topology.complete(roots);
    for (const field of ["distance", "prev", "rank"])
      assert.deepEqual(Array.from(got[field]), expected[field]);
  }
});
test("topology invalidation handles closures, reopening and fires while retaining disconnected road islands", () => {
  const s = city(9, 1),
    topology = roadTopology(s);
  s.tiles[4].enabled = false;
  topology.refresh(s);
  assert.equal(topology.complete([0]).distance[8], -1);
  assert.equal(topology.complete([8]).distance[5], 3);
  s.tiles[4].enabled = true;
  roadTopology(s);
  assert.equal(topology.complete([0]).distance[8], 8);
  s.tiles[4].fire = 1;
  topology.refresh(s);
  assert.equal(topology.complete([0]).distance[8], -1);
  s.tiles[4].fire = 0;
  topology.refresh(s);
  assert.equal(topology.complete([0]).distance[8], 8);
});
test("frontier memory remains capped after more roots than the LRU capacity", () => {
  const topology = roadTopology(city(40, 32));
  for (let i = 0; i < 800; i++) topology.tree([i]);
  assert.deepEqual(topology.stats(), {
    entries: 512,
    limit: 512,
    bufferBytes: 512 * 1280 * 8,
  });
  const first = topology.complete([0]);
  assert.equal(first.distance[1279], 70);
  assert.equal(topology.stats().entries, 512);
});
