/**
 * Original offline regional cooperation. No network, account, AI opponent or
 * cross-city commuter is implied by these three independently simulated cities.
 */
import {
  createCity,
  applyAction,
  advanceMonth,
  measure,
  monthNeedsDraft,
} from "./core.mjs";
import { parseCity } from "./save.mjs";
import { RESOURCES } from "./content.mjs";

const CITY_IDS = ["riverbend", "pinehaven", "stoneport"];
const CITY_NAMES = ["Riverbend", "Pinehaven", "Stoneport"];
const MAX_STOCK = 1_000_000;
const MAX_MONTH = 1_000_000;
const MAX_FILE_BYTES = 3 * 1_048_576;
const MAX_SHIPMENTS = 20;
const FREIGHT_PER_UNIT = 200;
export const REGIONAL_PROJECT = Object.freeze({
  name: "Regional Solar Commons",
  goods: 1000,
  alloy: 500,
  renewablePowerPerCity: 200,
});

const ok = (message) => ({ ok: true, message });
const fail = (message) => ({ ok: false, message });
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const cityIndex = (n) => integer(n, 0, 2);
const invalid = () => {
  throw Error("This is not a valid CMD City region version 1 save.");
};
function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
  )
    invalid();
}
function appendEvent(region, message) {
  region.events.push(message);
  if (region.events.length > 24) region.events.shift();
}
function workingTradeFacility(state) {
  const metrics = measure(state);
  if (
    metrics.utilities.power.ratio < 0.9 ||
    metrics.utilities.water.ratio < 0.9
  )
    return false;
  return state.tiles.some(
    (tile, index) =>
      ["trade", "port"].includes(tile.type) &&
      metrics.operationAccess[index] &&
      tile.enabled !== false &&
      tile.fire === 0,
  );
}
function reservedFor(region, to, resource) {
  return region.shipments.reduce(
    (total, shipment) =>
      total +
      (shipment.to === to && shipment.resource === resource
        ? shipment.amount
        : 0),
    0,
  );
}

export function createRegion({ seed = 2013 } = {}) {
  const base = (Number.isInteger(seed) ? seed >>> 0 : 2013) || 1;
  return {
    version: 1,
    active: 0,
    month: 0,
    cities: CITY_IDS.map((id, index) => ({
      id,
      state: createCity({
        seed: (base + Math.imul(index, 2654435761)) >>> 0 || 1,
        name: CITY_NAMES[index],
        starter: true,
      }),
    })),
    shipments: [],
    project: { goods: 0, alloy: 0, complete: false },
    events: [],
  };
}

export function regionalBenefits(region) {
  const active =
    region.project.complete === true &&
    region.project.goods === REGIONAL_PROJECT.goods &&
    region.project.alloy === REGIONAL_PROJECT.alloy;
  return {
    renewablePowerPerCity: active ? REGIONAL_PROJECT.renewablePowerPerCity : 0,
    active,
  };
}

