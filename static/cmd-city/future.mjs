/** Original future-city systems. Population remains canonical on each tower tile.
 * Reports are pure; core owns population growth, household trades and booking
 * the returned corporate revenue exactly once in its monthly transaction.
 */
const MAX_FLOORS = 12,
  MAX_STOCK = 1_000_000,
  MAX_MONEY = 1_000_000_000_000;
const definition = (cost, upkeep, jobs, extra = {}) =>
  Object.freeze({ cost, upkeep, jobs, ...extra });
export const FUTURE_FLOORS = Object.freeze({
  homes: definition(200000, 4000, 0, { capacity: 90 }),
  shops: definition(260000, 6000, 12, { bundles: 48 }),
  offices: definition(300000, 7000, 40),
  power: definition(420000, 10000, 8, { supply: 400 }),
  water: definition(360000, 8000, 8, { supply: 300 }),
  school: definition(280000, 8000, 8, { places: 80 }),
  park: definition(180000, 4000, 2, { benefit: 8 }),
  crown: definition(500000, 10000, 4, { benefit: 12 }),
});
export const FUTURE_RULES = Object.freeze({
  maximumFloors: MAX_FLOORS,
  maximumComposite: MAX_STOCK,
  corporateStaff: 12,
  corporateBatches: 8,
  oilPerComposite: 2,
  orePerComposite: 1,
  compositeSalePrice: 5000,
  pollutionPerComposite: 4,
  researchWorkforce: 12,
});
const LEDGER_KEYS = [
  "month",
  "openingComposite",
  "produced",
  "sold",
  "closingComposite",
  "oilUsed",
  "oreUsed",
  "revenue",
  "pollution",
  "sites",
];
const integer = (n, min = 0, max = MAX_MONEY) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const own = (o, k) => typeof k === "string" && Object.hasOwn(o, k);
const plain = (v) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(v));
const exact = (o, names) =>
  plain(o) &&
  Object.keys(o).length === names.length &&
  Object.keys(o).every((k) => names.includes(k));
const bad = () => {
  throw Error("Invalid CMD City future version 1 state.");
};
const active = (tile) => tile && tile.enabled !== false && !tile.fire;
const clamp = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const okay = (message) => ({ ok: true, message });
const fail = (message) => ({ ok: false, message });
function context(city) {
  if (
    !city ||
    !integer(city.width, 1, 1280) ||
    !integer(city.height, 1, 1280) ||
    city.width * city.height > 1280 ||
    !Array.isArray(city.tiles) ||
    city.tiles.length !== city.width * city.height ||
    !integer(city.month, 0, 1_000_000)
  )
    bad();
  return city.tiles.length;
}
function zeroLedger(month, composite = 0) {
  return {
    month,
    openingComposite: composite,
    produced: 0,
    sold: 0,
    closingComposite: composite,
    oilUsed: 0,
    oreUsed: 0,
    revenue: 0,
    pollution: 0,
    sites: [],
  };
}
function initialTower(tile, index) {
  if (!integer(tile.level, 1, 3) || !integer(tile.occupancy, 0, 1080)) bad();
  const floors = Math.max(
    Math.ceil(tile.occupancy / 90),
    [2, 5, 12][tile.level - 1],
  );
  return {
    tile: index,
    floors: Array.from({ length: floors }, () => ({
      use: "homes",
      enabled: true,
    })),
  };
}
const housingCapacity = (tower) =>
  tower.floors.reduce(
    (total, floor) => total + (floor.enabled && floor.use === "homes" ? 90 : 0),
    0,
  );
