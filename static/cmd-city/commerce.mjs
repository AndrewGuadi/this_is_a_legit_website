/** Original local goods ownership and bounded physical road freight. */
import { TOOLS } from "./content.mjs";
const STOCK = 1_000_000,
  LARGE = 1e12,
  COUNTER = 1e15,
  FLEET = 32,
  PAYLOAD = 100,
  STEPS = 16;
const ROAD = new Set(["road", "avenue", "bridge"]);
const STATE_KEYS = [
  "version",
  "lastMonth",
  "nextId",
  "producerStock",
  "retailStock",
  "looseGoods",
  "vehicles",
  "roadLoad",
  "counters",
];
const COUNTERS = [
  "openingGoods",
  "produced",
  "externalIn",
  "externalOut",
  "consumed",
  "delivered",
  "returned",
  "completedTrips",
  "salvaged",
];
const VEHICLE_KEYS = [
  "id",
  "source",
  "origin",
  "target",
  "destination",
  "position",
  "status",
  "path",
  "cursor",
  "payload",
];
const int = (v, min = 0, max = LARGE) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
const sum = (a) => a.reduce((n, v) => n + v, 0);
const fail = (message) => ({ ok: false, message });
const ok = (message) => ({ ok: true, message });
function invalid() {
  throw Error("Invalid CMD City commerce state.");
}
function exact(v, keys) {
  return (
    v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(v)) &&
    Object.keys(v).length === keys.length &&
    Object.keys(v).every((k) => keys.includes(k))
  );
}
function dimensions(city) {
  const n = city?.width * city?.height;
  if (
    !int(city?.width, 1, 1280) ||
    !int(city?.height, 1, 1280) ||
    n > 1280 ||
    !Array.isArray(city.tiles) ||
    city.tiles.length !== n ||
    !int(city.month, 0, 1e6) ||
    !int(city.inventory?.goods, 0, STOCK)
  )
    invalid();
  return n;
}
const gate = (city) => Math.min(city.tiles.length - 1, 16 * city.width);
const active = (t) => t && t.enabled !== false && !t.fire && t.type !== "ruins";
const retail = (t) => t && ["commercial", "tower"].includes(t.type);
function adjacent(city, i) {
  const w = city.width,
    n = city.tiles.length;
  return [
    i % w ? i - 1 : -1,
    i % w < w - 1 ? i + 1 : -1,
    i >= w ? i - w : -1,
    i < n - w ? i + w : -1,
  ].filter((j) => j >= 0);
}
const distance = (city, a, b) =>
  Math.abs((a % city.width) - (b % city.width)) +
  Math.abs(Math.floor(a / city.width) - Math.floor(b / city.width));
