import { roadTopology } from "./road-network.mjs";
/** Original deterministic road services. Saved counts represent service cases, not identities. */
import { TOOLS } from "./content.mjs";
const MAX = 1e12,
  COUNTER_MAX = 1e15,
  FLEET_MAX = 64,
  TASK_MAX = 128;
const KINDS = ["fire", "medical", "police", "garbage"];
const ROAD = new Set(["road", "avenue", "bridge"]);
const FIELD_KEYS = ["waste", "patients", "crimes", "beds", "custody"];
const COUNTERS = [
  "generatedWaste",
  "legacyWaste",
  "initialStoredWaste",
  "collectedWaste",
  "processedWaste",
  "recoveredOre",
  "completedTrips",
  "treatedPatients",
  "resolvedCrimes",
  "extinguishedFires",
  "createdPatients",
  "createdCrimes",
  "naturalPatients",
  "naturalCrimes",
];
const VKEYS = [
  "id",
  "kind",
  "home",
  "position",
  "status",
  "path",
  "cursor",
  "payload",
  "capacity",
  "taskId",
  "destination",
];
const TKEYS = ["id", "kind", "target", "status", "vehicleId"];
const own = (o, k) => typeof k === "string" && Object.hasOwn(o, k);
const integer = (v, a = 0, b = MAX) =>
  Number.isSafeInteger(v) && v >= a && v <= b;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const okay = (message) => ({ ok: true, message }),
  fail = (message) => ({ ok: false, message });
const invalid = () => {
  throw Error("Invalid CMD City road services state.");
};
const active = (t) => t && t.enabled !== false && !t.fire && t.type !== "ruins";
const keySets = new WeakMap();
function exact(v, keys) {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(v))
  )
    return false;
  const actual = Object.keys(v);
  if (actual.length !== keys.length) return false;
  let allowed = keySets.get(keys);
  if (!allowed) {
    allowed = new Set(keys);
    keySets.set(keys, allowed);
  }
  for (const key of actual) if (!allowed.has(key)) return false;
  return true;
}
function dimensions(city) {
  const n = city.width * city.height;
  if (
    !integer(city.width, 1, 1280) ||
    !integer(city.height, 1, 1280) ||
    n > 1280 ||
    !Array.isArray(city.tiles) ||
    city.tiles.length !== n ||
    !integer(city.month, 0, 1e6)
  )
    invalid();
  return n;
}
const distance = (a, b, w) =>
  Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
