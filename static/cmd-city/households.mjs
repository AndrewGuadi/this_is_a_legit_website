import { TOOLS } from "./content.mjs";

/** Original aggregate household economy. No DOM, clock, network, RNG or individual aging. */
const NMAX = 1280,
  MONTHMAX = 1_000_000,
  WALLETMAX = 1_000_000_000,
  TOTALMAX = 2_000_000_000_000_000;
const SECTORS = ["residential", "commercial", "industrial"];
const HOME_KEYS = [
  "wealth",
  "children",
  "adults",
  "seniors",
  "educated",
  "cash",
  "arrears",
  "satisfaction",
  "unmet",
  "goodMonths",
  "badMonths",
  "study",
  "trainees",
  "employed",
  "shoppingWanted",
  "shoppingBought",
  "enrolledChildren",
  "enrolledAdults",
  "wages",
  "taxes",
  "spending",
];
const LEDGER_KEYS = [
  "month",
  "openingCash",
  "immigration",
  "emigration",
  "wages",
  "cappedWages",
  "residentialTaxes",
  "spending",
  "closingCash",
  "openingArrears",
  "taxDue",
  "writtenOffTaxes",
  "closingArrears",
  "commercialTaxes",
  "industrialTaxes",
  "shoppingWanted",
  "shoppingBought",
  "enrolledChildren",
  "enrolledAdults",
];
export const HOUSEHOLD_RULES = Object.freeze({
  startingCashPerResident: 10000,
  wages: Object.freeze([3200, 4800, 8000]),
  educatedWageBonus: 1000,
  shopPrices: Object.freeze([700, 1000, 1500]),
  shopBundlesPerWorker: 4,
  schoolSlots: 60,
  universitySlots: 40,
  schoolStaff: 8,
  universityStaff: 12,
  studyMonths: 12,
  promotionMonths: 6,
  demotionMonths: 3,
  walletMaximum: WALLETMAX,
});
const integer = (n, a, b) => Number.isSafeInteger(n) && n >= a && n <= b;
const own = (o, k) => typeof k === "string" && Object.hasOwn(o, k);
const plain = (v) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(v));
const isHome = (t) =>
  t && ["residential", "tower"].includes(t.type) && t.occupancy > 0;
const pop = (h) => h.children + h.adults + h.seniors;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const fail = (message) => ({ ok: false, message }),
  ok = (message) => ({ ok: true, message });
