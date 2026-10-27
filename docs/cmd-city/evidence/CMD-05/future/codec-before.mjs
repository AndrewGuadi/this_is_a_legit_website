import {createFuture,validateFuture,futureTowerCapacity} from "./future.mjs";
import { createHouseholds, validateHouseholds } from "./households.mjs";
import { createServices, validateServices } from "./services.mjs";
import { createEnvironment, validateEnvironment } from "./environment.mjs";
import { createCivic, validateCivic } from "./civic.mjs";
import { TOOLS, RESOURCES, RESEARCH, capacity } from "./content.mjs";
export const MAX_CITY_SAVE_BYTES = 1048576;
const MAX = MAX_CITY_SAVE_BYTES;
const bad = () => {
  throw Error("This file is not a valid CMD City version 1, 2, 3 or 4 save.");
};
const integer = (n, a, b) => Number.isSafeInteger(n) && n >= a && n <= b;
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
function keys(o, names) {
  if (
    !object(o) ||
    Object.keys(o).length !== names.length ||
    Object.keys(o).some((k) => !names.includes(k))
  )
    bad();
}
function numericMap(o, names, a, b) {
  keys(o, names);
  for (const n of names) if (!integer(o[n], a, b)) bad();
}
export function parseCity(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX)
    throw Error("Save exceeds the 1 MiB import limit.");
  let s;
  try {
    s = JSON.parse(text);
  } catch {
    bad();
  }
  if (!object(s) || ![1, 2, 3, 4].includes(s.version)) bad();
  const version = s.version;
  keys(s, [
    "version",
    "width",
    "height",
    "seed",
    "rng",
    "name",
    "month",
    "cash",
    "sandbox",
    "taxes",
    "funding",
    "policies",
    "research",
    "inventory",
    "trade",
    "bonds",
    "history",
    "events",
    "groundwater",
    "backlogs",
    "regionalPower",
    "tiles",
    ...(version >= 2 ? ["environment", "civic"] : []),
    ...(version >= 3 ? ["households", "services"] : []),
    ...(version === 4 ? ["future"] : []),
  ]);
  if (
    ![1, 2, 3, 4].includes(s.version) ||
    s.width !== 40 ||
    s.height !== 32 ||
    !integer(s.seed, 1, 4294967295) ||
    !integer(s.rng, 1, 4294967295) ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    s.name.length > 80 ||
    !integer(s.month, 0, 1000000) ||
    !integer(s.cash, -1e12, 1e12) ||
    typeof s.sandbox !== "boolean" ||
    !integer(s.groundwater, 0, 1000000)
  )
    bad();
  if (![0, 200].includes(s.regionalPower)) bad();
  numericMap(s.backlogs, ["sewage", "waste"], 0, 1000000);
  numericMap(s.taxes, ["residential", "commercial", "industrial"], 0, 20);
  numericMap(s.funding, ["school", "clinic", "fire", "police"], 0, 150);
  keys(s.policies, ["recycling", "disasters"]);
  if (Object.values(s.policies).some((v) => typeof v !== "boolean")) bad();
  keys(s.research, ["points", "completed"]);
  if (
    !integer(s.research.points, 0, 1000000) ||
    !Array.isArray(s.research.completed) ||
    s.research.completed.length > Object.keys(RESEARCH).length ||
    new Set(s.research.completed).size !== s.research.completed.length ||
    s.research.completed.some(
      (v) => typeof v !== "string" || !Object.hasOwn(RESEARCH, v),
    )
  )
    bad();
  if(version < 3 && s.research.completed.some(name=>!["cleanEnergy","transit","vertical","serviceDrones"].includes(name))) bad();
  if(version < 4 && s.research.completed.some(name=>!["cleanEnergy","transit","vertical","serviceDrones","maglev"].includes(name))) bad();
  for (const name of s.research.completed)
    if (RESEARCH[name].requires.some((r) => !s.research.completed.includes(r)))
      bad();
  numericMap(s.inventory, RESOURCES, 0, 1000000);
  keys(s.trade, RESOURCES);
  if (
    Object.values(s.trade).some((v) => !["off", "import", "export"].includes(v))
  )
    bad();
  if (!Array.isArray(s.tiles) || s.tiles.length !== 1280) bad();
  let population = 0;
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i];
    keys(t, [
      "terrain",
      "type",
      "occupancy",
      "level",
      "modules",
      "fire",
      "resource",
      "reserve",
      "age",
      "stored",
      "enabled",
    ]);
    if (
      !["land", "water"].includes(t.terrain) ||
      !["empty", "ruins", ...Object.keys(TOOLS)].includes(t.type) ||
      !integer(t.level, 1, 3) ||
      !integer(t.modules, 0, 3) ||
      !integer(t.fire, 0, 3) ||
      ![null, "coal", "ore", "oil"].includes(t.resource) ||
      !integer(t.reserve, 0, 1000000) ||
      !integer(t.age, 0, s.month) ||
      !integer(t.stored, 0, 30000) ||
      typeof t.enabled !== "boolean" ||
      !integer(t.occupancy, 0, version === 4 && t.type === "tower" ? futureTowerCapacity(s,i) : capacity(t))
    )
      bad();
    if (
      version === 1 &&
      ["townHall", "waterFilter", "cleanup", "nuclear"].includes(t.type)
    )
      bad();
    if (t.terrain === "water" && !["empty", "bridge", "ruins"].includes(t.type))
      bad();
    if (t.type === "bridge" && t.terrain !== "water") bad();
    if (t.type === "mine" && !["coal", "ore"].includes(t.resource)) bad();
    if (t.type === "oilWell" && t.resource !== "oil") bad();
    if (["maglevTrack", "maglevStation"].includes(t.type) && !s.research.completed.includes("maglev")) bad();
    if (["streetcarTrack", "maglevTrack"].includes(t.type) && t.modules !== 0) bad();
    if (version < 4 && ["consortium"].includes(t.type)) bad();
    if (version < 3 && ["streetcarTrack", "streetcarStop", "ferryTerminal", "maglevTrack", "maglevStation"].includes(t.type)) bad();
    if (t.type === "tower" && !s.research.completed.includes("vertical")) bad();
    if (t.type === "tower" || t.type === "residential")
      population += t.occupancy;
  }
  if (population > 1000000) bad();
  if (
    !["road", "avenue"].includes(s.tiles[640].type) ||
    s.tiles[640].terrain !== "land"
  )
    bad();
  if (!Array.isArray(s.bonds) || s.bonds.length > 3) bad();
  for (const b of s.bonds) {
    keys(b, ["balance", "payment", "months"]);
    if (
      !integer(b.balance, 1, 2200000) ||
      b.payment !== 91667 ||
      !integer(b.months, 1, 24) ||
      b.balance > b.payment * b.months
    )
      bad();
  }
  if (!Array.isArray(s.history) || s.history.length > 24) bad();
  let previous = -1;
  for (const h of s.history) {
    keys(h, [
      "month",
      "population",
      "happiness",
      "cash",
      "income",
      "upkeep",
      "debt",
      "trade",
      "net",
    ]);
    if (
      !integer(h.month, 1, s.month) ||
      h.month <= previous ||
      !integer(h.population, 0, 1000000) ||
      !integer(h.happiness, 0, 100) ||
      !integer(h.cash, -1e12, 1e12) ||
      !integer(h.income, 0, version >= 3 ? 2e12 : 1e10) ||
      !integer(h.upkeep, 0, 1e10) ||
      !integer(h.debt, 0, 1e10) ||
      !integer(h.trade, -1e10, 1e10) ||
      !integer(
        h.net,
        version >= 3 ? -2e12 : -1e10,
        version >= 3 ? 2e12 : 1e10,
      ) ||
      h.net !== h.income - h.upkeep - h.debt + h.trade
    )
      bad();
    previous = h.month;
  }
  if (
    !Array.isArray(s.events) ||
    s.events.length > 24 ||
    s.events.some((v) => typeof v !== "string" || v.length > 500)
  )
    bad();
  if (version === 1) {
    // Validate the complete legacy schema before adding either new subsystem.
    s.version = 2;
    s.environment = createEnvironment(s.width, s.height);
    s.environment.lastMonth = s.month - 1;
    s.civic = createCivic({ sandbox: s.sandbox, month: s.month });
  }
  validateEnvironment(s.environment, s.width, s.height, s.month);
  if (s.environment.lastMonth !== s.month - 1) bad();
  validateCivic(s.civic, s.month, s.sandbox);
  if (s.civic.lastMonth !== s.month) bad();
  if (version < 3) {
    s.households = createHouseholds(s);
    for (const sector of ["residential", "commercial", "industrial"])
      s.households.wealthTaxes[sector] = [
        s.taxes[sector],
        s.taxes[sector],
        s.taxes[sector],
      ];
    s.services = createServices(s);
    s.version = 3;
  }
  validateHouseholds(s.households, s);
  validateServices(s.services, s);
  const pendingWaste =
    s.services.waste.reduce((n, v) => n + v, 0) +
    s.services.looseWaste +
    s.services.vehicles.reduce(
      (n, v) => n + (v.kind === "garbage" ? v.payload : 0),
      0,
    );
  if (s.backlogs.waste !== Math.min(1000000, pendingWaste)) bad();
  if(version < 4) { s.future=createFuture(s); s.version=4; }
  validateFuture(s.future,s);
  if(s.future.lastMonth !== s.month) bad();
  assertCitySaveBudget(s);
  return s;
}
/** Exact post-transaction byte bound; never guesses from entity counts. */
export function assertCitySaveBudget(city) {
  const text = JSON.stringify(city);
  // A UTF-16 code unit needs at most three UTF-8 bytes (a surrogate pair
  // needs four total). Small strings and ASCII strings therefore have a proven
  // byte bound without allocating a second full encoded buffer. Borderline
  // Unicode still takes the exact encoder path.
  if (typeof text !== "string" || text.length > MAX ||
    (text.length * 3 > MAX && /[^\u0000-\u007f]/.test(text) &&
      new TextEncoder().encode(text).length > MAX))
    throw Error("This city would exceed the 1 MiB save/export limit.");
  return text;
}
export function serializeCity(s) {
  const text = assertCitySaveBudget(s);
  parseCity(text);
  return text;
}