function neighbors(i, city) {
  const w = city.width,
    n = w * city.height,
    out = [];
  if (i % w) out.push(i - 1);
  if (i % w < w - 1) out.push(i + 1);
  if (i >= w) out.push(i - w);
  if (i < n - w) out.push(i + w);
  return out;
}
const gateway = (city) => Math.min(city.tiles.length - 1, 16 * city.width);
function counter(s, key, n) {
  if (!integer(n) || !integer(s.counters[key] + n, 0, COUNTER_MAX))
    throw Error("Service counter limit reached; state was preserved.");
  s.counters[key] += n;
}
function addField(field, i, n) {
  if (!integer(n) || !integer(field[i] + n))
    throw Error("Local service queue limit reached; state was preserved.");
  field[i] += n;
}
function totalStored(city) {
  return city.tiles.reduce((n, t) => n + (integer(t.stored) ? t.stored : 0), 0);
}
function cargo(s, kind) {
  return s.vehicles.reduce((n, v) => n + (v.kind === kind ? v.payload : 0), 0);
}
function conservation(s, totals) {
  return {
    waste:
      s.counters.generatedWaste +
        s.counters.legacyWaste +
        s.counters.initialStoredWaste ===
      totals.waste +
        s.looseWaste +
        totals.garbage +
        totals.stored +
        s.counters.processedWaste,
    patients:
      s.counters.createdPatients ===
      totals.patients +
        totals.beds +
        totals.medical +
        s.counters.treatedPatients,
    crimes:
      s.counters.createdCrimes ===
      totals.crimes +
        totals.custody +
        totals.police +
        s.counters.resolvedCrimes,
  };
}
export function createServices(city, { month = city.month } = {}) {
  const n = dimensions(city);
  if (!integer(month, 0, 1e6)) invalid();
  const s = {
    version: 1,
    lastMonth: month - 1,
    nextId: 1,
    waste: Array(n).fill(0),
    patients: Array(n).fill(0),
    crimes: Array(n).fill(0),
    beds: Array(n).fill(0),
    custody: Array(n).fill(0),
    looseWaste: 0,
    vehicles: [],
    tasks: [],
    counters: Object.fromEntries(COUNTERS.map((k) => [k, 0])),
  };
  const legacy = city.backlogs?.waste ?? 0;
  if (!integer(legacy)) invalid();
  const occupied = city.tiles
      .map((t, i) =>
        integer(t.occupancy, 1) ? { i, weight: t.occupancy } : null,
      )
      .filter(Boolean),
    weight = occupied.reduce((n, t) => n + t.weight, 0);
  let allocated = 0;
  if (weight) {
    for (const t of occupied) {
      const amount = Math.floor((legacy * t.weight) / weight);
      s.waste[t.i] = amount;
      allocated += amount;
    }
    for (let k = 0; allocated < legacy; k++, allocated++)
      s.waste[occupied[k % occupied.length].i]++;
  } else s.looseWaste = legacy;
  s.counters.legacyWaste = legacy;
  s.counters.initialStoredWaste = totalStored(city);
  return s;
}
function inspectServices(s, city, { stable = true } = {}) {
  const n = dimensions(city);
  if (
    !exact(s, [
      "version",
      "lastMonth",
      "nextId",
      ...FIELD_KEYS,
      "looseWaste",
      "vehicles",
      "tasks",
      "counters",
    ]) ||
    s.version !== 1 ||
    !integer(s.lastMonth, -1, city.month) ||
    !(stable
      ? s.lastMonth === city.month - 1
      : s.lastMonth === city.month - 1 || s.lastMonth === city.month) ||
    !integer(s.nextId, 1) ||
    !integer(s.looseWaste) ||
    !exact(s.counters, COUNTERS)
  )
    invalid();
  const totals = {
    garbage: 0,
    medical: 0,
    police: 0,
    fire: 0,
    stored: totalStored(city),
  };
  for (const key of FIELD_KEYS) {
    const a = s[key];
    if (!Array.isArray(a) || a.length !== n || Object.keys(a).length !== n)
      invalid();
    let total = 0;
    for (const v of a) {
      if (!integer(v)) invalid();
      total += v;
    }
    totals[key] = total;
  }
  for (const v of Object.values(s.counters))
    if (!integer(v, 0, COUNTER_MAX)) invalid();
  if (
    !Array.isArray(s.vehicles) ||
    s.vehicles.length > FLEET_MAX ||
    !Array.isArray(s.tasks) ||
    s.tasks.length > TASK_MAX
  )
    invalid();
  const ids = new Set(),
    vehicles = new Map(),
    tasks = new Map(),
    pairs = new Set();
  for (const v of s.vehicles) {
    if (
      !exact(v, VKEYS) ||
      !integer(v.id, 1, s.nextId - 1) ||
      ids.has(v.id) ||
      !KINDS.includes(v.kind) ||
      !integer(v.home, 0, n - 1) ||
      !integer(v.position, 0, n - 1) ||
      !["idle", "outbound", "returning"].includes(v.status) ||
      !Array.isArray(v.path) ||
      v.path.length > n ||
      Object.keys(v.path).length !== v.path.length ||
      !integer(
        v.capacity,
        v.kind === "fire" ? 0 : 1,
        v.kind === "garbage" ? 2000 : 20,
      ) ||
      !integer(v.payload, 0, v.capacity) ||
      (v.kind === "fire" && (v.payload !== 0 || v.capacity !== 0))
    )
      invalid();
    totals[v.kind] += v.payload;
    ids.add(v.id);
    vehicles.set(v.id, v);
    if (v.path.length) {
      if (
        !integer(v.cursor, 0, v.path.length - 1) ||
        v.path[v.cursor] !== v.position ||
        new Set(v.path).size !== v.path.length
      )
        invalid();
      for (let k = 0; k < v.path.length; k++)
        if (
          !integer(v.path[k], 0, n - 1) ||
          (k && distance(v.path[k - 1], v.path[k], city.width) !== 1)
        )
          invalid();
    } else if (v.cursor !== 0) invalid();
    if (v.status === "idle") {
      if (
        v.payload ||
        v.taskId !== null ||
        v.destination !== null ||
        v.path.length
      )
        invalid();
    } else if (
      !integer(v.taskId, 1, s.nextId - 1) ||
      (v.destination !== null && !integer(v.destination, 0, n - 1))
    )
      invalid();
  }
  for (const t of s.tasks) {
    if (
      !exact(t, TKEYS) ||
      !integer(t.id, 1, s.nextId - 1) ||
      ids.has(t.id) ||
      !KINDS.includes(t.kind) ||
      !integer(t.target, 0, n - 1) ||
      !["queued", "outbound", "returning", "completed"].includes(t.status)
    )
      invalid();
    ids.add(t.id);
    tasks.set(t.id, t);
    if (["queued", "completed"].includes(t.status)) {
      if (t.vehicleId !== null) invalid();
    } else if (!integer(t.vehicleId, 1, s.nextId - 1)) invalid();
    if (t.status !== "completed") {
      const pair = `${t.kind}:${t.target}`;
      if (pairs.has(pair)) invalid();
      pairs.add(pair);
    }
  }
  for (const v of s.vehicles)
    if (v.status !== "idle") {
      const t = tasks.get(v.taskId);
      if (
        !t ||
        t.vehicleId !== v.id ||
        t.kind !== v.kind ||
        t.status !== v.status
      )
        invalid();
      if (
        v.path.length &&
        v.destination !== null &&
        distance(v.path.at(-1), v.destination, city.width) > 1
      )
        invalid();
      if (v.status === "outbound" && v.destination !== t.target) invalid();
    }
  for (const t of s.tasks)
    if (["outbound", "returning"].includes(t.status)) {
      const v = vehicles.get(t.vehicleId);
      if (!v || v.taskId !== t.id || v.status !== t.status) invalid();
    }
  if (
    s.counters.naturalPatients > s.counters.createdPatients ||
    s.counters.naturalCrimes > s.counters.createdCrimes ||
    s.counters.recoveredOre > Math.floor(s.counters.processedWaste / 10)
  )
    invalid();
  totals.conservation = conservation(s, totals);
  if (!Object.values(totals.conservation).every(Boolean)) invalid();
  return totals;
}
export function validateServices(s, city, options) {
  inspectServices(s, city, options);
  return true;
}
function servicesOf(city) {
  const s = city.services || createServices(city);
  validateServices(s, city, { stable: false });
  return s;
}
function ratio(m, key) {
  const v = m?.utilities?.[key]?.ratio;
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(0, Math.min(1, v))
    : 0;
}
function road(city, i) {
  return ROAD.has(city.tiles[i]?.type) && active(city.tiles[i]);
}
function frontage(city, i) {
  if (road(city, i)) return [i];
  return neighbors(i, city).filter((j) => road(city, j));
}
function providerKind(type) {
  return type === "fire"
    ? "fire"
    : type === "clinic" || type === "hospital"
      ? "medical"
      : type === "police"
        ? "police"
        : type === "landfill" || type === "recycling"
          ? "garbage"
          : null;
}
function providers(city, m) {
  const out = [];
  for (let i = 0; i < city.tiles.length; i++) {
    const t = city.tiles[i],
      kind = providerKind(t.type),
      access = (m?.operationAccess || m?.access)?.[i],
      filled = m?.jobFill?.[i];
    if (
      !kind ||
      !active(t) ||
      !access ||
      !integer(filled, 1, 1e6) ||
      ratio(m, "power") < 0.9 ||
      ratio(m, "water") < 0.9 ||
      !frontage(city, i).length ||
      (t.type === "recycling" && !city.policies?.recycling)
    )
      continue;
    const fundingName =
      kind === "medical" ? "clinic" : kind === "garbage" ? null : kind;
    const funding = fundingName ? (city.funding?.[fundingName] ?? 100) : 100;
    if (!integer(funding, 1, 150)) continue;
    const scale = 1 + 0.5 * (integer(t.modules, 0, 3) ? t.modules : 0),
      staff = Math.min(1, filled / (TOOLS[t.type]?.jobs || 8)),
      work = (scale * staff * funding) / 100;
    out.push({
      index: i,
      kind,
      type: t.type,
      fleet: Math.min(8, Math.max(1, Math.floor(2 * work))),
      payload:
        kind === "fire"
          ? 0
          : kind === "garbage"
            ? Math.max(1, Math.floor(400 * scale))
            : Math.max(1, Math.floor(6 * scale)),
      beds: Math.max(1, Math.floor((t.type === "hospital" ? 60 : 24) * work)),
      processing: Math.max(
        1,
        Math.floor(
          (kind === "medical"
            ? t.type === "hospital"
              ? 12
              : 6
            : kind === "police"
              ? 6
              : TOOLS[t.type]?.supply || 900) * work,
        ),
      ),
    });
  }
  return out.sort(
    (a, b) =>
      KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.index - b.index,
  );
}
/**
 * Bounded road-topology cache and lazy FIFO BFS frontier per start across ticks.
 * Every tick and same-tick extinguishment compares the full active-road mask;
 * topology changes discard all frontiers. No vehicle/case/material state is cached.
 * Shared Int16 distance/predecessor/discovery-rank fields and a Uint16 queue
 * resume only as far as each query needs. The global per-city cache holds at
 * most 512 root sets (5 MiB buffers at 1280 tiles); eviction changes no route.
 * Reconstructed route arrays never alias a frontier or another vehicle path.
 */
