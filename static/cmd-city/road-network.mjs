/** Shared deterministic physical-road BFS. Derived data never enters saved state. */
const caches = new WeakMap();
const LIMIT = 512;
const isRoad = (t) =>
  t &&
  (t.type === "road" || t.type === "avenue" || t.type === "bridge") &&
  t.enabled !== false &&
  !t.fire;
export function roadTopology(city, identity = city) {
  const size = city.tiles.length,
    width = city.width;
  if (
    !Number.isInteger(width) ||
    width < 1 ||
    size < 1 ||
    size > 1280 ||
    size !== width * city.height
  )
    throw Error("Invalid road topology dimensions.");
  let topology = caches.get(identity);
  if (!topology || topology.width !== width || topology.size !== size) {
    const adjacent = Array.from({ length: size }, (_, i) => {
      const out = [];
      if (i % width) out.push(i - 1);
      if (i % width < width - 1) out.push(i + 1);
      if (i >= width) out.push(i - width);
      if (i < size - width) out.push(i + width);
      return out;
    });
    const mask = new Uint8Array(size),
      entries = new Map();
    topology = {
      width,
      size,
      adjacent,
      mask,
      refresh(source) {
        let changed = false;
        for (let i = 0; i < size; i++) {
          const active = isRoad(source.tiles[i]) ? 1 : 0;
          if (mask[i] !== active) {
            mask[i] = active;
            changed = true;
          }
        }
        if (changed) entries.clear();
      },
      tree(roots, key = roots.join(",")) {
        let entry = entries.get(key);
        if (entry) {
          entries.delete(key);
          entries.set(key, entry);
          return entry;
        }
        const distance = new Int16Array(size).fill(-1),
          prev = new Int16Array(size).fill(-1),
          rank = new Int16Array(size).fill(-1),
          queue = new Uint16Array(size);
        entry = { distance, prev, rank, queue, head: 0, tail: 0 };
        for (const root of roots)
          if (mask[root] && distance[root] < 0) {
            distance[root] = 0;
            rank[root] = entry.tail;
            queue[entry.tail++] = root;
          }
        if (entries.size >= Math.min(LIMIT, size))
          entries.delete(entries.keys().next().value);
        entries.set(key, entry);
        return entry;
      },
      step(entry) {
        if (entry.head >= entry.tail) return false;
        const here = entry.queue[entry.head++];
        for (const next of adjacent[here])
          if (mask[next] && entry.distance[next] < 0) {
            entry.distance[next] = entry.distance[here] + 1;
            entry.prev[next] = here;
            entry.rank[next] = entry.tail;
            entry.queue[entry.tail++] = next;
          }
        return true;
      },
      complete(roots, key) {
        const entry = this.tree(roots, key);
        while (this.step(entry));
        return entry;
      },
      nearest(start, goals) {
        if (!mask[start] || !goals.length) return null;
        const entry = this.tree([start], String(start));
        // Inspect destinations once. Reused frontiers usually already contain
        // the answer; otherwise inspect only newly discovered queue entries.
        let goal = -1, bestRank = size + 1;
        const targets = new Set();
        for (const next of goals) {
          targets.add(next);
          if (entry.rank[next] >= 0 && entry.rank[next] < bestRank) {
            goal = next;
            bestRank = entry.rank[next];
          }
        }
        let cursor = entry.tail;
        while (goal < 0 && this.step(entry)) {
          while (cursor < entry.tail) {
            const next = entry.queue[cursor++];
            if (targets.has(next)) { goal = next; break; }
          }
        }
        return goal < 0 ? null : { entry, goal };
      },
      // Bounded diagnostics for tests; no mutable frontier is exposed here.
      stats() {
        return {
          entries: entries.size,
          limit: Math.min(LIMIT, size),
          bufferBytes: entries.size * size * 8,
        };
      },
    };
    caches.set(identity, topology);
  }
  topology.refresh(city);
  return topology;
}