function restoreRegionJournal(region, text) {
  const restored = JSON.parse(text),
    cities = region.cities;
  for (let i = 0; i < cities.length; i++) {
    const state = cities[i].state;
    for (const key of Object.keys(state))
      if (!Object.hasOwn(restored.cities[i].state, key)) delete state[key];
    Object.assign(state, restored.cities[i].state);
    Object.assign(cities[i], restored.cities[i], { state });
  }
  for (const key of Object.keys(region))
    if (!Object.hasOwn(restored, key)) delete region[key];
  Object.assign(region, restored, { cities });
}
function regionalTransaction(region, run) {
  const journal = JSON.stringify(region);
  try {
    const result = run();
    if (!result.ok) return result;
    serializeRegion(region);
    return result;
  } catch (error) {
    restoreRegionJournal(region, journal);
    return fail(
      `Action was not applied; the entire region was preserved. ${error.message}`,
    );
  }
}
/** Active-city actions also obey the complete region's independent byte budget. */
export function regionCityAction(region, action) {
  return regionalTransaction(region, () =>
    applyAction(region.cities[region.active].state, action),
  );
}
export function regionAction(region, action) {
  return regionalTransaction(region, () => performRegionAction(region, action));
}
function performRegionAction(region, action) {
  if (!action || typeof action !== "object" || Array.isArray(action))
    return fail("Choose a regional action.");
  if (action.type === "switch") {
    if (!cityIndex(action.index))
      return fail("Choose one of the three regional cities.");
    region.active = action.index;
    return ok(`Now governing ${region.cities[region.active].state.name}.`);
  }
  if (action.type === "shipment") {
    const { from, to, resource, amount } = action;
    if (!cityIndex(from) || !cityIndex(to) || from === to)
      return fail("Choose two different regional cities.");
    if (!RESOURCES.includes(resource) || !integer(amount, 1, MAX_STOCK))
      return fail(
        "Choose a valid resource and a positive whole-unit shipment.",
      );
    if (region.month >= MAX_MONTH)
      return fail("This region has reached its supported simulation limit.");
    if (region.shipments.length >= MAX_SHIPMENTS)
      return fail("At most 20 shipments may be in transit.");
    const sender = region.cities[from].state,
      receiver = region.cities[to].state;
    if (sender.inventory[resource] < amount)
      return fail("The sending city does not have that much stock.");
    const freight = amount * FREIGHT_PER_UNIT;
    if (sender.cash < freight)
      return fail("The sending city cannot afford the freight cost.");
    if (
      receiver.inventory[resource] +
        reservedFor(region, to, resource) +
        amount >
      MAX_STOCK
    )
      return fail(
        "The receiving city has insufficient unreserved storage capacity.",
      );
    if (!workingTradeFacility(sender) || !workingTradeFacility(receiver))
      return fail(
        "Both cities need an open, connected and supplied trade depot or freight terminal.",
      );
    // All validation precedes the atomic reservation. No source stock is copied.
    sender.inventory[resource] -= amount;
    sender.cash -= freight;
    region.shipments.push({
      from,
      to,
      resource,
      amount,
      arrivalMonth: region.month + 1,
      freight,
    });
    appendEvent(
      region,
      `${amount} ${resource} reserved from ${sender.name} to ${receiver.name}; arrival month ${region.month + 1}.`,
    );
    return ok(
      `Shipment dispatched. ${amount} ${resource} arrives next region month; freight ${(freight / 100).toLocaleString("en-US")}.`,
    );
  }
  if (action.type === "contribute") {
    const { from, resource, amount } = action;
    if (
      !cityIndex(from) ||
      !["goods", "alloy"].includes(resource) ||
      !integer(amount, 1, MAX_STOCK)
    )
      return fail(
        "Contribute a positive whole amount of goods or alloy from a regional city.",
      );
    if (region.project.complete)
      return fail("The Regional Solar Commons is already complete.");
    const remaining = REGIONAL_PROJECT[resource] - region.project[resource];
    if (amount > remaining)
      return fail(`The project needs only ${remaining} more ${resource}.`);
    const sender = region.cities[from].state;
    if (sender.inventory[resource] < amount)
      return fail("The contributing city does not have that much stock.");
    if (!workingTradeFacility(sender))
      return fail(
        "Contributions require an open, connected and supplied trade facility.",
      );
    sender.inventory[resource] -= amount;
    region.project[resource] += amount;
    appendEvent(
      region,
      `${sender.name} contributed ${amount} ${resource} to the Regional Solar Commons.`,
    );
    if (
      region.project.goods === REGIONAL_PROJECT.goods &&
      region.project.alloy === REGIONAL_PROJECT.alloy
    ) {
      region.project.complete = true;
      for (const city of region.cities)
        city.state.regionalPower = REGIONAL_PROJECT.renewablePowerPerCity;
      appendEvent(
        region,
        "Regional Solar Commons completed: 200 renewable power capacity units support each city.",
      );
      return ok(
        "Regional Solar Commons completed. Each city receives 200 renewable power capacity units; no cash or inventory is minted.",
      );
    }
    return ok(
      `Contributed ${amount} ${resource}. The project retains these materials.`,
    );
  }
  return fail("Unknown regional action.");
}

function simulateRegion(region) {
  if (region.month >= MAX_MONTH)
    throw Error("This region has reached its supported simulation limit.");
  // Deliver before production/imports can occupy the receiver's reserved space.
  // A shipment remains deliverable after a depot closes: it was accepted and
  // reserved at departure; no destination-stock loss or silent cancellation.
  const arrivals = region.shipments.filter(
    (shipment) => shipment.arrivalMonth <= region.month + 1,
  );
  const arrivingTotals = new Map();
  for (const shipment of arrivals) {
    const key = `${shipment.to}:${shipment.resource}`;
    arrivingTotals.set(key, (arrivingTotals.get(key) || 0) + shipment.amount);
    const state = region.cities[shipment.to].state;
    if (
      state.inventory[shipment.resource] + arrivingTotals.get(key) >
      MAX_STOCK
    )
      throw Error(
        "A reserved delivery no longer fits. Restore a validated region before advancing.",
      );
  }
  for (const shipment of arrivals) {
    const state = region.cities[shipment.to].state;
    state.inventory[shipment.resource] += shipment.amount;
    appendEvent(
      region,
      `${state.name} received ${shipment.amount} ${shipment.resource} in region month ${region.month + 1}.`,
    );
  }
  region.shipments = region.shipments.filter(
    (shipment) => shipment.arrivalMonth > region.month + 1,
  );
  for (const city of region.cities) advanceMonth(city.state);
  region.month += 1;
  return measure(region.cities[region.active].state);
}

