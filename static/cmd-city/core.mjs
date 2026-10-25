import {
  createEnvironment,
  advanceEnvironment,
  environmentReport,
  environmentAction,
} from "./environment.mjs";
import {
  createCivic,
  civicReport,
  civicAction,
  advanceCivic,
  buildPermission,
} from "./civic.mjs";
import { planTransit, routeTransit } from "./transit.mjs";
import {
  TOOLS,
  ZONES,
  RESOURCES,
  PRICES,
  RESEARCH,
  capacity,
} from "./content.mjs";
const W = 40,
  H = 32,
  N = W * H,
  GATE = 16 * W;
const roads = new Set(["road", "avenue", "bridge"]);
const buildings = (t) =>
  t.type !== "empty" &&
  !roads.has(t.type) &&
  t.type !== "rail" &&
  t.type !== "ruins";
const housing = (t) => t.type === "residential" || t.type === "tower";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const ADJACENT = Array.from({ length: N }, (_, i) =>
  [
    i % W ? i - 1 : -1,
    i % W < W - 1 ? i + 1 : -1,
    i >= W ? i - W : -1,
    i < N - W ? i + W : -1,
  ].filter((j) => j >= 0),
);
const neighbors = (i) => ADJACENT[i];
// Derived caches are external to saved city state and bounded by its road graph.
const graphCache = new WeakMap();
const employmentCache = new WeakMap();
const at = (x, y) =>
  Number.isInteger(x) &&
  Number.isInteger(y) &&
  x >= 0 &&
  x < W &&
  y >= 0 &&
  y < H
    ? y * W + x
    : -1;