function counter(s, key, amount) {
  if (!int(amount, 0, COUNTER) || !int(s.counters[key] + amount, 0, COUNTER))
    throw Error("Commerce counter limit reached; state was preserved.");
  s.counters[key] += amount;
}
function identity(s, city) {
  return (
    s.counters.openingGoods + s.counters.produced + s.counters.externalIn ===
    city.inventory.goods +
      sum(s.producerStock) +
      sum(s.retailStock) +
      s.looseGoods +
      s.vehicles.reduce((n, v) => n + v.payload, 0) +
      s.counters.consumed +
      s.counters.externalOut
  );
}
export function createCommerce(city) {
  const n = dimensions(city);
  return {
    version: 1,
    lastMonth: city.month,
    nextId: 1,
    producerStock: Array(n).fill(0),
    retailStock: Array(n).fill(0),
    looseGoods: 0,
    vehicles: [],
    roadLoad: Array(n).fill(0),
    counters: Object.fromEntries(
      COUNTERS.map((k) => [k, k === "openingGoods" ? city.inventory.goods : 0]),
    ),
  };
}
export function validateCommerce(s, city, { stable = true } = {}) {
  const n = dimensions(city);
  if (
    !exact(s, STATE_KEYS) ||
    s.version !== 1 ||
    !int(s.lastMonth, 0, 1e6) ||
    !(
      s.lastMonth === city.month ||
      (!stable && s.lastMonth === city.month + 1)
    ) ||
    !int(s.nextId, 1, LARGE) ||
    !int(s.looseGoods, 0, LARGE) ||
    !exact(s.counters, COUNTERS) ||
    COUNTERS.some((k) => !int(s.counters[k], 0, COUNTER)) ||
    s.counters.openingGoods > STOCK
  )
    invalid();
  for (const key of ["producerStock", "retailStock", "roadLoad"])
    if (
      !Array.isArray(s[key]) ||
      s[key].length !== n ||
      s[key].some((v) => !int(v, 0, key === "roadLoad" ? FLEET : STOCK))
    )
      invalid();
  for (let i = 0; i < n; i++)
    if (
      (s.producerStock[i] && city.tiles[i].type !== "industrial") ||
      (s.retailStock[i] && !retail(city.tiles[i]))
    )
      invalid();
  if (!Array.isArray(s.vehicles) || s.vehicles.length > FLEET) invalid();
  const ids = new Set();
  for (const v of s.vehicles) {
    if (
      !exact(v, VEHICLE_KEYS) ||
      !int(v.id, 1, s.nextId - 1) ||
      ids.has(v.id) ||
      !["producer", "warehouse"].includes(v.source) ||
      !["outbound", "returning"].includes(v.status) ||
      !int(v.payload, 0, PAYLOAD) ||
      !["origin", "target", "destination", "position"].every((k) =>
        int(v[k], 0, n - 1),
      ) ||
      !Array.isArray(v.path) ||
      v.path.length > n ||
      !int(v.cursor, 0, Math.max(0, v.path.length - 1))
    )
      invalid();
    if (v.source === "warehouse" && v.origin !== gate(city)) invalid();
    if (
      v.status === "outbound" &&
      (v.destination !== v.target || v.payload === 0)
    )
      invalid();
    if (
      v.status === "returning" &&
      v.destination !== v.origin &&
      v.destination !== gate(city)
    )
      invalid();
    if (v.path.length && v.path[v.cursor] !== v.position) invalid();
    const nodes = new Set();
    for (let k = 0; k < v.path.length; k++) {
      const p = v.path[k];
      if (
        !int(p, 0, n - 1) ||
        nodes.has(p) ||
        (k && distance(city, p, v.path[k - 1]) !== 1)
      )
        invalid();
      nodes.add(p);
    }
    if (v.path.length && distance(city, v.path.at(-1), v.destination) > 1)
      invalid();
    ids.add(v.id);
  }
  if (!identity(s, city)) invalid();
  return true;
}
function stateOf(city) {
  const s = city?.commerce;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.producerStock) ||
    !Array.isArray(s.retailStock) ||
    !s.counters
  )
    invalid();
  return s;
}
function observe(city, m) {
  const n = city.tiles.length,
    access = m?.operationAccess || m?.access;
  if (
    !Array.isArray(access) ||
    access.length !== n ||
    access.some((x) => typeof x !== "boolean") ||
    !Array.isArray(m.jobFill) ||
    m.jobFill.length !== n ||
    m.jobFill.some((x) => !int(x, 0, STOCK))
  )
    throw Error("Commerce requires actual operating access and job filling.");
  for (const name of ["power", "water"])
    if (
      typeof m.utilities?.[name]?.ratio !== "number" ||
      !Number.isFinite(m.utilities[name].ratio) ||
      m.utilities[name].ratio < 0 ||
      m.utilities[name].ratio > 1
    )
      throw Error("Commerce utility observation is invalid.");
  if (
    m.roadLoad !== undefined &&
    (!Array.isArray(m.roadLoad) ||
      m.roadLoad.length !== n ||
      m.roadLoad.some(
        (x) =>
          typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > STOCK,
      ))
  )
    throw Error("Commerce road load observation is invalid.");
  if (
    m.retailCapacityByTile !== undefined &&
    (!Array.isArray(m.retailCapacityByTile) ||
      m.retailCapacityByTile.length !== n ||
      m.retailCapacityByTile.some((x) => !int(x, 0, STOCK)))
  )
    throw Error("Commerce retail throughput observation is invalid.");
  return access;
}
function operating(city, m, i) {
  return (
    active(city.tiles[i]) &&
    (m.operationAccess || m.access)[i] &&
    Math.min(m.utilities.power.ratio, m.utilities.water.ratio) >= 0.9
  );
}
function throughput(city, m, i) {
  if (!retail(city.tiles[i]) || !operating(city, m, i)) return 0;
  return city.tiles[i].type === "commercial"
    ? Math.min(STOCK, Math.floor(m.jobFill[i] * 4))
    : m.retailCapacityByTile?.[i] || 0;
}
function network(city) {
  const n = city.tiles.length,
    near = city.tiles.map((_, i) => adjacent(city, i)),
    mask = city.tiles.map((t) => ROAD.has(t.type) && active(t)),
    connected = Array(n).fill(false),
    queue = [];
  const g = gate(city);
  if (mask[g]) {
    connected[g] = true;
    queue.push(g);
  }
  for (let k = 0; k < queue.length; k++)
    for (const j of near[queue[k]])
      if (mask[j] && !connected[j]) {
        connected[j] = true;
        queue.push(j);
      }
  const frontage = (i) =>
      connected[i] ? [i] : near[i].filter((j) => connected[j]),
    cache = new Map();
  return {
    connected,
    path(from, to) {
      const roots = frontage(from),
        ends = frontage(to);
      if (!roots.length || !ends.length) return null;
      const key = roots.join(",");
      let tree = cache.get(key);
      if (!tree) {
        const prev = new Int16Array(n).fill(-2),
          dist = new Int16Array(n).fill(-1),
          q = roots.slice();
        for (const r of roots) {
          prev[r] = -1;
          dist[r] = 0;
        }
        for (let k = 0; k < q.length; k++)
          for (const j of near[q[k]])
            if (connected[j] && prev[j] === -2) {
              prev[j] = q[k];
              dist[j] = dist[q[k]] + 1;
              q.push(j);
            }
        tree = { prev, dist };
        cache.set(key, tree);
      }
      let end = -1;
      for (const j of ends)
        if (
          tree.dist[j] >= 0 &&
          (end < 0 ||
            tree.dist[j] < tree.dist[end] ||
            (tree.dist[j] === tree.dist[end] && j < end))
        )
          end = j;
      if (end < 0) return null;
      const path = [];
      for (let i = end; i !== -1; i = tree.prev[i]) path.push(i);
      return path.reverse();
    },
  };
}
function produce(city, m) {
  const s = city.commerce;
  for (let i = 0; i < city.tiles.length; i++)
    if (city.tiles[i].type === "industrial" && operating(city, m, i)) {
      const amount = Math.min(
        STOCK - s.producerStock[i],
        Math.floor(m.jobFill[i] * 0.8),
      );
      counter(s, "produced", amount);
      s.producerStock[i] += amount;
    }
}
function dispatch(city, m, routes) {
  const s = city.commerce,
    shops = [];
  for (let i = 0; i < city.tiles.length; i++)
    if (throughput(city, m, i) > 0 && routes.path(gate(city), i)) shops.push(i);
  if (!shops.length) return;
  const first = city.month % shops.length,
    order = shops.slice(first).concat(shops.slice(0, first));
  const sources = [];
  for (let i = 0; i < city.tiles.length; i++)
    if (
      city.tiles[i].type === "industrial" &&
      s.producerStock[i] > 0 &&
      operating(city, m, i)
    )
      sources.push({ source: "producer", origin: i, slots: 2 });
  const depots = city.tiles.reduce(
    (n, t, i) =>
      n + (["trade", "port"].includes(t.type) && operating(city, m, i) ? 1 : 0),
    0,
  );
  if (
    routes.connected[gate(city)] &&
    Math.min(m.utilities.power.ratio, m.utilities.water.ratio) >= 0.9 &&
    (city.inventory.goods || s.looseGoods)
  )
    sources.push({
      source: "warehouse",
      origin: gate(city),
      slots: Math.min(16, 8 + depots * 2),
    });
  let progressed = true;
  while (progressed && s.vehicles.length < FLEET) {
    progressed = false;
    for (const target of order) {
      if (s.vehicles.length >= FLEET) break;
      const targetStock = Math.min(STOCK, throughput(city, m, target) * 2),
        inbound = s.vehicles.reduce(
          (n, v) =>
            n +
            (v.status === "outbound" && v.target === target ? v.payload : 0),
          0,
        ),
        need = targetStock - s.retailStock[target] - inbound;
      if (need <= 0) continue;
      let best = null;
      for (const source of sources) {
        const available =
          source.source === "producer"
            ? s.producerStock[source.origin]
            : city.inventory.goods + s.looseGoods;
        if (
          !available ||
          s.vehicles.filter(
            (v) => v.source === source.source && v.origin === source.origin,
          ).length >= source.slots
        )
          continue;
        const path = routes.path(source.origin, target);
        if (!path) continue;
        if (
          !best ||
          path.length < best.path.length ||
          (path.length === best.path.length && source.origin < best.origin)
        )
          best = { ...source, path, available };
      }
      if (!best) continue;
      if (!int(s.nextId, 1, LARGE - 1))
        throw Error("Commerce vehicle identifier limit reached.");
      const payload = Math.min(PAYLOAD, need, best.available);
      if (best.source === "producer") s.producerStock[best.origin] -= payload;
      else {
        const loose = Math.min(payload, s.looseGoods);
        s.looseGoods -= loose;
        city.inventory.goods -= payload - loose;
      }
      s.vehicles.push({
        id: s.nextId++,
        source: best.source,
        origin: best.origin,
        target,
        destination: target,
        position: best.path[0],
        status: "outbound",
        path: best.path,
        cursor: 0,
        payload,
      });
      progressed = true;
    }
  }
}
function returningDestination(city, m, v) {
  return v.source === "producer" &&
    city.tiles[v.origin].type === "industrial" &&
    operating(city, m, v.origin) &&
    (!v.payload || city.commerce.producerStock[v.origin] < STOCK)
    ? v.origin
    : gate(city);
}
function returnCargo(city, v) {
  const s = city.commerce;
  if (v.destination === gate(city)) {
    const stored = Math.min(v.payload, STOCK - city.inventory.goods),
      loose = v.payload - stored;
    if (!int(s.looseGoods + loose, 0, LARGE))
      throw Error("Recovered commerce stock limit reached.");
    counter(s, "returned", v.payload);
    city.inventory.goods += stored;
    s.looseGoods += loose;
    v.payload = 0;
  } else {
    const amount = Math.min(v.payload, STOCK - s.producerStock[v.origin]);
    counter(s, "returned", amount);
    s.producerStock[v.origin] += amount;
    v.payload -= amount;
  }
}
function move(city, m, routes) {
  const s = city.commerce,
    edgeLoads = new Map(),
    budgets = new Map(),
    done = new Set();
  s.roadLoad.fill(0);
  for (let i = 0; i < city.tiles.length; i++) {
    const capacity = throughput(city, m, i);
    if (capacity) budgets.set(i, capacity);
  }
  const first = s.vehicles.length ? city.month % s.vehicles.length : 0,
    order = s.vehicles.slice(first).concat(s.vehicles.slice(0, first));
  const cross = (a, b, used) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (used.has(key)) return true;
    const remaining = Math.min(
        (TOOLS[city.tiles[a].type]?.capacity || 0) - (m.roadLoad?.[a] || 0),
        (TOOLS[city.tiles[b].type]?.capacity || 0) - (m.roadLoad?.[b] || 0),
      ),
      assigned = edgeLoads.get(key) || 0;
    if (remaining - assigned < 1 - 1e-9) return false;
    edgeLoads.set(key, assigned + 1);
    s.roadLoad[a] = Math.max(s.roadLoad[a], assigned + 1);
    s.roadLoad[b] = Math.max(s.roadLoad[b], assigned + 1);
    used.add(key);
    return true;
  };
  for (const v of order) {
    // A vehicle cannot jump sideways from a demolished/closed road onto its frontage.
    if (!routes.connected[v.position]) {
      v.path = [];
      v.cursor = 0;
      continue;
    }
    if (v.status === "outbound" && !throughput(city, m, v.target)) {
      v.status = "returning";
      v.path = [];
      v.cursor = 0;
    }
    if (v.status === "returning") {
      v.destination = returningDestination(city, m, v);
      v.path = routes.path(v.position, v.destination) || [];
      v.cursor = 0;
    } else if (
      !v.path.length ||
      v.path[v.cursor] !== v.position ||
      v.path.slice(v.cursor).some((i) => !routes.connected[i])
    ) {
      v.path = routes.path(v.position, v.target) || [];
      v.cursor = 0;
    }
    if (!v.path.length) continue;
    let budget = STEPS;
    const used = new Set();
    while (v.path.length) {
      if (v.cursor === v.path.length - 1) {
        if (!used.size && !cross(v.position, v.position, used)) break;
        if (v.status === "outbound") {
          const room = Math.max(
              0,
              Math.min(STOCK, throughput(city, m, v.target) * 2) -
                s.retailStock[v.target],
            ),
            amount = Math.min(v.payload, room, budgets.get(v.target) || 0);
          counter(s, "delivered", amount);
          s.retailStock[v.target] += amount;
          v.payload -= amount;
          budgets.set(v.target, (budgets.get(v.target) || 0) - amount);
          if (!v.payload) {
            v.status = "returning";
            v.destination = returningDestination(city, m, v);
            v.path = [];
            v.cursor = 0;
          }
        } else {
          returnCargo(city, v);
          if (!v.payload) {
            counter(s, "completedTrips", 1);
            done.add(v.id);
          } else {
            v.destination = gate(city);
            v.path = [];
            v.cursor = 0;
          }
        }
        break;
      }
      if (!budget) break;
      const next = v.path[v.cursor + 1];
      if (!routes.connected[next] || !cross(v.position, next, used)) break;
      v.position = next;
      v.cursor++;
      budget--;
    }
  }
  s.vehicles = s.vehicles.filter((v) => !done.has(v.id));
}
export function commerceReport(city) {
  const s = stateOf(city);
  validateCommerce(s, city, { stable: false });
  const cargo = s.vehicles.reduce((n, v) => n + v.payload, 0);
  return {
    warehouseGoods: city.inventory.goods,
    producerGoods: sum(s.producerStock),
    retailGoods: sum(s.retailStock),
    looseGoods: s.looseGoods,
    carriedGoods: cargo,
    totalStock:
      city.inventory.goods +
      sum(s.producerStock) +
      sum(s.retailStock) +
      s.looseGoods +
      cargo,
    producerStock: s.producerStock.slice(),
    retailStock: s.retailStock.slice(),
    roadLoad: s.roadLoad.slice(),
    vehicles: s.vehicles.map((v) => ({ ...v, path: v.path.slice() })),
    counters: { ...s.counters },
    conservation: identity(s, city),
  };
}
export function advanceCommerce(city, m) {
  const source = stateOf(city);
  validateCommerce(source, city, { stable: false });
  if (source.lastMonth === city.month + 1)
    return { ...commerceReport(city), changed: false };
  observe(city, m);
  const work = {
    ...city,
    inventory: { ...city.inventory },
    commerce: structuredClone(source),
  };
  produce(work, m);
  const routes = network(work);
  dispatch(work, m, routes);
  move(work, m, routes);
  work.commerce.lastMonth = city.month + 1;
  validateCommerce(work.commerce, work, { stable: false });
  city.commerce = work.commerce;
  city.inventory.goods = work.inventory.goods;
  return { ...commerceReport(city), changed: true };
}
export function commerceRetailStock(city, index) {
  const s = stateOf(city);
  if (
    !int(index, 0, city.tiles.length - 1) ||
    !int(s.retailStock[index], 0, STOCK)
  )
    invalid();
  return s.retailStock[index];
}
export function consumeRetail(city, index, quantity) {
  const s = stateOf(city);
  if (!int(quantity, 0, LARGE)) invalid();
  const available = commerceRetailStock(city, index);
  if (!retail(city.tiles[index]) || !active(city.tiles[index])) return 0;
  const amount = Math.min(available, quantity);
  counter(s, "consumed", amount);
  s.retailStock[index] -= amount;
  return amount;
}
export function transferWarehouse(city, delta) {
  const s = stateOf(city);
  if (!int(delta, -LARGE, LARGE) || !int(city.inventory?.goods, 0, STOCK))
    invalid();
  const amount =
    delta >= 0
      ? Math.min(delta, STOCK - city.inventory.goods)
      : -Math.min(-delta, city.inventory.goods);
  counter(s, amount >= 0 ? "externalIn" : "externalOut", Math.abs(amount));
  city.inventory.goods += amount;
  return amount;
}
export function preserveCommerceDemolition(city, index) {
  try {
    const s = stateOf(city);
    validateCommerce(s, city, { stable: false });
    if (!int(index, 0, city.tiles.length - 1))
      return fail("Choose a valid commerce lot.");
    const amount = s.producerStock[index] + s.retailStock[index];
    if (
      !int(s.looseGoods + amount, 0, LARGE) ||
      !int(s.counters.salvaged + amount, 0, COUNTER)
    )
      return fail(
        "Recovered commerce stock limit reached; site was preserved.",
      );
    s.looseGoods += amount;
    s.producerStock[index] = 0;
    s.retailStock[index] = 0;
    counter(s, "salvaged", amount);
    for (const v of s.vehicles)
      if (v.target === index && v.status === "outbound") {
        v.status = "returning";
        v.destination = v.origin;
        v.path = [];
        v.cursor = 0;
      }
    return ok("Local goods preserved for physical redistribution.");
  } catch {
    return fail("Commerce state is invalid; site was preserved.");
  }
}
export function commerceAction(city, a) {
  if (
    !exact(a, ["type", "id"]) ||
    a.type !== "recallFreight" ||
    !int(a.id, 1, LARGE)
  )
    return fail("Choose a valid outbound freight vehicle.");
  try {
    const s = stateOf(city);
    validateCommerce(s, city, { stable: false });
    const v = s.vehicles.find((v) => v.id === a.id);
    if (!v || v.status !== "outbound")
      return fail("Choose a valid outbound freight vehicle.");
    v.status = "returning";
    v.destination = v.origin;
    v.path = [];
    v.cursor = 0;
    return ok("Freight recalled; cargo will return over available roads.");
  } catch {
    return fail("Commerce state is invalid.");
  }
}