function shape(state, city, requireCurrentTowers = true) {
  const n = context(city);
  if (
    !exact(state, ["version", "lastMonth", "towers", "composite", "ledger"]) ||
    state.version !== 1 ||
    !integer(state.lastMonth, 0, 1_000_000) ||
    ![city.month, city.month + 1].includes(state.lastMonth) ||
    !integer(state.composite, 0, MAX_STOCK) ||
    !Array.isArray(state.towers) ||
    state.towers.length > n
  )
    bad();
  const seen = new Set();
  let previous = -1;
  for (const tower of state.towers) {
    if (
      !exact(tower, ["tile", "floors"]) ||
      !integer(tower.tile, 0, n - 1) ||
      tower.tile <= previous ||
      seen.has(tower.tile) ||
      !Array.isArray(tower.floors) ||
      tower.floors.length < 1 ||
      tower.floors.length > MAX_FLOORS
    )
      bad();
    previous = tower.tile;
    seen.add(tower.tile);
    let crowns = 0;
    for (const floor of tower.floors) {
      if (
        !exact(floor, ["use", "enabled"]) ||
        !own(FUTURE_FLOORS, floor.use) ||
        typeof floor.enabled !== "boolean"
      )
        bad();
      if (floor.use === "crown") crowns++;
    }
    if (crowns > 1 || (crowns === 1 && tower.floors.at(-1).use !== "crown"))
      bad();
    if (
      requireCurrentTowers &&
      (city.tiles[tower.tile].type !== "tower" ||
        !integer(city.tiles[tower.tile].occupancy, 0, housingCapacity(tower)))
    )
      bad();
  }
  if (
    requireCurrentTowers &&
    city.tiles.some((tile, index) => tile.type === "tower" && !seen.has(index))
  )
    bad();
  const l = state.ledger;
  if (
    !exact(l, LEDGER_KEYS) ||
    l.month !== state.lastMonth ||
    LEDGER_KEYS.some((k) => k !== "sites" && !integer(l[k])) ||
    l.produced > n * 20 ||
    l.sold > n * 20 ||
    l.openingComposite > MAX_STOCK ||
    l.closingComposite !== state.composite ||
    l.closingComposite > MAX_STOCK ||
    l.openingComposite + l.produced - l.sold !== l.closingComposite ||
    l.sold > l.openingComposite + l.produced ||
    l.oilUsed !== l.produced * 2 ||
    l.oreUsed !== l.produced ||
    l.revenue !== l.sold * 5000 ||
    l.pollution !== l.produced * 4
  )
    bad();
  if (!Array.isArray(l.sites) || l.sites.length > n) bad();
  let siteTotal = 0,
    priorSite = -1;
  for (const site of l.sites) {
    if (
      !exact(site, ["tile", "produced"]) ||
      !integer(site.tile, 0, n - 1) ||
      site.tile <= priorSite ||
      !integer(site.produced, 1, 20)
    )
      bad();
    priorSite = site.tile;
    siteTotal += site.produced;
  }
  if (siteTotal !== l.produced) bad();
  return true;
}
export function createFuture(city) {
  context(city);
  const towers = [];
  city.tiles.forEach((tile, index) => {
    if (tile.type === "tower") towers.push(initialTower(tile, index));
  });
  const state = {
    version: 1,
    lastMonth: city.month,
    towers,
    composite: 0,
    ledger: zeroLedger(city.month),
  };
  shape(state, city);
  return state;
}
export function validateFuture(state, city) {
  return shape(state, city);
}
/** Reconcile structure changes inside the caller's guarded transaction. */
export function syncFuture(city) {
  shape(city.future, city, false);
  const old = new Map(city.future.towers.map((t) => [t.tile, t]));
  const towers = [];
  city.tiles.forEach((tile, index) => {
    if (tile.type === "tower")
      towers.push(old.get(index) || initialTower(tile, index));
  });
  const next = { ...city.future, towers };
  shape(next, city);
  city.future = next;
  return next;
}
export function futureTowerCapacity(city, index) {
  const tower = city.future?.towers?.find((t) => t.tile === index);
  return tower ? housingCapacity(tower) : 0;
}
const access = (m, index) =>
  (m?.operationAccess || m?.access)?.[index] === true;
const filled = (m, index) =>
  integer(m?.jobFill?.[index]) ? m.jobFill[index] : 0;