function random(s) {
  let n = s.rng >>> 0;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  s.rng = n >>> 0;
  return s.rng / 4294967296;
}
const log = (s, m) => {
  s.events.push(m);
  if (s.events.length > 24) s.events.shift();
};
const RECOVERY = new Set(["road", "avenue", "bridge", "rail", "cleanup"]);
const PERMITS = new Set([
  "townHall",
  "university",
  "academy",
  "hospital",
  "waterFilter",
  "airport",
  "casino",
  "nuclear",
]);
const civicMetrics = (m) => ({ ...m, access: m.operationAccess });
const restricted = (s, i) => (s.environment?.radiation[i] || 0) >= 200;
const active = (t) => t.enabled !== false && t.fire === 0;
function roadGraph(s) {
  const signature = s.tiles
    .map((t) => (roads.has(t.type) ? "1" : "0"))
    .join("");
  const cached = graphCache.get(s);
  if (cached?.signature === signature) return cached.graph;
  const connected = Array(N).fill(false),
    frontage = Array(N).fill(-1),
    queue = [GATE];
  connected[GATE] = roads.has(s.tiles[GATE].type);
  for (let k = 0; k < queue.length; k++)
    for (const j of neighbors(queue[k]))
      if (!connected[j] && roads.has(s.tiles[j].type)) {
        connected[j] = true;
        queue.push(j);
      }
  for (let i = 0; i < N; i++) {
    if (connected[i]) frontage[i] = i;
    else
      for (const j of neighbors(i))
        if (connected[j]) {
          frontage[i] = j;
          break;
        }
  }
  const graph = {
    connected: Object.freeze(connected),
    frontage: Object.freeze(frontage),
    access: Object.freeze(frontage.map((j) => j >= 0)),
    paths: new Map(),
    orders: new Map(),
    jobSignature: "",
  };
  graphCache.set(s, { signature, graph });
  return graph;
}
function field(s, access, predicate, radiusExtra = 0, scale = 1) {
  const out = Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i],
      d = TOOLS[t.type];
    if (!predicate(t) || !active(t) || !access[i]) continue;
    const r = (d.radius || 0) + t.modules * 2 + radiusExtra,
      cx = i % W,
      cy = Math.floor(i / W);
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
        const dist = Math.abs(x - cx) + Math.abs(y - cy);
        if (dist <= r)
          out[y * W + x] = Math.max(
            out[y * W + x],
            Math.min(100, Math.round(100 * (1 - dist / (r + 1)) * scale)),
          );
      }
  }
  return out;
}
function consumption(t) {
  return housing(t) || ZONES.includes(t.type) ? t.occupancy : 0;
}
function facilityScale(s, t) {
  const name =
    t.type === "university"
      ? "school"
      : t.type === "hospital"
        ? "clinic"
        : t.type;
  return (s.funding[name] ?? 100) / 100;
}
function facilityDemand(t) {
  if (!buildings(t) || !active(t) || housing(t) || ZONES.includes(t.type))
    return { power: 0, water: 0 };
  if (["wind", "coalPlant", "nuclear", "park"].includes(t.type))
    return { power: 0, water: 0 };
  if (["water", "sewage", "landfill", "recycling"].includes(t.type))
    return { power: 20, water: 0 };
  return { power: 10, water: 5 };
}
function utilities(s, access, reservedFuel = null) {
  const u = Object.fromEntries(
    ["power", "water", "sewage", "waste"].map((k) => [
      k,
      { supply: 0, demand: 0, ratio: 1 },
    ]),
  );
  u.power.supply = s.regionalPower;
  let coalNeeded = 0,
    baseCoalSupply = 0,
    rawWater = 0,
    nuclearNeeded = 0,
    nuclearSupply = 0;
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i],
      d = TOOLS[t.type];
    if (!access[i]) continue;
    const occupied = consumption(t);
    for (const v of Object.values(u)) v.demand += occupied;
    if (active(t)) {
      const demand = facilityDemand(t);
      u.power.demand += demand.power;
      u.water.demand += demand.water;
    }
    if (!d?.utility || !active(t)) continue;
    const supply = Math.floor(d.supply * (1 + t.modules * 0.5));
    if (t.type === "coalPlant") {
      coalNeeded += 20;
      baseCoalSupply += supply;
    } else if (t.type === "nuclear") {
      nuclearNeeded += 2;
      nuclearSupply += supply;
    } else if (t.type === "wind")
      u.power.supply += Math.floor(
        supply * (s.research.completed.includes("cleanEnergy") ? 1.25 : 1),
      );
    else if (t.type === "water") rawWater += supply;
  }
  const nuclearFuelUsed = Math.min(
    nuclearNeeded,
    reservedFuel?.nuclearFuelUsed ?? s.inventory.ore,
  );
  u.power.supply += nuclearNeeded
    ? Math.floor((nuclearSupply * nuclearFuelUsed) / nuclearNeeded)
    : 0;
  const fuelUsed = Math.min(
      coalNeeded,
      reservedFuel?.fuelUsed ?? s.inventory.coal,
    ),
    fuelRatio = coalNeeded ? fuelUsed / coalNeeded : 0;
  u.power.supply += Math.floor(baseCoalSupply * fuelRatio);
  u.power.ratio = u.power.demand
    ? Math.min(1, u.power.supply / u.power.demand)
    : 1;
  u.water.supply = Math.min(
    s.groundwater,
    Math.floor(rawWater * u.power.ratio),
  );
  u.water.ratio = u.water.demand
    ? Math.min(1, u.water.supply / u.water.demand)
    : 1;
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i],
      d = TOOLS[t.type];
    if (!access[i] || !active(t) || !d?.utility) continue;
    let supply = Math.floor(d.supply * (1 + t.modules * 0.5) * u.power.ratio);
    if (t.type === "sewage") u.sewage.supply += supply;
    if (t.type === "landfill")
      u.waste.supply += Math.min(supply, 30000 - t.stored);
    if (t.type === "recycling" && s.policies.recycling)
      u.waste.supply += supply;
  }
  u.sewage.demand += s.backlogs.sewage;
  u.waste.demand += s.backlogs.waste;
  for (const k of ["sewage", "waste"])
    u[k].ratio = u[k].demand ? Math.min(1, u[k].supply / u[k].demand) : 1;
  return { ...u, fuelUsed, nuclearFuelUsed };
}
function routeEmployment(s, graph, u, coverage) {
  const roadLoad = Array(N).fill(0),
    jobFill = Array(N).fill(0),
    jobs = [];
  const ready = Math.min(u.power.ratio, u.water.ratio) >= 0.9;
  const transit = planTransit(
    s,
    graph.access.map((v) => v && ready),
  );
  let population = 0,
    workers = 0,
    employed = 0;
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i];
    if (housing(t)) population += t.occupancy;
    if (
      (t.type === "commercial" ||
        t.type === "industrial" ||
        [
          "factory",
          "mine",
          "oilWell",
          "academy",
          "waterFilter",
          "cleanup",
        ].includes(t.type)) &&
      graph.access[i] &&
      active(t)
    ) {
      const base =
        t.type === "factory" || t.type === "academy"
          ? 12
          : ["mine", "oilWell", "waterFilter", "cleanup"].includes(t.type)
            ? 8
            : t.occupancy;
      const slots = Math.floor(base * Math.min(u.power.ratio, u.water.ratio));
      if (slots) jobs.push({ i, road: graph.frontage[i], left: slots });
    }
  }
  const totalJobs = jobs.reduce((a, j) => a + j.left, 0);
  const jobByTile = new Map(jobs.map((j) => [j.i, j])),
    jobSignature = jobs.map((j) => j.i).join(",");
  if (graph.jobSignature !== jobSignature) {
    graph.orders.clear();
    graph.jobSignature = jobSignature;
  }
  const busFactor = s.research.completed.includes("transit") ? 1 / 30 : 1 / 20;
  for (let i = 0; i < N; i++) {
    const home = s.tiles[i];
    if (!housing(home)) continue;
    let need = Math.floor(home.occupancy * 0.6);
    workers += need;
    if (!need || !graph.access[i] || !active(home)) continue;
    const start = graph.frontage[i];
    if (
      transit.stations.length < 2 &&
      (TOOLS[s.tiles[start].type]?.capacity || 80) - roadLoad[start] <
        (transit.exchanges.length >= 2 ? busFactor : 1) - 1e-8
    )
      continue;
    let tree = graph.paths.get(start);
    if (!tree) {
      const prev = new Int16Array(N).fill(-1),
        distance = new Float32Array(N).fill(Infinity),
        queue = [start];
      distance[start] = 0;
      for (let k = 0; k < queue.length; k++)
        for (const next of neighbors(queue[k]))
          if (graph.connected[next] && distance[next] === Infinity) {
            distance[next] = distance[queue[k]] + 1;
            prev[next] = queue[k];
            queue.push(next);
          }
      tree = { prev, distance };
      graph.paths.set(start, tree);
    }
    const { prev, distance } = tree;
    let order = graph.orders.get(start);
    if (!order) {
      order = jobs
        .filter((j) => Number.isFinite(distance[j.road]))
        .sort((a, b) => distance[a.road] - distance[b.road] || a.i - b.i)
        .map((j) => j.i);
      graph.orders.set(start, order);
    }
    const options = order
      .map((id) => jobByTile.get(id))
      .filter((j) => j && j.left > 0);
    for (const job of options) {
      if (!need) break;
      if (transit.stations.length < 2) {
        const minimum = transit.exchanges.length >= 2 ? busFactor : 1;
        if (
          TOOLS[s.tiles[start].type].capacity - roadLoad[start] <
          minimum - 1e-8
        )
          break;
        if (
          TOOLS[s.tiles[job.road].type].capacity - roadLoad[job.road] <
          minimum - 1e-8
        )
          continue;
      }
      const path = [];
      for (let p = job.road; p !== -1; p = prev[p]) {
        path.push(p);
        if (p === start) break;
      }
      path.reverse();
      const requested = Math.min(need, job.left);
      let roadRoom = Infinity;
      for (const p of path)
        roadRoom = Math.min(
          roadRoom,
          Math.max(0, (TOOLS[s.tiles[p].type]?.capacity || 80) - roadLoad[p]),
        );
      let moved;
      if (transit.stations.length < 2 && transit.exchanges.length < 2)
        moved = { mode: "none", moved: 0, roadFactor: 1 };
      else if (roadRoom < requested * busFactor) {
        const exchanges = transit.exchanges;
        transit.exchanges = [];
        moved = routeTransit(transit, i, job.i, path, requested);
        transit.exchanges = exchanges;
        if (!moved.moved)
          moved = routeTransit(
            transit,
            i,
            job.i,
            path,
            Math.min(requested, Math.floor(roadRoom / busFactor)),
          );
      } else moved = routeTransit(transit, i, job.i, path, requested);
      if (moved.mode === "bus") moved.roadFactor = busFactor;
      const carTake = Math.min(
        requested - moved.moved,
        Math.max(
          0,
          Math.floor(roadRoom - moved.moved * moved.roadFactor + 1e-8),
        ),
      );
      const take = moved.moved + carTake;
      if (!take) continue;
      for (const p of path)
        roadLoad[p] += carTake + moved.moved * moved.roadFactor;
      need -= take;
      job.left -= take;
      jobFill[job.i] += take;
      employed += take;
    }
  }
  const busy = roadLoad.map((n, i) =>
    n ? (100 * n) / (TOOLS[s.tiles[i].type]?.capacity || 80) : 0,
  );
  return {
    population,
    workers,
    jobs: totalJobs,
    employed,
    unemployment: workers ? (100 * (workers - employed)) / workers : 0,
    jobFill,
    roadLoad,
    traffic: Math.max(0, ...busy),
    busPassengers: transit.busPassengers,
    railPassengers: transit.railPassengers,
    railLoad: transit.railLoad,
    busLoad: transit.busLoad,
  };
}
// Routing is unchanged by finance, environmental exposure or rendered reports.
// Retain only one exact routing-input snapshot per live city; all returned arrays
// are caller-owned copies so a consumer cannot corrupt this derived cache.
function cachedEmployment(s, graph, u, coverage) {
  const signature = [
    u.power.ratio,
    u.water.ratio,
    s.research.completed.includes("transit"),
    ...s.tiles.map(
      (t, i) =>
        `${t.type}:${t.occupancy}:${t.modules}:${t.enabled}:${t.fire}:${graph.access[i] ? 1 : 0}`,
    ),
  ].join("|");
  let cached = employmentCache.get(s);
  if (!cached || cached.signature !== signature) {
    cached = { signature, result: routeEmployment(s, graph, u, coverage) };
    employmentCache.set(s, cached);
  }
  const m = cached.result;
  return {
    ...m,
    jobFill: m.jobFill.slice(),
    roadLoad: m.roadLoad.slice(),
    railLoad: m.railLoad.slice(),
    busLoad: m.busLoad.slice(),
  };
}
export function measure(s, options = {}) {
  const road = roadGraph(s),
    access = road.access.map(
      (v, i) => v && (!restricted(s, i) || RECOVERY.has(s.tiles[i].type)),
    ),
    graph = { ...road, access },
    { fuelUsed, nuclearFuelUsed, ...u } = utilities(
      s,
      access,
      options.reservedFuel,
    ),
    extra = s.research.completed.includes("serviceDrones") ? 2 : 0;
  const coverage = {};
  for (const name of ["park", "school", "clinic", "fire", "police", "bus"])
    coverage[name] = field(
      s,
      graph.access,
      (t) =>
        t.type === name ||
        (name === "school" && t.type === "university") ||
        (name === "clinic" && t.type === "hospital"),
      extra,
      ((s.funding[name] ?? 100) / 100) *
        (name === "park" ? 1 : Math.min(u.power.ratio, u.water.ratio)),
    );
  const employment = cachedEmployment(s, graph, u, coverage);
  // The operational graph shares cached Maps with the physical graph, but its
  // primitive signature must also be retained or each measure re-sorts all jobs.
  road.jobSignature = graph.jobSignature;
  const environment = environmentReport(s, {
    ...employment,
    access,
    utilities: u,
    fuelUsed,
    // During the monthly transaction the ore is already reserved and deducted.
    // The pure source forecast must not reserve that same physical stock twice.
    nuclearFuelUsed: options.reservedFuel ? 0 : nuclearFuelUsed,
  });
  const pollution = environment.air;
  const landValue = pollution.map((p, i) =>
    clamp(
      45 +
        coverage.park[i] * 0.35 +
        coverage.school[i] * 0.1 +
        coverage.clinic[i] * 0.1 -
        p * 0.65 -
        environment.ground[i] * 0.15 -
        environment.radiation[i],
      0,
      100,
    ),
  );
  const homes = s.tiles
    .map((t, i) => (housing(t) && t.occupancy ? i : -1))
    .filter((i) => i >= 0);
  const avg = (a) =>
    homes.length ? homes.reduce((n, i) => n + a[i], 0) / homes.length : 0;
  const education = avg(coverage.school),
    health = clamp(
      55 +
        avg(coverage.clinic) * 0.45 -
        environment.healthPenalty -
        (1 - u.sewage.ratio) * 30 -
        (1 - u.waste.ratio) * 25,
      0,
      100,
    );
  const crime = clamp(
    25 +
      employment.unemployment * 0.35 -
      avg(coverage.police) * 0.4 +
      s.tiles.filter((t) => t.type === "casino").length * 4,
    0,
    100,
  );
  const happiness = clamp(
    65 +
      avg(coverage.park) * 0.2 +
      education * 0.08 +
      health * 0.08 -
      employment.unemployment * 0.4 -
      avg(pollution) * 0.25 -
      crime * 0.2 -
      (1 - u.power.ratio) * 35 -
      (1 - u.water.ratio) * 35 -
      (s.taxes.residential - 9) * 2,
    0,
    100,
  );
  const cap = { residential: 0, commercial: 0, industrial: 0 },
    occupied = { residential: 0, commercial: 0, industrial: 0 };
  for (const t of s.tiles) {
    const key = housing(t) ? "residential" : t.type;
    if (ZONES.includes(key)) {
      cap[key] += capacity(t);
      occupied[key] += t.occupancy;
    }
  }
  const operation = Math.min(u.power.ratio, u.water.ratio),
    vacancies = Math.max(0, employment.jobs - employment.workers);
  const demand = {
    residential: clamp(
      30 +
        vacancies * 0.3 +
        (happiness - 50) * 0.8 -
        (s.taxes.residential - 9) * 4 -
        employment.unemployment * 0.25,
      0,
      100,
    ),
    commercial: clamp(
      30 +
        employment.population * 0.2 -
        cap.commercial * 0.6 -
        (s.taxes.commercial - 9) * 4 +
        s.tiles.filter((t) => t.type === "tourism").length * 8,
      0,
      100,
    ),
    industrial: clamp(
      45 +
        employment.workers * 0.2 -
        cap.industrial * 0.4 -
        (s.taxes.industrial - 9) * 4,
      0,
      100,
    ),
  };
  let income = s.tiles.reduce(
      (a, t, i) =>
        a +
        (graph.access[i] &&
        active(t) &&
        Math.min(u.power.ratio, u.water.ratio) >= 0.9
          ? t.type === "tourism"
            ? 15000
            : t.type === "casino"
              ? 25000
              : t.type === "airport"
                ? 10000
                : 0
          : 0) *
          (1 + t.modules * 0.5),
      0,
    ),
    upkeep = 0;
  const taxBases = { residential: 2400, commercial: 8000, industrial: 6000 };
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i],
      d = TOOLS[t.type];
    if (!d) continue;
    upkeep += Math.round(
      d.upkeep *
        (1 + t.modules * 0.5) *
        facilityScale(s, t) *
        (t.enabled === false ? 0.1 : 1),
    );
    const key = housing(t) ? "residential" : t.type;
    if (ZONES.includes(key) && graph.access[i] && active(t)) {
      const taxable =
        key === "residential"
          ? t.occupancy
          : Math.floor(t.occupancy * operation);
      income += Math.floor((taxable * taxBases[key] * s.taxes[key]) / 100);
    }
  }
  const debt = s.bonds.reduce((n, b) => n + Math.min(b.payment, b.balance), 0),
    warnings = [];
  if (!employment.population)
    warnings.push("Zone homes next to gateway-connected roads.");
  for (const [k, v] of Object.entries(u))
    if (v && typeof v === "object" && v.ratio < 1)
      warnings.push(
        `${k[0].toUpperCase() + k.slice(1)} shortage: ${Math.round(v.ratio * 100)}% of occupied demand served.`,
      );
  if (employment.unemployment > 25)
    warnings.push("Workers need more reachable, supplied jobs.");
  if (s.cash < 0)
    warnings.push(
      "Treasury in deficit. Decommission costs are allowed so you can reduce upkeep.",
    );
  if (employment.traffic >= 90)
    warnings.push(
      "Road bottleneck: upgrade loaded roads or add an alternate route.",
    );
  if (s.inventory.goods < occupied.commercial)
    warnings.push(
      "Shops lack goods. Add industry or enable imports at a trade depot.",
    );
  if (s.groundwater <= 0)
    warnings.push("Groundwater exhausted; pump output is zero.");
  const monthly = {
    income,
    upkeep,
    debt,
    trade: 0,
    net: income - upkeep - debt,
  };
  const result = {
    ...employment,
    fuelUsed,
    nuclearFuelUsed,
    environment,
    roadAccess: road.access,
    education,
    health,
    crime,
    happiness,
    pollutionAverage: avg(pollution),
    utilities: u,
    demand,
    monthly,
    access: road.access,
    operationAccess: access,
    roadLoad: employment.roadLoad,
    pollution,
    landValue,
    coverage,
    warnings,
    counts: cap,
  };
  result.civic = civicReport(s, civicMetrics(result));
  return result;
}
export function createCity({
  seed = 2013,
  starter = true,
  name = "Riverbend",
  sandbox = false,
} = {}) {
  if (!Number.isInteger(seed)) seed = 2013;
  seed = seed >>> 0 || 1;
  const s = {
    version: 2,
    width: W,
    height: H,
    seed,
    rng: seed,
    name: (String(name).trim() || "Riverbend").slice(0, 80),
    month: 0,
    cash: sandbox ? 25000000 : 5000000,
    sandbox: !!sandbox,
    taxes: { residential: 9, commercial: 9, industrial: 9 },
    funding: { school: 100, clinic: 100, fire: 100, police: 100 },
    policies: { recycling: false, disasters: false },
    research: { points: 0, completed: [] },
    inventory: {
      coal: 200,
      ore: 0,
      oil: 0,
      goods: 1000,
      alloy: 0,
      electronics: 0,
    },
    trade: Object.fromEntries(RESOURCES.map((r) => [r, "off"])),
    bonds: [],
    history: [],
    events: [],
    regionalPower: 0,
    backlogs: { sewage: 0, waste: 0 },
    groundwater: 1000000,
    environment: createEnvironment(W, H),
    civic: createCivic({ sandbox: !!sandbox, month: 0 }),
    tiles: [],
  };
  for (let y = 0; y < H; y++) {
    const river = 27 + Math.round(Math.sin(y * 0.25 + (seed % 9)) * 2);
    for (let x = 0; x < W; x++) {
      const water = x >= river && x < river + 3,
        roll = random(s),
        resource =
          !water && roll < 0.025
            ? "coal"
            : !water && roll < 0.05
              ? "ore"
              : !water && roll < 0.065
                ? "oil"
                : null;
      s.tiles.push({
        terrain: water ? "water" : "land",
        type: "empty",
        occupancy: 0,
        level: 1,
        modules: 0,
        fire: 0,
        resource,
        reserve: resource ? Math.floor(3000 + random(s) * 7000) : 0,
        age: 0,
        stored: 0,
        enabled: true,
      });
    }
  }
  s.tiles[GATE].type = "road";
  if (starter) {
    const place = (type, x, y, occupancy = 0) =>
      Object.assign(s.tiles[y * W + x], { type, occupancy });
    for (let x = 1; x <= 21; x++) place("road", x, 16);
    for (let x = 4; x <= 21; x++) {
      place("road", x, 10);
      place("road", x, 22);
    }
    for (const x of [4, 10, 16])
      for (let y = 10; y <= 22; y++) place("road", x, y);
    for (const [type, x] of [
      ["wind", 1],
      ["water", 2],
      ["sewage", 3],
      ["landfill", 5],
      ["school", 6],
      ["clinic", 7],
      ["fire", 8],
      ["police", 9],
      ["park", 11],
      ["trade", 12],
      ["townHall", 13],
    ])
      place(type, x, 15);
    for (let x = 5; x <= 15; x++) {
      place("residential", x, 9, 14);
      place("residential", x, 23, 12);
      if (x !== 10) place("residential", x, 11, 10);
    }
    for (let x = 17; x <= 21; x++) {
      place("industrial", x, 9, 15);
      place("industrial", x, 23, 15);
      place("commercial", x, 11, 10);
      place("commercial", x, 21, 10);
    }
    log(
      s,
      "Starter town: prebuilt infrastructure and 50,000 in starting treasury.",
    );
  }
  return s;
}
const success = (message) => ({ ok: true, message }),
  fail = (message) => ({ ok: false, message });
