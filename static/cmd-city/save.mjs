import { TOOLS, RESOURCES, RESEARCH, capacity } from "./content.mjs";
const MAX = 1048576;
const bad = () => {
  throw Error("This file is not a valid CMD City version 1 save.");
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
  ]);
  if (
    s.version !== 1 ||
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
    s.research.completed.length > 4 ||
    new Set(s.research.completed).size !== s.research.completed.length ||
    s.research.completed.some((v) => !Object.hasOwn(RESEARCH, v))
  )
    bad();
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
      !integer(t.occupancy, 0, capacity(t))
    )
      bad();
    if (t.terrain === "water" && !["empty", "bridge", "ruins"].includes(t.type))
      bad();
    if (t.type === "bridge" && t.terrain !== "water") bad();
    if (t.type === "mine" && !["coal", "ore"].includes(t.resource)) bad();
    if (t.type === "oilWell" && t.resource !== "oil") bad();
    if (t.type === "tower" && !s.research.completed.includes("vertical")) bad();
  }
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
      !integer(h.income, 0, 1e10) ||
      !integer(h.upkeep, 0, 1e10) ||
      !integer(h.debt, 0, 1e10) ||
      !integer(h.trade, -1e10, 1e10) ||
      !integer(h.net, -1e10, 1e10) ||
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
  return s;
}
export function serializeCity(s) {
  const text = JSON.stringify(s);
  parseCity(text);
  return text;
}