const ratio = (m, name) => clamp(m?.utilities?.[name]?.ratio);
function towerReport(city, tower, m) {
  const tile = city.tiles[tower.tile],
    isActive = active(tile) && access(m, tower.tile);
  const enabled = tower.floors.filter((f) => f.enabled),
    jobs = enabled.reduce((n, f) => n + FUTURE_FLOORS[f.use].jobs, 0);
  const staffedJobs = isActive ? Math.min(jobs, filled(m, tower.tile)) : 0;
  const jobsByUse = Object.fromEntries(
    Object.keys(FUTURE_FLOORS).map((use) => [use, 0]),
  );
  for (const floor of enabled)
    jobsByUse[floor.use] += FUTURE_FLOORS[floor.use].jobs;
  const staffByUse = Object.fromEntries(
    Object.keys(FUTURE_FLOORS).map((use) => [use, 0]),
  );
  if (m.futureStaffByUse) {
    const reservation = m.futureStaffByUse[tower.tile];
    if (
      !exact(reservation, Object.keys(FUTURE_FLOORS)) ||
      Object.keys(FUTURE_FLOORS).some(
        (use) => !integer(reservation[use], 0, jobsByUse[use]),
      ) ||
      Object.values(reservation).reduce((a, b) => a + b, 0) !== staffedJobs
    ) {
      throw Error("Invalid actual tower staffing reservation.");
    }
    Object.assign(staffByUse, reservation);
  } else {
    let unassigned = staffedJobs;
    for (const use of [
      "power",
      "water",
      "school",
      "shops",
      "offices",
      "park",
      "crown",
    ]) {
      staffByUse[use] = Math.min(unassigned, jobsByUse[use]);
      unassigned -= staffByUse[use];
    }
  }
  const staffRatio = (use) =>
    jobsByUse[use] ? staffByUse[use] / jobsByUse[use] : 0;
  const criticalJobs = jobsByUse.power + jobsByUse.water;
  const powerSupply = isActive
    ? Math.floor(
        enabled.filter((f) => f.use === "power").length *
          400 *
          staffRatio("power"),
      )
    : 0;
  const powerDemand = Math.max(1, tile.occupancy + jobs * 2);
  const powerRatio = isActive
    ? m.globalUtilities
      ? (m.utilities?.power?.byTile?.[tower.tile] ?? ratio(m, "power"))
      : Math.max(ratio(m, "power"), Math.min(1, powerSupply / powerDemand))
    : 0;
  // The core allocates its shared finite groundwater once across all suppliers.
  // A supplied per-tower reservation is authoritative; exhausted reserves never
  // become free local water merely because the tower has a utility floor.
  const reservedWater = m.futureWaterAvailable?.[tower.tile];
  const waterAvailable = m.futureWaterAvailable
    ? integer(reservedWater, 0, MAX_STOCK)
      ? reservedWater
      : 0
    : integer(city.groundwater, 0, MAX_STOCK)
      ? city.groundwater
      : 0;
  const waterSupply = isActive
    ? Math.min(
        waterAvailable,
        Math.floor(
          enabled.filter((f) => f.use === "water").length *
            300 *
            staffRatio("water") *
            powerRatio,
        ),
      )
    : 0;
  const waterDemand = Math.max(1, tile.occupancy + jobs);
  const waterRatio = isActive
    ? m.globalUtilities
      ? (m.utilities?.water?.byTile?.[tower.tile] ?? ratio(m, "water"))
      : Math.max(ratio(m, "water"), Math.min(1, waterSupply / waterDemand))
    : 0;
  const operation = Math.min(powerRatio, waterRatio);
  const scale = (use) => (operation >= 0.9 ? staffRatio(use) * operation : 0);
  let population = tile.occupancy;
  const floors = tower.floors.map((f, index) => {
    const residents =
      f.enabled && f.use === "homes" ? Math.min(90, population) : 0;
    population -= residents;
    return {
      ...f,
      index,
      residents,
      operating:
        f.enabled &&
        isActive &&
        (f.use === "power"
          ? staffRatio("power") > 0
          : f.use === "water"
            ? staffRatio("water") > 0 && powerRatio > 0
            : operation >= 0.9 &&
              (FUTURE_FLOORS[f.use].jobs === 0 || staffRatio(f.use) > 0)),
    };
  });
  const count = (use) => enabled.filter((f) => f.use === use).length;
  const blockers = [];
  if (!active(tile)) blockers.push("Tower closed or damaged");
  if (!access(m, tower.tile)) blockers.push("No road access");
  if (powerRatio < 0.9) blockers.push("Insufficient power");
  if (waterRatio < 0.9) blockers.push("Insufficient water");
  if (staffedJobs < jobs) blockers.push("Unfilled tower jobs");
  if (!count("shops")) blockers.push("No internal shopping floor");
  if (!count("school")) blockers.push("No internal education floor");
  return {
    tile: tower.tile,
    floors,
    population: tile.occupancy,
    housingCapacity: housingCapacity(tower),
    jobs: isActive ? (operation >= 0.9 ? jobs : criticalJobs) : 0,
    physicalJobs: jobs,
    staffedJobs,
    criticalJobs,
    jobsByUse,
    staffByUse,
    shopBundles: Math.floor(count("shops") * 48 * scale("shops")),
    schoolPlaces: Math.floor(count("school") * 80 * scale("school")),
    powerSupply,
    waterSupply,
    powerRatio,
    waterRatio,
    parkBenefit: count("park") * 8 * scale("park"),
    crownBenefit: count("crown") * 12 * scale("crown"),
    upkeep: active(tile)
      ? enabled.reduce((n, f) => n + FUTURE_FLOORS[f.use].upkeep, 0)
      : 0,
    blockers,
  };
}
/** Snapshot only: never books household purchases, taxes, wages or growth. */
export function futureReport(city, m = {}) {
  validateFuture(city.future, city);
  const towers = city.future.towers.map((t) => towerReport(city, t, m));
  return {
    towers,
    composite: city.future.composite,
    ledger: {
      ...city.future.ledger,
      sites: city.future.ledger.sites.map((site) => ({ ...site })),
    },
    totalHousing: towers.reduce((n, t) => n + t.housingCapacity, 0),
    totalJobs: towers.reduce((n, t) => n + t.jobs, 0),
    upkeep: towers.reduce((n, t) => n + t.upkeep, 0),
  };
}
export function futureAction(city, action, m = {}) {
  validateFuture(city.future, city);
  if (!plain(action) || !integer(action.index, 0, city.tiles.length - 1))
    return fail("Choose a tower.");
  const tower = city.future.towers.find((t) => t.tile === action.index);
  if (!tower) return fail("Choose a tower.");
  if (city.future.lastMonth !== city.month)
    return fail("Finish the current month before editing floors.");
  const floors = tower.floors.map((f) => ({ ...f }));
  let cost = 0;
  if (action.type === "addFloor") {
    if (!city.research?.completed?.includes("vertical"))
      return fail("Complete Vertical construction research first.");
    if (!active(city.tiles[action.index]) || !access(m, action.index))
      return fail("Reopen and connect the tower first.");
    if (!own(FUTURE_FLOORS, action.use))
      return fail("Choose a valid floor use.");
    if (floors.length >= MAX_FLOORS)
      return fail("This tower has reached twelve floors.");
    if (action.use === "crown" && floors.some((f) => f.use === "crown"))
      return fail("A tower supports one crown.");
    const crownIndex = floors.findIndex((floor) => floor.use === "crown");
    const floor = { use: action.use, enabled: true };
    if (crownIndex >= 0) floors.splice(crownIndex, 0, floor);
    else floors.push(floor);
    cost = FUTURE_FLOORS[action.use].cost;
  } else if (
    action.type === "removeFloor" ||
    action.type === "setFloorEnabled"
  ) {
    if (!integer(action.floor, 0, floors.length - 1))
      return fail("Choose an existing floor.");
    if (action.type === "removeFloor") {
      if (floors.length === 1)
        return fail("Demolish the whole tower to remove its final floor.");
      floors.splice(action.floor, 1);
      cost = 10000;
    } else {
      if (typeof action.enabled !== "boolean")
        return fail("Choose an enabled state.");
      floors[action.floor].enabled = action.enabled;
    }
  } else return fail("Unknown future-city action.");
  if (city.tiles[action.index].occupancy > housingCapacity({ floors }))
    return fail("Occupied homes cannot be removed or closed.");
  if (
    !integer(city.cash, -MAX_MONEY, MAX_MONEY) ||
    (cost > 0 && city.cash < cost)
  )
    return fail("Insufficient treasury funds.");
  const towers = city.future.towers.map((t) =>
      t === tower ? { tile: t.tile, floors } : t,
    ),
    next = { ...city.future, towers };
  validateFuture(next, city);
  city.future = next;
  city.cash -= cost;
  return okay("Tower floors updated.");
}
export function canResearchFuture(city, m = {}) {
  context(city);
  const academy = city.tiles.some(
    (t, i) =>
      t.type === "academy" && active(t) && access(m, i) && filled(m, i) >= 12,
  );
  if (!academy)
    return fail("A connected institute needs twelve actual staffed positions.");
  let qualified = 0;
  for (let index = 0; index < (city.households?.homes || []).length; index++) {
    const home = city.households.homes[index];
    if (
      !active(city.tiles[index]) ||
      !access(m, index) ||
      !integer(m?.homeEmployment?.[index])
    )
      continue;
    if (!home || !integer(home.wealth, 0, 2) || home.wealth < 1) continue;
    if (integer(home.educated) && integer(home.adults))
      qualified += Math.min(
        home.educated,
        m.homeEmployment[index],
        home.adults,
      );
  }
  if (qualified < 12)
    return fail(
      "Research needs twelve educated employed middle- or high-wealth adults.",
    );
  if (ratio(m, "power") < 0.9 || ratio(m, "water") < 0.9)
    return fail("Research needs working power and water.");
  return okay("Future research workforce requirements met.");
}
/** Call once after current production and before municipal finance; core books
 * ledger.revenue once, then increments city.month. Duplicate calls are inert.
 */