export function applyAction(s, a) {
  if (
    !a ||
    typeof a !== "object" ||
    Array.isArray(a) ||
    !Object.hasOwn(a, "type") ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(a))
  )
    return fail("Invalid action.");
  if (a.type === "environment") return environmentAction(s, a.action);
  if (["department", "request", "tutorial", "redeemBond"].includes(a.type))
    return civicAction(s, a, civicMetrics(measure(s)));
  const i = at(a.x, a.y),
    t = i >= 0 ? s.tiles[i] : null;
  if (a.type === "build") {
    const d =
      typeof a.tool === "string" && Object.hasOwn(TOOLS, a.tool)
        ? TOOLS[a.tool]
        : null;
    if (!t || !d) return fail("Choose a valid tool and map tile.");
    if (t.type !== "empty")
      return fail("This tile is occupied. Demolish it before rebuilding.");
    if (t.terrain === "water" && a.tool !== "bridge")
      return fail("Only bridges may be built on water.");
    if (t.terrain !== "water" && a.tool === "bridge")
      return fail("Place bridges on river tiles.");
    if (a.tool === "mine" && !["coal", "ore"].includes(t.resource))
      return fail("A mine requires a coal or ore deposit.");
    if (a.tool === "oilWell" && t.resource !== "oil")
      return fail("An oil well requires an oil deposit.");
    if (
      a.tool === "port" &&
      !neighbors(i).some((j) => s.tiles[j].terrain === "water")
    )
      return fail("A freight terminal needs waterfront land.");
    if (a.tool === "tower" && !s.research.completed.includes("vertical"))
      return fail("Complete Vertical construction research first.");
    if (restricted(s, i) && !RECOVERY.has(a.tool))
      return fail(
        "Radiation restricts new development here. Build recovery access or cleanup first.",
      );
    if (a.tool === "townHall" && !roadGraph(s).access[i])
      return fail("Town Hall needs a site connected to the regional gateway.");
    if (PERMITS.has(a.tool)) {
      const permission = buildPermission(s, a.tool, civicMetrics(measure(s)));
      if (!permission.ok) return permission;
    }
    if (s.cash < d.cost)
      return fail("Insufficient treasury for this construction.");
    s.cash -= d.cost;
    Object.assign(t, {
      type: a.tool,
      occupancy: 0,
      level: 1,
      modules: 0,
      fire: 0,
      age: 0,
      stored: 0,
      enabled: true,
    });
    return success(
      `${d.label} built. Monthly upkeep ${(d.upkeep / 100).toFixed(0)}.`,
    );
  }
  if (a.type === "bulldoze") {
    if (!t || t.type === "empty") return fail("Choose an existing structure.");
    if (i === GATE) return fail("The regional gateway cannot be demolished.");
    if (s.cash < -1e12 + 2500)
      return fail(
        "Treasury limit reached; decommissioning would exceed supported debt.",
      );
    s.cash -= 2500;
    Object.assign(t, {
      type: "empty",
      occupancy: 0,
      level: 1,
      modules: 0,
      fire: 0,
      age: 0,
      stored: 0,
      enabled: true,
    });
    return success("Decommissioned for 25. Future upkeep reduced.");
  }
  if (a.type === "upgrade") {
    if (!t || !TOOLS[t.type]) return fail("Select a structure to upgrade.");
    if (restricted(s, i) && !RECOVERY.has(t.type))
      return fail("Radiation restricts expansion on this tile.");
    if (roads.has(t.type)) {
      if (t.type !== "road")
        return fail("This road is already at its supported class.");
      if (s.cash < TOOLS.avenue.cost) return fail("Insufficient treasury.");
      s.cash -= TOOLS.avenue.cost;
      t.type = "avenue";
      return success("Local road upgraded to avenue.");
    }
    if (capacity(t)) {
      if (t.level >= 3) return fail("Maximum density reached.");
      const cost = TOOLS[t.type].cost * t.level;
      if (s.cash < cost) return fail("Insufficient treasury.");
      s.cash -= cost;
      t.level++;
      return success(
        "Density capacity increased. Existing occupancy is unchanged.",
      );
    }
    if (t.type === "rail")
      return fail("No module upgrade is implemented for this infrastructure.");
    if (t.modules >= 3) return fail("Maximum module expansion reached.");
    const cost = TOOLS[t.type].cost;
    if (s.cash < cost) return fail("Insufficient treasury.");
    s.cash -= cost;
    t.modules++;
    return success("Facility module added: capacity and upkeep increased.");
  }
  if (a.type === "toggle") {
    if (!t || !buildings(t)) return fail("Select a facility.");
    t.enabled = !t.enabled;
    return success(
      t.enabled
        ? "Facility reopened."
        : "Facility closed; 10% standby upkeep remains.",
    );
  }
  if (a.type === "tax") {
    if (
      !ZONES.includes(a.sector) ||
      !Number.isInteger(a.value) ||
      a.value < 0 ||
      a.value > 20
    )
      return fail("Tax rates must be 0–20%.");
    s.taxes[a.sector] = a.value;
    return success("Tax rate updated for future months.");
  }
  if (a.type === "funding") {
    if (
      typeof a.service !== "string" ||
      !Object.hasOwn(s.funding, a.service) ||
      !Number.isInteger(a.value) ||
      a.value < 0 ||
      a.value > 150
    )
      return fail("Funding must be 0–150%.");
    s.funding[a.service] = a.value;
    return success("Funding updated; coverage and upkeep respond.");
  }
  if (a.type === "policy") {
    if (
      typeof a.name !== "string" ||
      !Object.hasOwn(s.policies, a.name) ||
      typeof a.value !== "boolean"
    )
      return fail("Invalid policy.");
    s.policies[a.name] = a.value;
    return success("Policy updated.");
  }
  if (a.type === "rename") {
    if (typeof a.value !== "string" || !a.value.trim() || a.value.length > 80)
      return fail("City name must contain 1–80 characters.");
    s.name = a.value.trim();
    return success("City renamed.");
  }
  if (a.type === "bond") {
    if (s.cash > 1e12 - 2000000)
      return fail(
        "Treasury limit reached; this bond would exceed supported cash.",
      );
    if (s.bonds.length >= 3) return fail("At most three outstanding bonds.");
    s.cash += 2000000;
    s.bonds.push({ balance: 2200000, payment: 91667, months: 24 });
    return success("20,000 received; repay 22,000 over 24 months.");
  }
  if (a.type === "trade") {
    if (
      !RESOURCES.includes(a.resource) ||
      !["off", "import", "export"].includes(a.mode)
    )
      return fail("Invalid trade order.");
    s.trade[a.resource] = a.mode;
    return success("Trade order updated; connected depot required to execute.");
  }
  if (a.type === "research") {
    const topic =
      typeof a.topic === "string" && Object.hasOwn(RESEARCH, a.topic)
        ? RESEARCH[a.topic]
        : null;
    if (!topic || s.research.completed.includes(a.topic))
      return fail("Choose an unfinished research topic.");
    const m = measure(s);
    if (
      !s.tiles.some(
        (t, i) => t.type === "academy" && m.operationAccess[i] && active(t),
      )
    )
      return fail("Build a connected Civic Research Institute.");
    if (topic.requires.some((x) => !s.research.completed.includes(x)))
      return fail("Complete prerequisite research first.");
    if (s.research.points < topic.cost)
      return fail("Insufficient research points.");
    s.research.points -= topic.cost;
    s.research.completed.push(a.topic);
    return success(`${topic.label} completed.`);
  }
  if (a.type === "disaster") {
    if (!["fire", "flood", "meteor", "tornado"].includes(a.kind))
      return fail("Unknown disaster.");
    const targets = s.tiles
      .map((v, j) => (buildings(v) ? j : -1))
      .filter((j) => j >= 0);
    if (!targets.length) return fail("No developed structures to affect.");
    if (
      a.kind === "flood" &&
      !targets.some((j) =>
        neighbors(j).some((k) => s.tiles[k].terrain === "water"),
      )
    )
      return fail("No exposed waterfront structures for a flood.");
    const target = targets[Math.floor(random(s) * targets.length)];
    if (a.kind === "fire") s.tiles[target].fire = 3;
    else {
      const affected =
        a.kind === "flood"
          ? s.tiles
              .map((v, j) =>
                buildings(v) &&
                neighbors(j).some((k) => s.tiles[k].terrain === "water")
                  ? j
                  : -1,
              )
              .filter((j) => j >= 0)
          : a.kind === "meteor"
            ? s.tiles
                .map((v, j) =>
                  Math.abs((j % W) - (target % W)) +
                    Math.abs(Math.floor(j / W) - Math.floor(target / W)) <=
                  2
                    ? j
                    : -1,
                )
                .filter((j) => j >= 0)
            : s.tiles
                .map((v, j) =>
                  Math.abs((j % W) - (target % W)) <= 1 &&
                  Math.abs(Math.floor(j / W) - Math.floor(target / W)) <= 6
                    ? j
                    : -1,
                )
                .filter((j) => j >= 0);
      if (!affected.length)
        return fail("No exposed waterfront structures for a flood.");
      for (const j of affected) {
        if (j === GATE || s.tiles[j].type === "empty") continue;
        Object.assign(s.tiles[j], { type: "ruins", occupancy: 0, fire: 0 });
      }
    }
    log(
      s,
      `${a.kind[0].toUpperCase() + a.kind.slice(1)} incident in month ${s.month}.`,
    );
    return success("Incident affected the map. Inspect damage and rebuild.");
  }
  return fail("Unknown action.");
}
function simulateMonth(s) {
  const initial = measure(s);
  advanceEnvironment(s, { ...initial, access: initial.operationAccess });
  // Reserve actual fuel before any mine, factory, trade or recycling transaction.
  const reservedFuel = {
    fuelUsed: initial.fuelUsed,
    nuclearFuelUsed: initial.nuclearFuelUsed,
  };
  s.inventory.coal -= reservedFuel.fuelUsed;
  s.inventory.ore -= reservedFuel.nuclearFuelUsed;
  const monthMeasure = () => measure(s, { reservedFuel });
  let m = monthMeasure();
  let power = Math.max(0, m.utilities.power.supply - m.utilities.power.demand),
    water = Math.max(0, m.utilities.water.supply - m.utilities.water.demand);
  let total = 0;
  let incidentChanged = false;
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i];
    if (!t.fire) continue;
    incidentChanged = true;
    if (t.fire) {
      if (m.coverage.fire[i] >= 20) t.fire = Math.max(0, t.fire - 1);
      else {
        t.occupancy = Math.floor(t.occupancy * 0.6);
        t.fire--;
        if (t.fire === 0) {
          t.type = "ruins";
          t.occupancy = 0;
        }
      }
    }
  }
  if (incidentChanged) m = monthMeasure();
  let shrunk = false;
  // Shrink first, then reserve the genuinely freed capacity before allocating growth.
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i];
    if (!consumption(t)) continue;
    const shortage =
      m.environment.restricted[i] ||
      !m.operationAccess[i] ||
      !active(t) ||
      Math.min(m.utilities.power.ratio, m.utilities.water.ratio) < 0.98 ||
      m.happiness < 20 ||
      m.health < 25;
    const goodsShort =
      t.type === "commercial" && s.inventory.goods < t.occupancy;
    if (shortage || goodsShort) {
      const lost = Math.min(
        t.occupancy,
        Math.max(1, Math.ceil(t.occupancy * 0.12)),
      );
      t.occupancy -= lost;
      shrunk = true;
    }
  }
  if (shrunk) m = monthMeasure();
  power = Math.max(0, m.utilities.power.supply - m.utilities.power.demand);
  water = Math.max(0, m.utilities.water.supply - m.utilities.water.demand);
  const proposals = [];
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i],
      key = housing(t) ? "residential" : t.type;
    if (!ZONES.includes(key) || !m.operationAccess[i] || !active(t)) continue;
    t.age++;
    const demand = m.demand[key];
    let want =
      demand > 15 && s.taxes[key] < 18
        ? Math.min(
            capacity(t) - t.occupancy,
            Math.max(1, Math.floor(demand / 20)),
          )
        : 0;
    if (housing(t) && m.pollution[i] > 65) want = 0;
    if (want > 0) {
      proposals.push({ i, want, received: 0 });
      total += want;
    }
  }
  const available = Math.max(0, Math.floor(Math.min(power, water, total)));
  let assigned = 0;
  for (const p of proposals) {
    p.received = total ? Math.floor((available * p.want) / total) : 0;
    assigned += p.received;
  }
  for (const p of proposals) {
    if (assigned >= available) break;
    if (p.received < p.want) {
      p.received++;
      assigned++;
    }
  }
  let populationRoom = Math.max(0, 1000000 - m.population);
  for (const p of proposals) {
    const tile = s.tiles[p.i];
    const received = housing(tile)
      ? Math.min(populationRoom, p.received)
      : p.received;
    tile.occupancy += received;
    if (housing(tile)) populationRoom -= received;
  }
  if (assigned > 0) m = monthMeasure();
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i];
    if (!m.operationAccess[i] || !active(t)) continue;
    if (t.type === "mine" || t.type === "oilWell") {
      const amount = Math.min(
        t.reserve,
        1000000 - s.inventory[t.resource],
        Math.floor(
          ((t.type === "mine" ? 40 : 35) *
            (1 + t.modules * 0.5) *
            m.jobFill[i]) /
            8,
        ),
      );
      if (amount && t.resource) {
        t.reserve -= amount;
        s.inventory[t.resource] = Math.min(
          1000000,
          s.inventory[t.resource] + amount,
        );
      }
    }
    if (
      t.type === "factory" &&
      m.utilities.power.ratio >= 0.9 &&
      m.utilities.water.ratio >= 0.9
    ) {
      const runs = Math.min(
        Math.floor((5 * (1 + t.modules * 0.5) * m.jobFill[i]) / 12),
        Math.floor(s.inventory.ore / 3),
        Math.floor(s.inventory.oil / 2),
        Math.floor((1000000 - s.inventory.alloy) / 2),
        1000000 - s.inventory.electronics,
      );
      s.inventory.ore -= runs * 3;
      s.inventory.oil -= runs * 2;
      s.inventory.alloy += runs * 2;
      s.inventory.electronics += runs;
    }
    if (t.type === "industrial")
      s.inventory.goods = Math.min(
        1000000,
        s.inventory.goods + Math.floor(m.jobFill[i] * 0.8),
      );
    if (
      t.type === "academy" &&
      m.utilities.power.ratio >= 0.9 &&
      m.utilities.water.ratio >= 0.9 &&
      m.jobFill[i] > 0
    )
      s.research.points = Math.min(
        1000000,
        s.research.points + 8 + t.modules * 4,
      );
    if (t.type === "university" && m.employed > 0)
      s.research.points = Math.min(1000000, s.research.points + 2);
  }
  const shops = s.tiles.reduce(
    (a, t) => a + (t.type === "commercial" ? t.occupancy : 0),
    0,
  );
  s.inventory.goods = Math.max(0, s.inventory.goods - shops);
  let trade = 0;
  const depots = s.tiles.reduce(
    (n, t, i) =>
      n +
      ((t.type === "trade" || t.type === "port") &&
      m.operationAccess[i] &&
      active(t) &&
      Math.min(m.utilities.power.ratio, m.utilities.water.ratio) >= 0.9
        ? 1 + t.modules * 0.5
        : 0),
    0,
  );
  if (depots)
    for (const r of RESOURCES) {
      const batch = Math.floor(50 * depots),
        mode = s.trade[r];
      if (mode === "export") {
        const sold = Math.min(batch, s.inventory[r]);
        s.inventory[r] -= sold;
        trade += Math.floor(sold * PRICES[r] * 0.9);
      }
      if (mode === "import") {
        const buy = Math.min(
          batch,
          1000000 - s.inventory[r],
          Math.max(0, Math.floor((s.cash + trade) / PRICES[r])),
        );
        s.inventory[r] += buy;
        trade -= buy * PRICES[r];
      }
    }

  const pumped = Math.ceil(
    Math.min(m.utilities.water.supply, m.utilities.water.demand),
  );
  s.groundwater = Math.max(0, s.groundwater - pumped);
  s.backlogs.sewage = Math.min(
    1000000,
    Math.max(0, m.utilities.sewage.demand - m.utilities.sewage.supply),
  );
  let wasteRemaining = m.utilities.waste.demand;
  for (let i = 0; i < N; i++) {
    const t = s.tiles[i];
    if (!m.operationAccess[i] || !active(t)) continue;
    const supply = Math.floor(
      (TOOLS[t.type]?.supply || 0) *
        (1 + t.modules * 0.5) *
        m.utilities.power.ratio,
    );
    if (t.type === "landfill") {
      const n = Math.min(wasteRemaining, supply, 30000 - t.stored);
      t.stored += n;
      wasteRemaining -= n;
    }
    if (t.type === "recycling" && s.policies.recycling) {
      const n = Math.min(
        wasteRemaining,
        supply,
        (1000000 - s.inventory.ore) * 10,
      );
      s.inventory.ore += Math.floor(n / 10);
      wasteRemaining -= n;
    }
  }
  s.backlogs.waste = Math.min(1000000, wasteRemaining);
  // Financials describe end-of-month occupancy. Fuel was reserved for this month's service.
  const finance = m.monthly;
  finance.trade = trade;
  finance.net = finance.income - finance.upkeep - finance.debt + trade;
  s.cash += finance.net;
  if (!Number.isSafeInteger(s.cash) || Math.abs(s.cash) > 1e12)
    throw Error(
      "Treasury limit reached. The city was preserved; export it or adjust its budget.",
    );
  for (const b of s.bonds) {
    const n = Math.min(b.balance, b.payment);
    b.balance -= n;
    b.months--;
  }
  s.bonds = s.bonds.filter((b) => b.balance > 0);
  s.month++;
  s.history.push({
    month: s.month,
    population: m.population,
    happiness: Math.round(m.happiness),
    cash: s.cash,
    ...finance,
  });
  if (s.history.length > 24) s.history.shift();
  if (s.policies.disasters && random(s) < 0.02)
    applyAction(s, { type: "disaster", kind: "fire" });
  const finalMetrics = monthMeasure();
  advanceCivic(s, civicMetrics(finalMetrics));
  return measure(s);
}
export function inspectTile(s, x, y, m = measure(s)) {
  const i = at(x, y);
  if (i < 0)
    return {
      title: "Outside the city",
      lines: [],
      blockers: ["Choose a valid tile."],
      connected: false,
      operating: false,
    };
  const t = s.tiles[i],
    d = TOOLS[t.type],
    connected = (m.roadAccess || m.access)[i],
    blockers = [...(m.environment?.blockers[i] || [])],
    lines = [`Column ${x}, row ${y} · ${t.terrain}`];
  if (t.resource)
    lines.push(`${t.resource}: ${t.reserve.toLocaleString()} units remaining.`);
  if (t.type !== "empty") {
    lines.push(
      connected
        ? "Connected to the regional road gateway."
        : "No road path to the regional gateway.",
    );
    if (!connected)
      blockers.push("Connect this lot to a gateway-accessible road.");
    if (t.enabled === false) blockers.push("This facility is closed.");
    if (t.fire) blockers.push("Active fire: provide fire coverage.");
    if (consumption(t) || ZONES.includes(t.type)) {
      lines.push(
        `Occupancy ${t.occupancy} / ${capacity(t)} · density ${t.level}`,
      );
      if (m.utilities.power.ratio < 1)
        blockers.push("Insufficient connected power capacity.");
      if (m.utilities.water.ratio < 1)
        blockers.push("Insufficient connected water capacity.");
      const key = housing(t) ? "residential" : t.type;
      if (m.demand[key] < 20) blockers.push("Low sector demand.");
      if (s.taxes[key] >= 18)
        blockers.push("Tax rate is suppressing development.");
    }
    if (d) {
      lines.push(
        `Monthly upkeep: ${((d.upkeep * (1 + t.modules * 0.5) * facilityScale(s, t) * (t.enabled === false ? 0.1 : 1)) / 100).toFixed(0)} · Modules ${t.modules}/3`,
      );
      lines.push(d.description);
    }
  }
  lines.push(
    `Pollution ${Math.round(m.pollution[i])}/100 · Land value ${Math.round(m.landValue[i])}/100`,
  );
  if (roads.has(t.type))
    lines.push(
      `Assigned commuter trips: ${Math.round(m.roadLoad[i])} / ${d.capacity}`,
    );
  if (t.type === "landfill")
    lines.push(`Stored waste: ${t.stored}/30,000 units.`);
  lines.push(
    `Air ${m.environment.air[i].toFixed(1)}/100 · Ground ${m.environment.ground[i].toFixed(1)}/100 · Radiation ${m.environment.radiation[i].toFixed(1)}/100`,
  );
  if (t.type === "water")
    lines.push(
      `Pump contamination ${m.environment.pumpContamination[i].toFixed(1)}/100 · Delivered water contamination ${m.environment.deliveredWaterContamination.toFixed(1)}/100`,
    );
  const demand = facilityDemand(t),
    threshold = ["factory", "trade", "port", "academy"].includes(t.type)
      ? 0.9
      : 1e-9;
  let operating =
    connected &&
    m.operationAccess[i] &&
    active(t) &&
    t.type !== "empty" &&
    t.type !== "ruins";
  if (demand.power && m.utilities.power.ratio < threshold) {
    operating = false;
    blockers.push("Insufficient supplied power for this facility.");
  }
  if (demand.water && m.utilities.water.ratio < threshold) {
    operating = false;
    blockers.push("Insufficient supplied water for this facility.");
  }
  if (
    [
      "mine",
      "oilWell",
      "factory",
      "academy",
      "waterFilter",
      "cleanup",
    ].includes(t.type) &&
    !m.jobFill[i]
  ) {
    operating = false;
    blockers.push("No filled worker positions at this facility.");
  }
  if (["mine", "oilWell"].includes(t.type) && !t.reserve) {
    operating = false;
    blockers.push("This resource deposit is exhausted.");
  }
  if (t.type === "coalPlant" && !s.inventory.coal) {
    operating = false;
    blockers.push("No coal remains for generation.");
  }
  if (t.type === "nuclear" && !s.inventory.ore) {
    operating = false;
    blockers.push(
      "No finite ore remains for nuclear generation (2 units per plant per month).",
    );
  }
  if (t.type === "water" && !s.groundwater) {
    operating = false;
    blockers.push("The groundwater reserve is exhausted.");
  }
  if (t.type === "landfill" && t.stored >= 30000) {
    operating = false;
    blockers.push("Landfill storage is full.");
  }
  if (t.type === "recycling" && !s.policies.recycling) {
    operating = false;
    blockers.push("Enable the recycling policy to process waste.");
  }
  if (facilityScale(s, t) === 0) {
    operating = false;
    blockers.push("This service has no operating funding.");
  }
  return {
    title:
      d?.label ||
      (t.type === "ruins"
        ? "Damaged structure"
        : t.terrain === "water"
          ? "River"
          : "Open land"),
    lines,
    blockers,
    connected,
    operating,
  };
}

// Only boundary saves use a draft. Ordinary monthly play keeps the fast in-place path.
export function advanceMonth(s) {
  if (s.month >= 1000000)
    throw Error(
      "This city has reached its supported month limit. Export it or create a new region.",
    );
  if (Math.abs(s.cash) > 1e12 - 1e10) {
    const draft = structuredClone(s);
    const result = simulateMonth(draft);
    if (!Number.isSafeInteger(draft.cash) || Math.abs(draft.cash) > 1e12)
      throw Error(
        "Treasury limit reached. The city was preserved; export it or adjust its budget.",
      );
    Object.assign(s, draft);
    return result;
  }
  return simulateMonth(s);
}