function createRouteContext(city, identity = city) {
  const topology = roadTopology(city, identity);
  return {
    invalidate: () => topology.refresh(city),
    isRoad: (i) => topology.mask[i] === 1,
    path(start, target) {
      const goals = topology.mask[target]
        ? [target]
        : topology.adjacent[target].filter((i) => topology.mask[i]);
      const found = topology.nearest(start, goals);
      if (!found) return null;
      const result = [];
      for (let p = found.goal; p !== -1; p = found.entry.prev[p])
        result.push(p);
      return result.reverse();
    },
  };
}
function pathTo(city, start, target, routes) {
  return routes.path(start, target);
}
function nextId(s) {
  if (!integer(s.nextId, 1, MAX - 1))
    throw Error("Service identifier limit reached.");
  return s.nextId++;
}
function syncFleet(city, m, list) {
  const s = city.services,
    byIndex = new Map(list.map((p) => [p.index, p])),
    counts = new Map();
  // Active journeys retain their vehicle and cargo, including closed providers.
  // Allocate the remaining global slots fairly before retaining idle vehicles;
  // otherwise an old idle fleet can permanently exclude a new staffed depot.
  let allocated = 0;
  for (const v of s.vehicles) {
    if (v.status === "idle") continue;
    counts.set(v.home, (counts.get(v.home) || 0) + 1);
    allocated++;
  }
  const quotas = new Map(counts);
  for (let round = 0; round < 8 && allocated < FLEET_MAX; round++)
    for (const p of list) {
      if (allocated >= FLEET_MAX) break;
      const count = quotas.get(p.index) || 0;
      if (count > round || count >= p.fleet) continue;
      quotas.set(p.index, count + 1);
      allocated++;
    }
  const kept = [];
  for (const v of s.vehicles) {
    if (v.status !== "idle") {
      kept.push(v);
      continue;
    }
    const p = byIndex.get(v.home),
      count = counts.get(v.home) || 0;
    if (!p || p.kind !== v.kind || count >= (quotas.get(v.home) || 0)) continue;
    v.capacity = p.payload;
    counts.set(v.home, count + 1);
    kept.push(v);
  }
  s.vehicles = kept;
  for (let round = 0; round < 8 && s.vehicles.length < FLEET_MAX; round++)
    for (const p of list) {
      if ((counts.get(p.index) || 0) >= (quotas.get(p.index) || 0)) continue;
      const start = frontage(city, p.index)[0];
      s.vehicles.push({
        id: nextId(s),
        kind: p.kind,
        home: p.index,
        position: start,
        status: "idle",
        path: [],
        cursor: 0,
        payload: 0,
        capacity: p.payload,
        taskId: null,
        destination: null,
      });
      counts.set(p.index, (counts.get(p.index) || 0) + 1);
    }
}