export function parseRegion(text) {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > MAX_FILE_BYTES
  )
    throw Error("A region import must be at most 3 MiB.");
  let region;
  try {
    region = JSON.parse(text);
  } catch {
    invalid();
  }
  exactKeys(region, [
    "version",
    "active",
    "month",
    "cities",
    "shipments",
    "project",
    "events",
  ]);
  if (
    region.version !== 1 ||
    !cityIndex(region.active) ||
    !integer(region.month, 0, MAX_MONTH)
  )
    invalid();
  if (!Array.isArray(region.cities) || region.cities.length !== 3) invalid();
  for (let index = 0; index < region.cities.length; index++) {
    const city = region.cities[index];
    exactKeys(city, ["id", "state"]);
    if (city.id !== CITY_IDS[index]) invalid();
    city.state = parseCity(JSON.stringify(city.state));
    if (city.state.month !== region.month) invalid();
  }
  exactKeys(region.project, ["goods", "alloy", "complete"]);
  const project = region.project;
  if (
    !integer(project.goods, 0, REGIONAL_PROJECT.goods) ||
    !integer(project.alloy, 0, REGIONAL_PROJECT.alloy) ||
    typeof project.complete !== "boolean"
  )
    invalid();
  const finished =
    project.goods === REGIONAL_PROJECT.goods &&
    project.alloy === REGIONAL_PROJECT.alloy;
  if (project.complete !== finished) invalid();
  const benefit = regionalBenefits(region).renewablePowerPerCity;
  if (region.cities.some((city) => city.state.regionalPower !== benefit))
    invalid();
  if (
    !Array.isArray(region.shipments) ||
    region.shipments.length > MAX_SHIPMENTS
  )
    invalid();
  const reservations = new Map();
  for (const shipment of region.shipments) {
    exactKeys(shipment, [
      "from",
      "to",
      "resource",
      "amount",
      "arrivalMonth",
      "freight",
    ]);
    if (
      !cityIndex(shipment.from) ||
      !cityIndex(shipment.to) ||
      shipment.from === shipment.to ||
      !RESOURCES.includes(shipment.resource) ||
      !integer(shipment.amount, 1, MAX_STOCK) ||
      shipment.freight !== shipment.amount * FREIGHT_PER_UNIT ||
      shipment.arrivalMonth !== region.month + 1 ||
      shipment.arrivalMonth > MAX_MONTH
    )
      invalid();
    const key = `${shipment.to}:${shipment.resource}`;
    reservations.set(key, (reservations.get(key) || 0) + shipment.amount);
    const receiver = region.cities[shipment.to].state;
    if (
      receiver.inventory[shipment.resource] + reservations.get(key) >
      MAX_STOCK
    )
      invalid();
  }
  if (
    !Array.isArray(region.events) ||
    region.events.length > 24 ||
    region.events.some(
      (message) => typeof message !== "string" || message.length > 500,
    )
  )
    invalid();
  return region;
}

export function serializeRegion(region) {
  const text = JSON.stringify(region);
  parseRegion(text);
  return text;
}

export function advanceRegion(region) {
  if (region.month >= MAX_MONTH)
    throw Error(
      "This region has reached its supported month limit. Export it or start a new region.",
    );
  const journal = JSON.stringify(region);
  let mutated = false;
  try {
    if (region.cities.some((c) => monthNeedsDraft(c.state))) {
      const draft = structuredClone(region),
        result = simulateRegion(draft);
      serializeRegion(draft);
      const cities = region.cities;
      for (let i = 0; i < cities.length; i++)
        Object.assign(cities[i].state, draft.cities[i].state);
      Object.assign(region, draft, { cities });
      return result;
    }
    mutated = true;
    const result = simulateRegion(region);
    serializeRegion(region);
    return result;
  } catch (error) {
    if (mutated) restoreRegionJournal(region, journal);
    throw error;
  }
}