const bad = () => {
  throw Error("Invalid CMD City household version 1 state.");
};
function keys(o, names) {
  if (
    !plain(o) ||
    Object.keys(o).length !== names.length ||
    Object.keys(o).some((k) => !names.includes(k))
  )
    bad();
}
function context(city) {
  if (
    !city ||
    !integer(city.width, 1, NMAX) ||
    !integer(city.height, 1, NMAX) ||
    !Array.isArray(city.tiles) ||
    city.tiles.length !== city.width * city.height ||
    city.tiles.length > NMAX ||
    !integer(city.month, 0, MONTHMAX)
  )
    bad();
  for (const t of city.tiles)
    if (!t || !integer(t.occupancy, 0, 1000000) || typeof t.type !== "string")
      bad();
}
function demographics(count, existing) {
  if (!existing || pop(existing) <= 0)
    return {
      children: Math.floor(count * 0.25),
      adults: Math.floor(count * 0.6),
      seniors: count - Math.floor(count * 0.25) - Math.floor(count * 0.6),
    };
  const total = pop(existing),
    names = ["children", "adults", "seniors"],
    out = {},
    remainders = [];
  let assigned = 0;
  for (const name of names) {
    const scaled = (existing[name] * count) / total;
    out[name] = Math.floor(scaled);
    assigned += out[name];
    remainders.push({ name, fraction: scaled - out[name] });
  }
  remainders.sort(
    (a, b) =>
      b.fraction - a.fraction || names.indexOf(a.name) - names.indexOf(b.name),
  );
  for (let i = 0; assigned < count; i++, assigned++)
    out[remainders[i % 3].name]++;
  return out;
}
function freshHome(count) {
  return {
    wealth: 0,
    ...demographics(count),
    educated: 0,
    cash: Math.min(WALLETMAX, count * 10000),
    arrears: 0,
    satisfaction: 60,
    unmet: 0,
    goodMonths: 0,
    badMonths: 0,
    study: 0,
    trainees: 0,
    employed: 0,
    shoppingWanted: 0,
    shoppingBought: 0,
    enrolledChildren: 0,
    enrolledAdults: 0,
    wages: 0,
    taxes: 0,
    spending: 0,
  };
}
function emptyLedger(month) {
  return Object.fromEntries(
    LEDGER_KEYS.map((k) => [k, k === "month" ? month : 0]),
  );
}
function totals(homes) {
  return homes.reduce(
    (a, h) => {
      if (h) {
        a.cash += h.cash;
        a.arrears += h.arrears;
      }
      return a;
    },
    { cash: 0, arrears: 0 },
  );
}
export function createHouseholds(city, { month = city.month } = {}) {
  context(city);
  if (!integer(month, 0, MONTHMAX)) bad();
  const homes = city.tiles.map((t) =>
      isHome(t) ? freshHome(t.occupancy) : null,
    ),
    sum = totals(homes),
    ledger = emptyLedger(month);
  ledger.immigration = sum.cash;
  ledger.closingCash = sum.cash;
  return {
    version: 1,
    lastMonth: month,
    homes,
    shoppingLoad: Array(city.tiles.length).fill(0),
    wealthTaxes: Object.fromEntries(SECTORS.map((s) => [s, [9, 9, 9]])),
    pending: { immigration: 0, emigration: 0, writtenOffTaxes: 0 },
    ledger,
  };
}
export function householdWorkers(city, index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= city.tiles.length ||
    !isHome(city.tiles[index])
  )
    return 0;
  const h = city.households?.homes?.[index],
    count = city.tiles[index].occupancy;
  return h &&
    integer(h.children, 0, 1000000) &&
    integer(h.adults, 0, 1000000) &&
    integer(h.seniors, 0, 1000000) &&
    pop(h) > 0
    ? demographics(count, h).adults
    : demographics(count).adults;
}
export function validateHouseholds(value, city, { stable = true } = {}) {
  context(city);
  if (typeof stable !== "boolean") bad();
  keys(value, [
    "version",
    "lastMonth",
    "homes",
    "shoppingLoad",
    "wealthTaxes",
    "pending",
    "ledger",
  ]);
  if (
    !Array.isArray(value.shoppingLoad) ||
    value.shoppingLoad.length !== city.tiles.length ||
    value.shoppingLoad.some((n) => !integer(n, 0, 1_000_000))
  )
    bad();
  if (
    value.version !== 1 ||
    !integer(
      value.lastMonth,
      city.month,
      Math.min(MONTHMAX, city.month + (stable ? 0 : 1)),
    ) ||
    !Array.isArray(value.homes) ||
    value.homes.length !== city.tiles.length
  )
    bad();
  keys(value.wealthTaxes, SECTORS);
  for (const rates of Object.values(value.wealthTaxes))
    if (
      !Array.isArray(rates) ||
      rates.length !== 3 ||
      rates.some((r) => !integer(r, 0, 20))
    )
      bad();
  keys(value.pending, ["immigration", "emigration", "writtenOffTaxes"]);
  for (const n of Object.values(value.pending))
    if (!integer(n, 0, TOTALMAX)) bad();
  keys(value.ledger, LEDGER_KEYS);
  for (const [k, n] of Object.entries(value.ledger))
    if (!integer(n, 0, k === "month" ? MONTHMAX : TOTALMAX)) bad();
  const l = value.ledger;
  if (
    l.month !== value.lastMonth ||
    l.openingCash +
      l.immigration -
      l.emigration +
      l.wages -
      l.residentialTaxes -
      l.spending !==
      l.closingCash ||
    l.openingArrears + l.taxDue - l.residentialTaxes - l.writtenOffTaxes !==
      l.closingArrears ||
    l.shoppingBought > l.shoppingWanted
  )
    bad();
  for (let i = 0; i < value.homes.length; i++) {
    const h = value.homes[i],
      tile = city.tiles[i];
    if (h === null) {
      if (stable && isHome(tile)) bad();
      continue;
    }
    keys(h, HOME_KEYS);
    for (const name of [
      "children",
      "adults",
      "seniors",
      "educated",
      "trainees",
      "employed",
      "enrolledChildren",
      "enrolledAdults",
      "shoppingWanted",
      "shoppingBought",
      "unmet",
    ])
      if (!integer(h[name], 0, 1000000)) bad();
    if (
      !integer(h.wealth, 0, 2) ||
      !integer(h.cash, 0, WALLETMAX) ||
      !integer(h.arrears, 0, WALLETMAX) ||
      !integer(h.satisfaction, 0, 100) ||
      !integer(h.goodMonths, 0, 5) ||
      !integer(h.badMonths, 0, 2) ||
      !integer(h.study, 0, 11) ||
      !integer(h.wages, 0, WALLETMAX) ||
      !integer(h.taxes, 0, WALLETMAX) ||
      !integer(h.spending, 0, WALLETMAX) ||
      pop(h) <= 0 ||
      h.educated + h.trainees > h.adults ||
      h.employed > h.adults ||
      h.enrolledChildren > h.children ||
      h.enrolledAdults > h.adults ||
      h.shoppingBought > h.shoppingWanted ||
      h.unmet !== h.shoppingWanted - h.shoppingBought ||
      (h.trainees === 0 && h.study !== 0) ||
      (h.trainees > 0 && h.study === 0)
    )
      bad();
    if (stable && (!isHome(tile) || pop(h) !== tile.occupancy)) bad();
  }
  const sum = totals(value.homes);
  if (
    sum.cash !==
      l.closingCash + value.pending.immigration - value.pending.emigration ||
    sum.arrears !== l.closingArrears - value.pending.writtenOffTaxes
  )
    bad();
  return true;
}
function reconcileInto(state, city) {
  for (let i = 0; i < state.homes.length; i++) {
    const tile = city.tiles[i],
      h = state.homes[i];
    if (!isHome(tile)) {
      if (h) {
        state.pending.emigration += h.cash;
        state.pending.writtenOffTaxes += h.arrears;
        state.homes[i] = null;
      }
      continue;
    }
    const count = tile.occupancy;
    if (!h) {
      const fresh = freshHome(count);
      state.homes[i] = fresh;
      state.pending.immigration += fresh.cash;
      continue;
    }
    const old = pop(h);
    if (old === count) continue;
    const groups = demographics(count, h),
      oldAdults = h.adults;
    if (count < old) {
      const removedCash = h.cash - Math.floor((h.cash * count) / old),
        removedDebt = h.arrears - Math.floor((h.arrears * count) / old);
      h.cash -= removedCash;
      h.arrears -= removedDebt;
      state.pending.emigration += removedCash;
      state.pending.writtenOffTaxes += removedDebt;
      h.educated = oldAdults
        ? Math.floor((h.educated * groups.adults) / oldAdults)
        : 0;
    } else {
      const added = Math.min(WALLETMAX - h.cash, (count - old) * 10000);
      h.cash += added;
      state.pending.immigration += added;
    }
    Object.assign(h, groups);
    h.educated = Math.min(h.educated, h.adults);
    h.trainees = Math.min(h.trainees, h.adults - h.educated);
    if (!h.trainees) h.study = 0;
    h.employed = Math.min(h.employed, h.adults);
    h.enrolledAdults = Math.min(h.enrolledAdults, h.adults);
    h.enrolledChildren = Math.min(h.enrolledChildren, h.children);
  }
}
export function reconcileHouseholds(city) {
  validateHouseholds(city.households, city, { stable: false });
  reconcileInto(city.households, city);
  return city.households;
}
// The strict schema has only scalar home/ledger records and these explicit arrays.
// Copy exactly those fields instead of invoking the general structured-clone engine per measure.
function cloneState(source) {
  return {
    ...source,
    homes: source.homes.map((h) => (h ? { ...h } : null)),
    shoppingLoad: source.shoppingLoad.slice(),
    wealthTaxes: Object.fromEntries(
      SECTORS.map((sector) => [sector, source.wealthTaxes[sector].slice()]),
    ),
    pending: { ...source.pending },
    ledger: { ...source.ledger },
  };
}
function virtualState(city) {
  validateHouseholds(city.households, city, { stable: false });
  const state = cloneState(city.households);
  reconcileInto(state, city);
  return state;
}
function observation(city, metrics, state) {
  if (!plain(metrics) || !plain(metrics.utilities)) bad();
  for (const name of ["access", "landValue", "jobFill", "homeEmployment"])
    if (
      !Array.isArray(metrics[name]) ||
      metrics[name].length !== city.tiles.length
    )
      bad();
  if (
    metrics.roadLoad !== undefined &&
    (!Array.isArray(metrics.roadLoad) ||
      metrics.roadLoad.length !== city.tiles.length ||
      metrics.roadLoad.some((v) => !Number.isFinite(v) || v < 0))
  )
    bad();
  if (
    metrics.operationAccess !== undefined &&
    (!Array.isArray(metrics.operationAccess) ||
      metrics.operationAccess.length !== city.tiles.length ||
      metrics.operationAccess.some((v) => typeof v !== "boolean"))
  )
    bad();
  for (let i = 0; i < city.tiles.length; i++)
    if (
      typeof metrics.access[i] !== "boolean" ||
      !Number.isFinite(metrics.landValue[i]) ||
      metrics.landValue[i] < 0 ||
      metrics.landValue[i] > 100 ||
      !integer(metrics.jobFill[i], 0, 1000000) ||
      !integer(metrics.homeEmployment[i], 0, state.homes[i]?.adults ?? 0)
    )
      bad();
  for (const name of ["power", "water", "sewage", "waste"]) {
    const u = metrics.utilities[name];
    if (
      !plain(u) ||
      !Number.isFinite(u.supply) ||
      u.supply < 0 ||
      !Number.isFinite(u.demand) ||
      u.demand < 0 ||
      !Number.isFinite(u.ratio) ||
      u.ratio < 0 ||
      u.ratio > 1
    )
      bad();
  }
}
const active = (t) => t.enabled !== false && t.fire === 0;
function supplied(metrics) {
  return ["power", "water"].every(
    (k) => metrics.utilities[k].supply > 0 && metrics.utilities[k].ratio >= 0.9,
  );
}
function operating(city, metrics, i) {
  return (
    active(city.tiles[i]) &&
    metrics.access[i] === true &&
    (metrics.operationAccess?.[i] ?? true) &&
    supplied(metrics)
  );
}
function businessWealth(value) {
  return value >= 75 ? 2 : value >= 45 ? 1 : 0;
}
function wage(h, employment) {
  return (
    employment * HOUSEHOLD_RULES.wages[h.wealth] +
    Math.min(employment, h.educated) * 1000
  );
}
function businessTaxes(state, city, metrics) {
  const out = { commercial: 0, industrial: 0 };
  for (let i = 0; i < city.tiles.length; i++) {
    const t = city.tiles[i];
    if (!own(out, t.type) || !operating(city, metrics, i)) continue;
    const taxable = Math.floor(
      t.occupancy *
        Math.min(metrics.utilities.power.ratio, metrics.utilities.water.ratio),
    );
    out[t.type] += Math.floor(
      (taxable *
        (t.type === "commercial" ? 8000 : 6000) *
        state.wealthTaxes[t.type][businessWealth(metrics.landValue[i])]) /
        100,
    );
  }
  return out;
}
function forecast(state, city, metrics) {
  let residential = 0;
  for (let i = 0; i < state.homes.length; i++) {
    const h = state.homes[i];
    if (!h || !metrics.access[i] || !active(city.tiles[i])) continue;
    const available = Math.min(
      WALLETMAX,
      h.cash + wage(h, metrics.homeEmployment[i]),
    );
    const due = Math.floor(
      (pop(h) * 2400 * state.wealthTaxes.residential[h.wealth]) / 100,
    );
    residential += Math.min(available, h.arrears + due);
  }
  const { commercial, industrial } = businessTaxes(state, city, metrics);
  return {
    residential,
    commercial,
    industrial,
    total: residential + commercial + industrial,
  };
}
export function taxRevenue(city, metrics) {
  const state = virtualState(city);
  observation(city, metrics, state);
  return forecast(state, city, metrics);
}
function effective(state, city, sector, metrics) {
  let weighted = 0,
    units = 0;
  for (let i = 0; i < city.tiles.length; i++) {
    const tile = city.tiles[i];
    if (sector === "residential") {
      const h = state.homes[i];
      if (h) {
        weighted += pop(h) * state.wealthTaxes.residential[h.wealth];
        units += pop(h);
      }
    } else if (tile.type === sector && tile.occupancy > 0) {
      weighted +=
        tile.occupancy *
        state.wealthTaxes[sector][businessWealth(metrics.landValue[i])];
      units += tile.occupancy;
    }
  }
  return units
    ? weighted / units
    : state.wealthTaxes[sector].reduce((n, r) => n + r, 0) / 3;
}
export function effectiveTaxRate(city, sector, metrics) {
  if (typeof sector !== "string" || !SECTORS.includes(sector)) bad();
  const state = virtualState(city);
  observation(city, metrics, state);
  return effective(state, city, sector, metrics);
}
function reportWith(state, city, metrics) {
  const classes = [0, 1, 2].map((wealth) => ({
    wealth,
    label: ["Low wealth", "Middle wealth", "High wealth"][wealth],
    people: 0,
    homes: 0,
    cash: 0,
  }));
  const demographics = {
    children: 0,
    adults: 0,
    seniors: 0,
    educatedAdults: 0,
  };
  let satisfaction = 0,
    population = 0;
  const homes = state.homes.map((h, i) => {
    if (!h) return null;
    const count = pop(h);
    population += count;
    satisfaction += h.satisfaction * count;
    classes[h.wealth].people += count;
    classes[h.wealth].homes++;
    classes[h.wealth].cash += h.cash;
    demographics.children += h.children;
    demographics.adults += h.adults;
    demographics.seniors += h.seniors;
    demographics.educatedAdults += h.educated;
    return {
      ...h,
      population: count,
      taxRate: state.wealthTaxes.residential[h.wealth],
      employmentRate: h.adults ? h.employed / h.adults : 0,
    };
  });
  const sum = totals(state.homes),
    l = state.ledger,
    booked = {
      residential: l.residentialTaxes,
      commercial: l.commercialTaxes,
      industrial: l.industrialTaxes,
      total: l.residentialTaxes + l.commercialTaxes + l.industrialTaxes,
    };
  return {
    population,
    classes,
    demographics,
    budgets: { ...l, currentCash: sum.cash, arrears: sum.arrears },
    shopping: {
      wanted: l.shoppingWanted,
      bought: l.shoppingBought,
      unmet: l.shoppingWanted - l.shoppingBought,
      spent: l.spending,
      load: state.shoppingLoad.slice(),
    },
    education: {
      children: demographics.children,
      enrolledChildren: l.enrolledChildren,
      adults: demographics.adults,
      educatedAdults: demographics.educatedAdults,
      enrolledAdults: l.enrolledAdults,
      trainees: state.homes.reduce((n, h) => n + (h?.trainees ?? 0), 0),
    },
    satisfaction: population ? Math.round(satisfaction / population) : 0,
    taxes: {
      rates: Object.fromEntries(
        SECTORS.map((sector) => [sector, state.wealthTaxes[sector].slice()]),
      ),
      effective: Object.fromEntries(
        SECTORS.map((s) => [s, effective(state, city, s, metrics)]),
      ),
      forecast: forecast(state, city, metrics),
      booked,
      month: l.month,
    },
    homes,
  };
}
export function householdReport(city, metrics) {
  const state = virtualState(city);
  observation(city, metrics, state);
  return reportWith(state, city, metrics);
}
export function setSectorTaxes(city, sector, value) {
  if (
    typeof sector !== "string" ||
    !SECTORS.includes(sector) ||
    !integer(value, 0, 20)
  )
    return fail("Choose a sector and an integer tax rate from 0–20%.");
  try {
    validateHouseholds(city.households, city);
  } catch {
    return fail("Household state is invalid or the month is still processing.");
  }
  city.households.wealthTaxes[sector] = [value, value, value];
  return ok("All three wealth-class rates were updated.");
}
export function householdAction(city, action, metrics) {
  if (
    !plain(action) ||
    Object.keys(action).length !== 4 ||
    !own(action, "type") ||
    action.type !== "classTax" ||
    !own(action, "sector") ||
    !own(action, "wealth") ||
    !own(action, "value") ||
    typeof action.sector !== "string" ||
    !SECTORS.includes(action.sector) ||
    !integer(action.wealth, 0, 2) ||
    !integer(action.value, 0, 20)
  )
    return fail(
      "Choose a sector, numeric wealth class 0–2 and integer tax rate 0–20%.",
    );
  try {
    validateHouseholds(city.households, city);
    observation(city, metrics, city.households);
  } catch {
    return fail("Household state or observation is invalid.");
  }
  if (!city.civic?.departments?.includes("finance"))
    return fail("Install Finance before setting wealth-class tax rates.");
  const gateway = 16 * city.width;
  if (
    !["road", "avenue"].includes(city.tiles[gateway]?.type) ||
    metrics.access[gateway] !== true ||
    !city.tiles.some(
      (tile, i) => tile.type === "townHall" && operating(city, metrics, i),
    )
  )
    return fail("An open supplied gateway-connected Town Hall is required.");
  city.households.wealthTaxes[action.sector][action.wealth] = action.value;
  return ok(
    "This wealth-class rate applies to subsequent household tax collections.",
  );
}
function neighbors(i, city) {
  const w = city.width,
    n = city.tiles.length;
  return [
    i % w ? i - 1 : -1,
    i % w < w - 1 ? i + 1 : -1,
    i >= w ? i - w : -1,
    i < n - w ? i + w : -1,
  ].filter((j) => j >= 0);
}
// Retain topology only: no household balances, staff, supplies, prices or capacity decisions.
// Per city: at most 256 BFS pairs of Int16Array(N), bounded to 1.25 MiB at N=1280.
// Actual path arrays are materialized only for the at-most-128 returned trip samples.
const networkCache = new WeakMap();
const MAX_ROUTES = 256;
function roadNetwork(city) {
  const n = city.tiles.length,
    signature =
      `${city.width}:${city.height}:` +
      city.tiles
        .map((t) =>
          ["road", "avenue", "bridge"].includes(t.type) && active(t)
            ? "1"
            : "0",
        )
        .join("");
  const cached = networkCache.get(city);
  if (cached?.signature === signature) return cached.network;
  const adjacency = city.tiles.map((_, i) => neighbors(i, city)),
    isRoad = city.tiles.map(
      (t) => ["road", "avenue", "bridge"].includes(t.type) && active(t),
    ),
    connected = Array(n).fill(false),
    queue = [];
  const gateway = 16 * city.width;
  if (gateway < n && isRoad[gateway]) {
    connected[gateway] = true;
    queue.push(gateway);
  }
  for (let k = 0; k < queue.length; k++)
    for (const j of adjacency[queue[k]])
      if (isRoad[j] && !connected[j]) {
        connected[j] = true;
        queue.push(j);
      }
  const network = {
    connected,
    frontages: adjacency.map((js) => js.filter((j) => connected[j])),
    roadNeighbors: adjacency.map((js) => js.filter((j) => connected[j])),
    routes: new Map(),
    queue: new Int16Array(n),
  };
  networkCache.set(city, { signature, network });
  return network;
}
function routesFrom(city, network, from) {
  const roots = network.frontages[from],
    key = roots.join(","),
    cached = network.routes.get(key);
  if (cached) {
    network.routes.delete(key);
    network.routes.set(key, cached);
    return cached;
  }
  const n = city.tiles.length,
    dist = new Int16Array(n).fill(-1),
    prev = new Int16Array(n).fill(-1),
    queue = network.queue;
  let head = 0,
    tail = 0;
  for (const j of roots) {
    dist[j] = 0;
    queue[tail++] = j;
  }
  while (head < tail) {
    const current = queue[head++];
    for (const j of network.roadNeighbors[current])
      if (dist[j] < 0) {
        dist[j] = dist[current] + 1;
        prev[j] = current;
        queue[tail++] = j;
      }
  }
  const endpoint = (to) => {
    let best = -1,
      bestDistance = Infinity;
    for (const j of network.frontages[to])
      if (
        dist[j] >= 0 &&
        (dist[j] < bestDistance || (dist[j] === bestDistance && j < best))
      ) {
        best = j;
        bestDistance = dist[j];
      }
    return best;
  };
  const route = {
    distance(to) {
      const end = endpoint(to);
      return end < 0 ? Infinity : dist[end] + 1;
    },
    reachable(to) {
      return endpoint(to) >= 0;
    },
    fits(to, remaining) {
      const end = endpoint(to);
      if (end < 0) return false;
      for (let j = end; j !== -1; j = prev[j])
        if (remaining[j] < 1 - 1e-9) return false;
      return true;
    },
    walk(to, visit) {
      for (let j = endpoint(to); j !== -1; j = prev[j]) visit(j);
    },
    path(to) {
      const path = [];
      for (let j = endpoint(to); j !== -1; j = prev[j]) path.push(j);
      return path.reverse();
    },
  };
  network.routes.set(key, route);
  if (network.routes.size > MAX_ROUTES)
    network.routes.delete(network.routes.keys().next().value);
  return route;
}
function schooling(city, state, metrics, homeRoutes, order) {
  const funds = clamp(city.funding?.school ?? 100, 0, 150) / 100,
    schools = [],
    universities = [];
  for (let i = 0; i < city.tiles.length; i++) {
    const tile = city.tiles[i];
    if (
      !["school", "university"].includes(tile.type) ||
      !operating(city, metrics, i)
    )
      continue;
    const university = tile.type === "university",
      staff = university ? 12 : 8,
      capacity = Math.floor(
        (university ? 40 : 60) *
          (1 + (tile.modules ?? 0) * 0.5) *
          funds *
          Math.min(1, metrics.jobFill[i] / staff),
      );
    (university ? universities : schools).push({ i, left: capacity });
  }
  const options = (i, facilities) =>
    facilities.filter((s) => s.left > 0 && homeRoutes.get(i).reachable(s.i));
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const i of order) {
      const h = state.homes[i];
      if (h.enrolledChildren >= h.children) continue;
      const school = options(i, schools)[0];
      if (!school) continue;
      h.enrolledChildren++;
      school.left--;
      remaining = true;
    }
  }
  // Preserve the actual admitted cohort. New adults never inherit its prior study months.
  const adultOrder = [
    ...order.filter((i) => state.homes[i].trainees > 0),
    ...order.filter((i) => state.homes[i].trainees === 0),
  ];
  for (const i of adultOrder) {
    const h = state.homes[i],
      possible = h.adults - h.educated;
    if (!possible) continue;
    const facilities = options(i, universities),
      available = facilities.reduce((n, s) => n + s.left, 0);
    let learners = h.trainees;
    if (learners) {
      if (available < learners) continue;
    } else {
      learners = Math.min(possible, available);
      if (!learners) continue;
      h.trainees = learners;
    }
    let unassigned = learners;
    for (const school of facilities) {
      const n = Math.min(unassigned, school.left);
      school.left -= n;
      unassigned -= n;
      if (!unassigned) break;
    }
    h.enrolledAdults = learners;
    h.study++;
    if (h.study >= 12) {
      h.educated += learners;
      h.trainees = 0;
      h.study = 0;
    }
  }
}
function updateWealth(h, metrics, i) {
  const count = pop(h),
    employment = h.adults ? h.employed / h.adults : 1,
    shopping = h.shoppingWanted ? h.shoppingBought / h.shoppingWanted : 1,
    education = h.adults ? h.educated / h.adults : 1,
    children = h.children ? h.enrolledChildren / h.children : 1,
    utilities = Math.min(
      metrics.utilities.power.ratio,
      metrics.utilities.water.ratio,
      metrics.utilities.sewage.ratio,
      metrics.utilities.waste.ratio,
    ),
    land = metrics.landValue[i];
  h.satisfaction = clamp(
    Math.round(
      15 +
        employment * 25 +
        shopping * 25 +
        utilities * 20 +
        education * 10 +
        land * 0.05 -
        Math.min(20, h.arrears / Math.max(1, count) / 1000),
    ),
    0,
    100,
  );
  const next = h.wealth + 1,
    good =
      h.wealth < 2 &&
      employment >= (next === 1 ? 0.5 : 0.8) &&
      shopping >= (next === 1 ? 0.75 : 1) &&
      education >= (next === 1 ? 0.25 : 0.6) &&
      children >= 0.5 &&
      utilities >= 0.95 &&
      land >= (next === 1 ? 55 : 80) &&
      h.cash / count >= (next === 1 ? 40000 : 100000) &&
      h.satisfaction >= 70;
  const poor =
    employment < 0.5 ||
    shopping < 0.5 ||
    utilities < 0.7 ||
    (h.cash / count < 5000 && h.arrears > 0);
  h.goodMonths = good ? h.goodMonths + 1 : 0;
  h.badMonths = poor ? h.badMonths + 1 : 0;
  if (h.goodMonths >= 6) {
    h.wealth++;
    h.goodMonths = 0;
    h.badMonths = 0;
  } else if (h.badMonths >= 3) {
    if (h.wealth > 0) h.wealth--;
    h.badMonths = 0;
    h.goodMonths = 0;
  }
}
export function advanceHouseholds(city, metrics) {
  const state = virtualState(city);
  observation(city, metrics, state);
  if (city.households.lastMonth === city.month + 1) {
    const report = reportWith(state, city, metrics);
    return {
      report,
      bookedTaxes: report.taxes.booked,
      shoppingLoad: state.shoppingLoad.slice(),
      trips: [],
      tripsTruncated: false,
    };
  }
  if (city.month >= MONTHMAX || state.lastMonth !== city.month)
    throw Error("Households require the next prefinance city month.");
  if (!city.inventory || !integer(city.inventory.goods, 0, 1000000)) bad();
  const target = city.month + 1,
    ledger = emptyLedger(target),
    previous = state.ledger;
  ledger.openingCash = previous.closingCash;
  ledger.immigration = state.pending.immigration;
  ledger.emigration = state.pending.emigration;
  ledger.openingArrears = previous.closingArrears;
  ledger.writtenOffTaxes = state.pending.writtenOffTaxes;
  const homeIndices = [];
  for (let i = 0; i < state.homes.length; i++) {
    const h = state.homes[i];
    if (!h) continue;
    homeIndices.push(i);
    h.employed = metrics.homeEmployment[i];
    h.wages = 0;
    h.taxes = 0;
    h.spending = 0;
    h.shoppingWanted = Math.ceil(pop(h) / 4);
    h.shoppingBought = 0;
    h.enrolledChildren = 0;
    h.enrolledAdults = 0;
    const wanted = wage(h, h.employed),
      paid = Math.min(wanted, WALLETMAX - h.cash);
    h.cash += paid;
    h.wages = paid;
    ledger.wages += paid;
    ledger.cappedWages += wanted - paid;
    const due =
      metrics.access[i] && active(city.tiles[i])
        ? Math.floor(
            (pop(h) * 2400 * state.wealthTaxes.residential[h.wealth]) / 100,
          )
        : 0;
    const owed = h.arrears + due,
      tax = Math.min(h.cash, owed);
    h.cash -= tax;
    h.taxes = tax;
    ledger.residentialTaxes += tax;
    ledger.taxDue += due;
    h.arrears = Math.min(WALLETMAX, owed - tax);
    ledger.writtenOffTaxes += Math.max(0, owed - tax - WALLETMAX);
  }
  const order = homeIndices.length
    ? [
        ...homeIndices.slice(target % homeIndices.length),
        ...homeIndices.slice(0, target % homeIndices.length),
      ]
    : [];
  const network = roadNetwork(city),
    routeMemo = new Map(),
    homeRoutes = {
      get(i) {
        let route = routeMemo.get(i);
        if (!route) {
          route = routesFrom(city, network, i);
          routeMemo.set(i, route);
        }
        return route;
      },
    },
    shops = [];
  for (let i = 0; i < city.tiles.length; i++)
    if (
      city.tiles[i].type === "commercial" &&
      operating(city, metrics, i) &&
      metrics.jobFill[i] > 0
    )
      shops.push({
        i,
        left: Math.floor(metrics.jobFill[i] * 4),
        price: HOUSEHOLD_RULES.shopPrices[businessWealth(metrics.landValue[i])],
      });
  const choices = new Map(),
    minimumShopPrice = shops.reduce(
      (minimum, shop) => Math.min(minimum, shop.price),
      Infinity,
    );
  function choicesFor(i) {
    let result = choices.get(i);
    if (!result) {
      result = shops.length
        ? shops
            .map((shop) => ({
              shop,
              distance: homeRoutes.get(i).distance(shop.i),
            }))
            .filter((x) => Number.isFinite(x.distance))
            .sort(
              (a, b) =>
                a.distance - b.distance ||
                a.shop.price - b.shop.price ||
                a.shop.i - b.shop.i,
            )
        : [];
      choices.set(i, result);
    }
    return result;
  }
  let goods = city.inventory.goods,
    served = true,
    tripsTruncated = false;
  const shoppingLoad = Array(city.tiles.length).fill(0),
    remainingRoad = city.tiles.map(
      (t, i) => (TOOLS[t.type]?.capacity ?? 0) - (metrics.roadLoad?.[i] ?? 0),
    ),
    trips = [],
    tripIndex = new Map();
  while (goods > 0 && served) {
    served = false;
    for (const i of order) {
      const h = state.homes[i];
      if (h.shoppingBought >= h.shoppingWanted || h.cash < minimumShopPrice)
        continue;
      const availableChoices = choicesFor(i);
      if (!availableChoices.length) continue;
      const route = homeRoutes.get(i),
        choice = availableChoices.find(
          (x) =>
            x.shop.left > 0 &&
            h.cash >= x.shop.price &&
            route.fits(x.shop.i, remainingRoad),
        );
      if (!choice) continue;
      const { shop } = choice;
      shop.left--;
      goods--;
      h.cash -= shop.price;
      h.spending += shop.price;
      h.shoppingBought++;
      served = true;
      route.walk(shop.i, (p) => {
        shoppingLoad[p]++;
        remainingRoad[p] =
          (TOOLS[city.tiles[p].type]?.capacity ?? 0) -
          (metrics.roadLoad?.[p] ?? 0) -
          shoppingLoad[p];
      });
      const key = `${i}:${shop.i}`;
      if (tripIndex.has(key)) {
        const trip = trips[tripIndex.get(key)];
        trip.bundles++;
        trip.cost += shop.price;
      } else if (trips.length < 128) {
        tripIndex.set(key, trips.length);
        trips.push({
          from: i,
          to: shop.i,
          bundles: 1,
          cost: shop.price,
          path: route.path(shop.i),
        });
      } else tripsTruncated = true;
      if (goods <= 0) break;
    }
  }
  schooling(city, state, metrics, homeRoutes, order);
  for (const i of homeIndices) {
    const h = state.homes[i];
    h.unmet = h.shoppingWanted - h.shoppingBought;
    updateWealth(h, metrics, i);
    ledger.spending += h.spending;
    ledger.shoppingWanted += h.shoppingWanted;
    ledger.shoppingBought += h.shoppingBought;
    ledger.enrolledChildren += h.enrolledChildren;
    ledger.enrolledAdults += h.enrolledAdults;
  }
  const sum = totals(state.homes),
    firms = businessTaxes(state, city, metrics);
  ledger.closingCash = sum.cash;
  ledger.closingArrears = sum.arrears;
  ledger.commercialTaxes = firms.commercial;
  ledger.industrialTaxes = firms.industrial;
  state.shoppingLoad = shoppingLoad.slice();
  state.ledger = ledger;
  state.pending = { immigration: 0, emigration: 0, writtenOffTaxes: 0 };
  state.lastMonth = target;
  validateHouseholds(state, city, { stable: false });
  // Commit only after all bounded financial/cohort calculations validate.
  city.households = state;
  city.inventory.goods = goods;
  const report = reportWith(state, city, metrics);
  return {
    report,
    bookedTaxes: report.taxes.booked,
    shoppingLoad,
    trips,
    tripsTruncated,
  };
}