function pending(s, city, kind, i) {
  return kind === "garbage"
    ? s.waste[i] + (i === gateway(city) ? s.looseWaste : 0)
    : kind === "medical"
      ? s.patients[i]
      : kind === "police"
        ? s.crimes[i]
        : city.tiles[i].fire;
}
function complete(s, v) {
  const task = s.tasks.find((t) => t.id === v.taskId);
  if (task) {
    task.status = "completed";
    task.vehicleId = null;
  }
  counter(s, "completedTrips", 1);
  Object.assign(v, {
    status: "idle",
    path: [],
    cursor: 0,
    payload: 0,
    taskId: null,
    destination: null,
  });
}
function queueTasks(city) {
  const s = city.services;
  s.tasks = s.tasks.filter(
    (t) => t.status !== "queued" || pending(s, city, t.kind, t.target) > 0,
  );
  const existing = new Set(
    s.tasks
      .filter((t) => t.status !== "completed")
      .map((t) => `${t.kind}:${t.target}`),
  );
  const candidates = [];
  for (const kind of KINDS)
    for (let i = 0; i < city.tiles.length; i++) {
      const amount = pending(s, city, kind, i);
      if (amount > 0 && !existing.has(`${kind}:${i}`))
        candidates.push({ kind, target: i, amount });
    }
  candidates.sort(
    (a, b) =>
      KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) ||
      b.amount - a.amount ||
      a.target - b.target,
  );
  for (const c of candidates) {
    while (
      s.tasks.length >= TASK_MAX &&
      s.tasks.some((t) => t.status === "completed")
    )
      s.tasks.splice(
        s.tasks.findIndex((t) => t.status === "completed"),
        1,
      );
    if (s.tasks.length >= TASK_MAX) {
      const victim = s.tasks
        .filter(
          (t) =>
            t.status === "queued" &&
            KINDS.indexOf(t.kind) > KINDS.indexOf(c.kind),
        )
        .sort(
          (a, b) =>
            KINDS.indexOf(b.kind) - KINDS.indexOf(a.kind) || b.id - a.id,
        )[0];
      if (victim) s.tasks.splice(s.tasks.indexOf(victim), 1);
    }
    if (s.tasks.length >= TASK_MAX) break;
    s.tasks.push({
      id: nextId(s),
      kind: c.kind,
      target: c.target,
      status: "queued",
      vehicleId: null,
    });
  }
  const completed = s.tasks.filter((t) => t.status === "completed");
  if (completed.length > 24) {
    const remove = new Set(
      completed.slice(0, completed.length - 24).map((t) => t.id),
    );
    s.tasks = s.tasks.filter((t) => !remove.has(t.id));
  }
}
function dispatch(city, list, routes) {
  const s = city.services,
    available = new Set(list.map((p) => p.index));
  for (const v of s.vehicles) {
    if (v.status !== "idle" || !available.has(v.home)) continue;
    const tasks = s.tasks
      .filter((t) => t.status === "queued" && t.kind === v.kind)
      .sort(
        (a, b) =>
          pending(s, city, b.kind, b.target) -
            pending(s, city, a.kind, a.target) ||
          distance(v.position, a.target, city.width) -
            distance(v.position, b.target, city.width) ||
          a.id - b.id,
      );
    for (const t of tasks) {
      const path = pathTo(city, v.position, t.target, routes);
      if (!path) continue;
      Object.assign(v, {
        status: "outbound",
        path,
        cursor: 0,
        taskId: t.id,
        destination: t.target,
      });
      t.status = "outbound";
      t.vehicleId = v.id;
      break;
    }
  }
}
function deliveryRoom(city, p) {
  const s = city.services;
  if (p.kind === "medical") return Math.max(0, p.beds - s.beds[p.index]);
  if (p.kind === "police") return Math.max(0, p.beds - s.custody[p.index]);
  if (p.kind === "fire") return Infinity;
  if (p.type === "landfill")
    return Math.max(0, 30000 - city.tiles[p.index].stored);
  return Math.max(0, (1000000 - (city.inventory?.ore || 0)) * 10);
}
function returnRoute(city, v, list, routes) {
  const candidates = [];
  for (const p of list)
    if (p.kind === v.kind && (!v.payload || deliveryRoom(city, p) > 0)) {
      const path = pathTo(city, v.position, p.index, routes);
      if (path) candidates.push({ p, path });
    }
  candidates.sort(
    (a, b) =>
      (a.p.index === v.home ? -1 : 0) - (b.p.index === v.home ? -1 : 0) ||
      a.path.length - b.path.length ||
      a.p.index - b.p.index,
  );
  if (!candidates.length) {
    v.path = [];
    v.cursor = 0;
    v.destination = null;
    return false;
  }
  v.path = candidates[0].path;
  v.cursor = 0;
  v.destination = candidates[0].p.index;
  return true;
}
function reservedGarbageTargets(s, taskId) {
  const reserved = new Set();
  for (const t of s.tasks)
    if (
      t.kind === "garbage" &&
      t.status !== "queued" &&
      t.status !== "completed" &&
      t.id !== taskId
    )
      reserved.add(t.target);
  return reserved;
}
function collectAdjacent(city, v, reserved) {
  if (v.kind !== "garbage" || v.payload >= v.capacity) return;
  const s = city.services;
  for (const i of [v.position, ...neighbors(v.position, city)]) {
    if (reserved.has(i)) continue;
    let take = Math.min(v.capacity - v.payload, s.waste[i]);
    s.waste[i] -= take;
    v.payload += take;
    counter(s, "collectedWaste", take);
    if (i === gateway(city) && v.payload < v.capacity) {
      take = Math.min(v.capacity - v.payload, s.looseWaste);
      s.looseWaste -= take;
      v.payload += take;
      counter(s, "collectedWaste", take);
    }
    if (v.payload >= v.capacity) break;
  }
}
function arriveOutbound(city, v, list, routes, reserved) {
  const s = city.services,
    t = s.tasks.find((t) => t.id === v.taskId);
  if (!t) return;
  const target = t.target;
  if (v.kind === "fire") {
    if (city.tiles[target].fire > 0) {
      city.tiles[target].fire = 0;
      if (ROAD.has(city.tiles[target].type)) routes.invalidate();
      counter(s, "extinguishedFires", 1);
    }
  } else if (v.kind === "medical") {
    const take = Math.min(v.capacity, s.patients[target]);
    s.patients[target] -= take;
    v.payload += take;
  } else if (v.kind === "police") {
    const take = Math.min(v.capacity, s.crimes[target]);
    s.crimes[target] -= take;
    v.payload += take;
  } else collectAdjacent(city, v, reserved);
  v.status = "returning";
  t.status = "returning";
  returnRoute(city, v, list, routes);
}
function deliver(city, v, p, budgets) {
  const s = city.services;
  if (v.kind === "garbage") {
    let quantity = Math.min(
      v.payload,
      deliveryRoom(city, p),
      budgets.get(p.index) || 0,
    );
    if (p.type === "landfill") {
      city.tiles[p.index].stored += quantity;
      v.payload -= quantity;
    } else {
      const recovered = Math.floor(quantity / 10);
      city.inventory.ore += recovered;
      v.payload -= quantity;
      counter(s, "processedWaste", quantity);
      counter(s, "recoveredOre", recovered);
    }
    budgets.set(p.index, (budgets.get(p.index) || 0) - quantity);
  } else if (v.kind === "medical") {
    const n = Math.min(v.payload, deliveryRoom(city, p));
    s.beds[p.index] += n;
    v.payload -= n;
  } else if (v.kind === "police") {
    const n = Math.min(v.payload, deliveryRoom(city, p));
    s.custody[p.index] += n;
    v.payload -= n;
  }
  if (!v.payload) {
    v.home = p.index;
    complete(s, v);
    return true;
  }
  return false;
}
function moveVehicles(city, m, list, routes) {
  const s = city.services,
    byIndex = new Map(list.map((p) => [p.index, p])),
    budgets = new Map(list.map((p) => [p.index, p.processing]));
  for (const v of s.vehicles) {
    if (v.status === "idle") continue;
    const reserved =
      v.kind === "garbage" ? reservedGarbageTargets(s, v.taskId) : null;
    let budget = v.kind === "garbage" ? 32 : 8,
      guard = 0;
    if (v.status === "returning") returnRoute(city, v, list, routes);
    else {
      const target = s.tasks.find((t) => t.id === v.taskId)?.target;
      const valid =
        v.path.length &&
        v.path[v.cursor] === v.position &&
        v.path.slice(v.cursor).every((i) => routes.isRoad(i));
      if (!valid && target !== undefined) {
        const route = pathTo(city, v.position, target, routes);
        v.path = route || [];
        v.cursor = 0;
      }
    }
    while (v.status !== "idle" && guard++ < city.tiles.length * 2 + 4) {
      if (!v.path.length) break;
      collectAdjacent(city, v, reserved);
      if (
        v.status === "outbound" &&
        v.kind === "garbage" &&
        v.payload >= v.capacity
      ) {
        const task = s.tasks.find((t) => t.id === v.taskId);
        v.status = "returning";
        task.status = "returning";
        if (!returnRoute(city, v, list, routes)) break;
      }
      if (v.cursor === v.path.length - 1) {
        if (v.status === "outbound") {
          arriveOutbound(city, v, list, routes, reserved);
          continue;
        }
        const p = byIndex.get(v.destination);
        if (!p || !deliver(city, v, p, budgets)) {
          v.path = [];
          v.cursor = 0;
          v.destination = null;
        }
        break;
      }
      const next = v.path[v.cursor + 1];
      if (!routes.isRoad(next)) {
        v.path = [];
        v.cursor = 0;
        break;
      }
      const cap = TOOLS[city.tiles[next].type]?.capacity || 80,
        load = Number.isFinite(m?.roadLoad?.[next])
          ? Math.max(0, m.roadLoad[next])
          : 0,
        cost = 1 + Math.min(3, Math.floor(load / cap));
      if (budget < cost) break;
      budget -= cost;
      v.cursor++;
      v.position = next;
    }
  }
}
function treatCases(city, list) {
  const s = city.services;
  for (const p of list) {
    if (p.kind === "medical") {
      const n = Math.min(s.beds[p.index], p.processing);
      s.beds[p.index] -= n;
      counter(s, "treatedPatients", n);
    }
    if (p.kind === "police") {
      const n = Math.min(s.custody[p.index], p.processing);
      s.custody[p.index] -= n;
      counter(s, "resolvedCrimes", n);
    }
  }
}
function generate(city, m) {
  const s = city.services;
  for (let i = 0; i < city.tiles.length; i++) {
    const t = city.tiles[i];
    if (!integer(t.occupancy, 1)) continue;
    addField(s.waste, i, t.occupancy);
    counter(s, "generatedWaste", t.occupancy);
    if (
      !["residential", "tower"].includes(t.type) ||
      (city.month + i) % 12 !== 0
    )
      continue;
    const air = m?.environment?.air?.[i] || 0,
      water = m?.environment?.deliveredWaterContamination || 0;
    if (air > 40 || water > 20) {
      const n = Math.min(5, Math.max(1, Math.ceil(t.occupancy / 24)));
      addField(s.patients, i, n);
      counter(s, "createdPatients", n);
      counter(s, "naturalPatients", n);
    }
    if ((m?.crime || 0) >= 60 && (m?.unemployment || 0) >= 20) {
      const n = Math.min(3, Math.max(1, Math.ceil(t.occupancy / 48)));
      addField(s.crimes, i, n);
      counter(s, "createdCrimes", n);
      counter(s, "naturalCrimes", n);
    }
  }
}
export function serviceReport(city, m = {}) {
  const s = city.services || createServices(city),
    totals = inspectServices(s, city, { stable: false }),
    uncollectedWaste = totals.waste + s.looseWaste,
    carriedWaste = totals.garbage,
    untreatedPatients = totals.patients + totals.beds + totals.medical,
    unresolvedCrimes = totals.crimes + totals.custody + totals.police,
    population = Math.max(
      1,
      Number.isFinite(m.population)
        ? m.population
        : city.tiles.reduce(
            (n, t) =>
              n + (["residential", "tower"].includes(t.type) ? t.occupancy : 0),
            0,
          ),
    );
  return {
    activeFleet: s.vehicles.filter((v) => v.status !== "idle").length,
    totalFleet: s.vehicles.length,
    queuedTasks: s.tasks.filter((t) => t.status === "queued").length,
    activeTasks: s.tasks.filter(
      (t) => t.status === "outbound" || t.status === "returning",
    ).length,
    completedTrips: s.counters.completedTrips,
    vehicles: s.vehicles.map((v) => ({
      id: v.id,
      kind: v.kind,
      position: v.position,
      status:
        v.status === "idle" ? "idle" : v.path.length ? v.status : "waiting",
      payload: v.payload,
      home: v.home,
      destination: v.destination,
    })),
    uncollectedWaste,
    carriedWaste,
    pendingWaste: uncollectedWaste + carriedWaste,
    storedWaste: totals.stored,
    processedWaste: s.counters.processedWaste,
    collectedWaste: s.counters.collectedWaste,
    untreatedPatients,
    waitingPatients: totals.patients,
    admittedPatients: totals.beds,
    carriedPatients: totals.medical,
    treatedPatients: s.counters.treatedPatients,
    unresolvedCrimes,
    waitingCrimes: totals.crimes,
    custody: totals.custody,
    carriedCrimes: totals.police,
    resolvedCrimes: s.counters.resolvedCrimes,
    healthPenalty: Math.min(60, (untreatedPatients / population) * 100),
    crimePenalty: Math.min(60, (unresolvedCrimes / population) * 100),
    conservation: totals.conservation,
    counters: { ...s.counters },
  };
}
/** Capture an independently owned, validated service report for a read-only phase.
 * Later city mutations cannot alter this snapshot. Population-dependent penalties
 * are recomputed from each call's current metrics; no live state is trusted by identity.
 */