export function advanceFuture(city, m = {}) {
  validateFuture(city.future, city);
  if (city.future.lastMonth === city.month + 1) return futureReport(city, m);
  if (
    city.month >= 1_000_000 ||
    !integer(city.inventory?.oil, 0, MAX_STOCK) ||
    !integer(city.inventory?.ore, 0, MAX_STOCK)
  )
    bad();
  let oil = city.inventory.oil,
    ore = city.inventory.ore,
    product = city.future.composite;
  const ledger = zeroLedger(city.month + 1, product);
  let salesCapacity = 0;
  for (let i = 0; i < city.tiles.length; i++) {
    const tile = city.tiles[i];
    if (tile.type !== "consortium" || !active(tile) || !access(m, i)) continue;
    if (!integer(tile.modules, 0, 3)) bad();
    const staffing = Math.min(1, filled(m, i) / 12),
      utilities = Math.min(ratio(m, "power"), ratio(m, "water"));
    const capacity = Math.floor(
      8 * (1 + tile.modules * 0.5) * staffing * utilities,
    );
    salesCapacity += capacity;
    const produced = Math.min(
      capacity,
      Math.floor(oil / 2),
      ore,
      MAX_STOCK - product,
    );
    oil -= produced * 2;
    ore -= produced;
    product += produced;
    ledger.produced += produced;
    if (produced) ledger.sites.push({ tile: i, produced });
  }
  let demand = 0;
  for (let i = 0; i < city.tiles.length; i++) {
    const tile = city.tiles[i];
    if (
      ["commercial", "industrial"].includes(tile.type) &&
      active(tile) &&
      access(m, i)
    )
      demand += Math.floor(
        Math.min(filled(m, i), integer(tile.occupancy) ? tile.occupancy : 0) /
          4,
      );
  }
  ledger.sold = Math.min(product, demand, salesCapacity);
  product -= ledger.sold;
  ledger.closingComposite = product;
  ledger.oilUsed = ledger.produced * 2;
  ledger.oreUsed = ledger.produced;
  ledger.revenue = ledger.sold * 5000;
  ledger.pollution = ledger.produced * 4;
  const next = {
    ...city.future,
    lastMonth: city.month + 1,
    composite: product,
    ledger,
  };
  validateFuture(next, city);
  city.inventory.oil = oil;
  city.inventory.ore = ore;
  city.future = next;
  return futureReport(city, m);
}
// Wire format only: omit canonical default towers and encode at most 12 floor
// uses/flags per exception. Runtime objects remain complete, ordinary JSON data.
const FLOOR_CODES = "HSOPWEKC";
const FLOOR_USES = [
  "homes",
  "shops",
  "offices",
  "power",
  "water",
  "school",
  "park",
  "crown",
];
const encodeFloors = (floors) =>
  floors
    .map((f) => {
      const code = FLOOR_CODES[FLOOR_USES.indexOf(f.use)];
      return f.enabled ? code : code.toLowerCase();
    })
    .join("");