export function createServiceReportSnapshot(city) {
  const base = serviceReport(city);
  const defaultPopulation = city.tiles.reduce(
    (n, t) => n + (["residential", "tower"].includes(t.type) ? t.occupancy : 0),
    0,
  );
  return (m = {}) => {
    const population = Math.max(
      1,
      Number.isFinite(m.population) ? m.population : defaultPopulation,
    );
    return {
      ...base,
      vehicles: base.vehicles.map((v) => ({ ...v })),
      conservation: { ...base.conservation },
      counters: { ...base.counters },
      healthPenalty: Math.min(60, (base.untreatedPatients / population) * 100),
      crimePenalty: Math.min(60, (base.unresolvedCrimes / population) * 100),
    };
  };
}
// The validated schema has scalar records and five numeric arrays. Copy those
// explicit fields without invoking the general structured-clone traversal.
function cloneServices(source) {
  return {
    ...source,
    waste: source.waste.slice(),
    patients: source.patients.slice(),
    crimes: source.crimes.slice(),
    beds: source.beds.slice(),
    custody: source.custody.slice(),
    counters: { ...source.counters },
    tasks: source.tasks.map((t) => ({ ...t })),
    vehicles: source.vehicles.map((v) => ({ ...v, path: v.path.slice() })),
  };
}
export function advanceServices(city, m = {}, { report = true } = {}) {
  const source = servicesOf(city);
  if (source.lastMonth === city.month)
    return { ...(report ? serviceReport(city, m) : {}), changed: false };
  const work = {
    ...city,
    services: cloneServices(source),
    tiles: city.tiles.map((t) => ({ ...t })),
    inventory: { ...city.inventory },
    backlogs: { ...city.backlogs },
  };
  const routes = createRouteContext(work, city),
    list = providers(work, m);
  generate(work, m);
  treatCases(work, list);
  syncFleet(work, m, list);
  queueTasks(work);
  dispatch(work, list, routes);
  moveVehicles(work, m, list, routes);
  work.services.lastMonth = city.month;
  validateServices(work.services, work, { stable: false });
  city.services = work.services;
  for (let i = 0; i < city.tiles.length; i++) {
    city.tiles[i].fire = work.tiles[i].fire;
    city.tiles[i].stored = work.tiles[i].stored;
  }
  city.inventory.ore = work.inventory.ore;
  if (city.backlogs)
    city.backlogs.waste = Math.min(
      1000000,
      sum(work.services.waste) +
        work.services.looseWaste +
        cargo(work.services, "garbage"),
    );
  return { ...(report ? serviceReport(city, m) : {}), changed: true };
}
export function serviceAction(city, a) {
  if (
    !exact(a, ["type", "kind", "x", "y", "amount"]) ||
    a.type !== "serviceIncident" ||
    !["medical", "crime"].includes(a.kind) ||
    !integer(a.x, 0, city.width - 1) ||
    !integer(a.y, 0, city.height - 1) ||
    !integer(a.amount, 1, 100)
  )
    return fail("Choose a valid medical or crime incident of1–100 cases.");
  const source = servicesOf(city),
    s = cloneServices(source),
    i = a.y * city.width + a.x,
    key = a.kind === "medical" ? "patients" : "crimes",
    c = a.kind === "medical" ? "createdPatients" : "createdCrimes";
  try {
    addField(s[key], i, a.amount);
    counter(s, c, a.amount);
  } catch {
    return fail("Incident queue limit reached.");
  }
  city.services = s;
  return okay(
    `${a.amount} ${a.kind} cases added. Actual road service is required.`,
  );
}
export function preserveDemolition(city, index) {
  if (!integer(index, 0, city.tiles.length - 1))
    return fail("Choose a valid demolition tile.");
  const source = servicesOf(city),
    s = cloneServices(source),
    tile = city.tiles[index];
  try {
    addField(s.waste, index, integer(tile.stored) ? tile.stored : 0);
    addField(s.patients, index, s.beds[index]);
    addField(s.crimes, index, s.custody[index]);
  } catch {
    return fail("Cannot preserve this facility within service queue limits.");
  }
  s.beds[index] = 0;
  s.custody[index] = 0;
  city.services = s;
  tile.stored = 0;
  return okay(
    "Stored waste and admitted cases preserved in local service queues.",
  );
}
/** Core can draft the whole month before earlier subsystem mutations at rare limits. */
export function serviceNeedsDraft(city) {
  const s = city.services;
  if (!s) return false;
  return (
    s.nextId > MAX - 256 ||
    Object.values(s.counters).some((n) => n > COUNTER_MAX - 3000000) ||
    FIELD_KEYS.some((key) => s[key].some((n) => n > MAX - 10000)) ||
    s.looseWaste > MAX - 10000
  );
}