export function encodeFuture(city) {
  validateFuture(city.future, city);
  const towers = [];
  for (const t of city.future.towers) {
    const code = encodeFloors(t.floors);
    if (code !== encodeFloors(initialTower(city.tiles[t.tile], t.tile).floors))
      towers.push([t.tile, code]);
  }
  return { ...city.future, encoding: "floors-v1", towers };
}
export function decodeFuture(city) {
  const encoded = city.future;
  if (!encoded || !Object.hasOwn(encoded, "encoding")) return encoded;
  if (
    !exact(encoded, [
      "version",
      "lastMonth",
      "towers",
      "composite",
      "ledger",
      "encoding",
    ]) ||
    encoded.encoding !== "floors-v1" ||
    !Array.isArray(encoded.towers) ||
    encoded.towers.length > context(city)
  )
    bad();
  const complete = createFuture(city),
    byTile = new Map(complete.towers.map((t) => [t.tile, t]));
  let previous = -1;
  for (const pair of encoded.towers) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      !integer(pair[0], 0, city.tiles.length - 1) ||
      pair[0] <= previous ||
      !byTile.has(pair[0]) ||
      typeof pair[1] !== "string" ||
      pair[1].length < 1 ||
      pair[1].length > 12 ||
      !/^[HSOPWEKChsopwekc]+$/.test(pair[1])
    )
      bad();
    previous = pair[0];
    byTile.get(pair[0]).floors = Array.from(pair[1], (code) => ({
      use: FLOOR_USES[FLOOR_CODES.indexOf(code.toUpperCase())],
      enabled: code === code.toUpperCase(),
    }));
  }
  const { encoding, ...state } = encoded;
  const decoded = { ...state, towers: complete.towers };
  validateFuture(decoded, city);
  return decoded;
}
