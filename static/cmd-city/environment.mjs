/** Persistent game environment. Integer source/transport units are not physical forecasts. */
import { TOOLS } from "./content.mjs";

const MAX = 1000;
const DIRECTIONS = Object.freeze({
  N: [0, -1],
  E: [1, 0],
  S: [0, 1],
  W: [-1, 0],
});
const integer = (n, low, high) =>
  Number.isSafeInteger(n) && n >= low && n <= high;
const clamp = (n, low = 0, high = MAX) => Math.max(low, Math.min(high, n));
const amount = (n) => (Number.isFinite(n) && n >= 0 ? Math.min(n, 1000000) : 0);
const display = (n) => Math.round(clamp(n, 0, 100) * 10) / 10;
const active = (t) => t && t.enabled !== false && !t.fire && t.type !== "ruins";
const fail = (message) => ({ ok: false, message });
const okay = (message) => ({ ok: true, message });

function sizeOf(width, height) {
  if (
    !integer(width, 1, 256) ||
    !integer(height, 1, 256) ||
    width * height > 65536
  )
    throw Error("Invalid environment dimensions.");
  return width * height;
}
function keys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    Object.keys(value).every((k) => expected.includes(k))
  );
}
function validField(field, size) {
  if (
    !Array.isArray(field) ||
    field.length !== size ||
    Object.keys(field).length !== size
  )
    return false;
  for (let i = 0; i < size; i++) if (!integer(field[i], 0, MAX)) return false;
  return true;
}
export function createEnvironment(width = 40, height = 32) {
  const size = sizeOf(width, height);
  return {
    air: Array(size).fill(0),
    ground: Array(size).fill(0),
    radiation: Array(size).fill(0),
    wind: "E",
    lastMonth: -1,
  };
}
export function validateEnvironment(
  value,
  width = 40,
  height = 32,
  cityMonth = 1000000,
) {
  const size = sizeOf(width, height);
  if (
    !integer(cityMonth, 0, 1000000) ||
    !keys(value, ["air", "ground", "radiation", "wind", "lastMonth"]) ||
    !validField(value.air, size) ||
    !validField(value.ground, size) ||
    !validField(value.radiation, size) ||
    typeof value.wind !== "string" ||
    !Object.hasOwn(DIRECTIONS, value.wind) ||
    !integer(value.lastMonth, -1, cityMonth)
  )
    throw Error("Invalid persistent environment state.");
  return true;
}
function environmentOf(city) {
  const { width, height } = city;
  const environment = city.environment || createEnvironment(width, height);
  validateEnvironment(environment, width, height, city.month);
  if (!Array.isArray(city.tiles) || city.tiles.length !== width * height)
    throw Error("Environment requires a valid city tile map.");
  return environment;
}
function nearby(index, radius, width, height) {
  const x = index % width,
    y = Math.floor(index / width),
    entries = [];
  for (
    let yy = Math.max(0, y - radius);
    yy <= Math.min(height - 1, y + radius);
    yy++
  )
    for (
      let xx = Math.max(0, x - radius);
      xx <= Math.min(width - 1, x + radius);
      xx++
    ) {
      const distance = Math.abs(xx - x) + Math.abs(yy - y);
      if (distance <= radius)
        entries.push({ index: yy * width + xx, distance });
    }
  return entries.sort((a, b) => a.distance - b.distance || a.index - b.index);
}
function ratios(metrics) {
  return {
    power: clamp(amount(metrics?.utilities?.power?.ratio), 0, 1),
    water: clamp(amount(metrics?.utilities?.water?.ratio), 0, 1),
  };
}
function connected(metrics, i) {
  return metrics?.access?.[i] === true;
}
function workers(metrics, i) {
  return Math.floor(amount(metrics?.jobFill?.[i]));
}
function suppliedFacility(city, metrics, i, threshold = 0.9) {
  const r = ratios(metrics);
  return (
    active(city.tiles[i]) &&
    connected(metrics, i) &&
    r.power >= threshold &&
    r.water >= threshold
  );
}
function definition(type) {
  return Object.hasOwn(TOOLS, type) ? TOOLS[type] : null;
}
function moduleScale(tile) {
  return 1 + 0.5 * (integer(tile.modules, 0, 3) ? tile.modules : 0);
}
function sourceReport(city, metrics) {
  const size = city.width * city.height,
    r = ratios(metrics);
  const air = Array(size).fill(0),
    ground = Array(size).fill(0),
    sources = [];
  // Forecast opening-month activity in the same stable tile order as production.
  // Every producer shares this shadow stock; no two facilities can reserve the
  // same input or output headroom. Authoritative inventory is never mutated.
  const stock = Object.fromEntries(
    ["coal", "ore", "oil", "goods", "alloy", "electronics"].map((resource) => [
      resource,
      amount(city.inventory?.[resource]),
    ]),
  );
  stock.ore -= Math.min(
    stock.ore,
    Math.floor(amount(metrics?.nuclearFuelUsed)),
  );
  const thermalPlants = city.tiles.reduce(
    (n, tile, i) =>
      n +
      (tile.type === "coalPlant" && active(tile) && connected(metrics, i)
        ? 1
        : 0),
    0,
  );
  const fuelRatio = thermalPlants
    ? Math.min(1, amount(metrics?.fuelUsed) / (thermalPlants * 20))
    : 0;
  const add = (i, airborne, soil, reason) => {
    airborne = Math.max(0, Math.floor(airborne));
    soil = Math.max(0, Math.floor(soil));
    if (!airborne && !soil) return;
    air[i] += airborne;
    ground[i] += soil;
    sources.push({
      index: i,
      type: city.tiles[i].type,
      air: airborne,
      ground: soil,
      reason,
    });
  };
  for (let i = 0; i < size; i++) {
    const tile = city.tiles[i],
      filled = workers(metrics, i);
    if (active(tile) && connected(metrics, i)) {
      if (tile.type === "coalPlant")
        add(
          i,
          120 * fuelRatio,
          8 * fuelRatio,
          "Reserved thermal fuel forecasts combustion emissions for this month.",
        );
      if (tile.type === "industrial" && filled && r.power > 0 && r.water > 0) {
        const production = Math.min(
          Math.floor(filled * 0.8),
          Math.max(0, 1000000 - stock.goods),
        );
        stock.goods += production;
        add(
          i,
          production * 4,
          production * 2,
          "Staffed goods-production forecast reserves remaining goods storage and emits contamination.",
        );
      }
      if (
        tile.type === "factory" &&
        filled &&
        suppliedFacility(city, metrics, i)
      ) {
        const runs = Math.min(
          Math.floor((5 * moduleScale(tile) * filled) / 12),
          Math.floor(stock.ore / 3),
          Math.floor(stock.oil / 2),
          Math.floor((1000000 - stock.alloy) / 2),
          1000000 - stock.electronics,
        );
        stock.ore -= runs * 3;
        stock.oil -= runs * 2;
        stock.alloy += runs * 2;
        stock.electronics += runs;
        add(
          i,
          runs * 16,
          runs * 8,
          "Advanced-production forecast reserves shared inputs and output storage before emitting contamination.",
        );
      }
      if (
        (tile.type === "mine" || tile.type === "oilWell") &&
        filled &&
        r.power > 0 &&
        r.water > 0
      ) {
        const resource = ["coal", "ore", "oil"].includes(tile.resource)
          ? tile.resource
          : null;
        const extracted = resource
          ? Math.min(
              amount(tile.reserve),
              1000000 - stock[resource],
              Math.floor(
                ((tile.type === "mine" ? 40 : 35) *
                  moduleScale(tile) *
                  filled) /
                  8,
              ),
            )
          : 0;
        if (resource) stock[resource] += extracted;
        add(
          i,
          extracted,
          extracted * 2,
          "Extraction forecast reserves finite deposit and shared inventory headroom before emitting contamination.",
        );
      }
    }
    // Stored physical waste remains a source after closure; shutting a gate does not erase it.
    if (tile.type === "landfill" && amount(tile.stored))
      add(
        i,
        0,
        Math.ceil(amount(tile.stored) / 1000) * 2,
        "Stored landfill waste continues to leach after closure.",
      );
    if (tile.fire > 0)
      add(
        i,
        Math.min(3, amount(tile.fire)) * 40,
        0,
        "The active fire releases smoke.",
      );
    if (amount(tile.occupancy)) {
      const sewageRatio = connected(metrics, i)
        ? clamp(amount(metrics?.utilities?.sewage?.ratio), 0, 1)
        : 0;
      const wasteRatio = connected(metrics, i)
        ? clamp(amount(metrics?.utilities?.waste?.ratio), 0, 1)
        : 0;
      add(
        i,
        0,
        Math.ceil((amount(tile.occupancy) * (1 - sewageRatio)) / 4) +
          Math.ceil((amount(tile.occupancy) * (1 - wasteRatio)) / 8),
        "Unserved sewage or waste contaminates this occupied lot.",
      );
    }
  }
  return {
    air,
    ground,
    sources,
    totals: {
      air: air.reduce((a, b) => a + b, 0),
      ground: ground.reduce((a, b) => a + b, 0),
    },
  };
}
function localWaterContamination(city, environment, index) {
  let total = 0,
    weight = 0;
  for (const cell of nearby(index, 2, city.width, city.height)) {
    const w = 3 - cell.distance;
    total +=
      Math.min(
        MAX,
        environment.ground[cell.index] +
          environment.radiation[cell.index] * 0.5,
      ) * w;
    weight += w;
  }
  return weight ? total / weight : 0;
}
export function environmentReport(city, metrics = {}) {
  return environmentReportWith(city, metrics, environmentOf(city));
}
/** Validated, independent environmental fields for one read-only simulation phase.
 * Live staffing, stocks, occupancy, buildings and utilities are still recomputed.
 */
export function createEnvironmentReportSnapshot(
  city,
  { presentation = true } = {},
) {
  const source = environmentOf(city),
    width = city.width,
    height = city.height;
  const environment = {
    ...source,
    air: source.air.slice(),
    ground: source.ground.slice(),
    radiation: source.radiation.slice(),
  };
  return (metrics = {}, options = {}) => {
    if (city.width !== width || city.height !== height)
      throw Error("Environmental snapshot dimensions changed.");
    return environmentReportWith(
      city,
      metrics,
      environment,
      options.presentation ?? presentation,
    );
  };
}
function environmentReportWith(
  city,
  metrics,
  environment,
  presentation = true,
) {
  const size = city.width * city.height,
    emissions = presentation ? sourceReport(city, metrics) : null;
  let pumpCapacity = 0,
    weightedContamination = 0,
    filterCapacity = 0;
  const pumpContamination = Array(size).fill(0),
    r = ratios(metrics);
  for (let i = 0; i < size; i++) {
    const tile = city.tiles[i];
    if (tile.type === "water")
      pumpContamination[i] = localWaterContamination(city, environment, i) / 10;
    if (
      tile.type === "water" &&
      active(tile) &&
      connected(metrics, i) &&
      r.power > 0 &&
      amount(city.groundwater) > 0
    ) {
      const capacity =
        amount(definition("water")?.supply || 1000) *
        moduleScale(tile) *
        r.power;
      pumpCapacity += capacity;
      weightedContamination += capacity * pumpContamination[i];
    }
    if (
      tile.type === "waterFilter" &&
      suppliedFacility(city, metrics, i) &&
      workers(metrics, i) > 0
    )
      filterCapacity += Math.floor(
        amount(definition("waterFilter")?.supply || 500) *
          moduleScale(tile) *
          Math.min(1, workers(metrics, i) / 8),
      );
  }
  const deliveredWater = pumpCapacity
    ? Math.floor(
        Math.min(
          pumpCapacity,
          amount(metrics?.utilities?.water?.supply),
          amount(metrics?.utilities?.water?.demand),
        ),
      )
    : 0;
  const rawContamination = pumpCapacity
    ? weightedContamination / pumpCapacity
    : 0;
  const filteredWater = Math.min(deliveredWater, filterCapacity);
  const deliveredWaterContamination = deliveredWater
    ? rawContamination * (1 - (0.9 * filteredWater) / deliveredWater)
    : 0;
  let residents = 0,
    airExposure = 0,
    radiationExposure = 0;
  const restricted = environment.radiation.map((v) => v >= 200),
    blockers = presentation ? Array.from({ length: size }, () => []) : null;
  for (let i = 0; i < size; i++) {
    const tile = city.tiles[i];
    if (
      ["residential", "tower"].includes(tile.type) &&
      amount(tile.occupancy)
    ) {
      const population = amount(tile.occupancy);
      residents += population;
      airExposure += (environment.air[i] / 10) * population;
      radiationExposure += (environment.radiation[i] / 10) * population;
    }
    if (presentation && restricted[i])
      blockers[i].push(
        "Radiation restricts new occupation and normal development on this land. Recovery access and cleanup may remain available.",
      );
    if (presentation && environment.ground[i] >= 500)
      blockers[i].push(
        "Persistent ground contamination is high; removing the emitter does not clean existing soil.",
      );
    if (presentation && tile.type === "water" && pumpContamination[i] > 20)
      blockers[i].push(
        "This pump draws contaminated water. Connected, supplied and staffed filtration treats only its available throughput.",
      );
    if (presentation && tile.type === "landfill" && amount(tile.stored))
      blockers[i].push(
        "Stored landfill waste remains a local contamination source, including after closure.",
      );
  }
  const residentAirExposure = residents ? airExposure / residents : 0;
  const residentRadiationExposure = residents
    ? radiationExposure / residents
    : 0;
  return {
    air: environment.air.map((v) => v / 10),
    ground: environment.ground.map((v) => v / 10),
    radiation: environment.radiation.map((v) => v / 10),
    restricted,
    ...(presentation
      ? {
          blockers,
          sources: emissions.sources,
          emissions: emissions.totals,
          emissionBasis: "opening-month activity forecast",
          pumpContamination: pumpContamination.map(display),
        }
      : {}),
    pumpWeightedRawContamination: display(rawContamination),
    deliveredWaterContamination: display(deliveredWaterContamination),
    waterFilterCapacity: filterCapacity,
    filteredWater,
    deliveredWater,
    residentAirExposure: display(residentAirExposure),
    residentRadiationExposure: display(residentRadiationExposure),
    healthPenalty: display(
      clamp(
        residentAirExposure * 0.25 +
          deliveredWaterContamination * 0.35 +
          residentRadiationExposure * 0.6,
        0,
        80,
      ),
    ),
  };
}
function cleanupWork(city, metrics, environment) {
  let groundRemoved = 0,
    radiationRemoved = 0;
  for (let i = 0; i < city.tiles.length; i++) {
    const tile = city.tiles[i];
    if (
      tile.type !== "cleanup" ||
      !suppliedFacility(city, metrics, i) ||
      !workers(metrics, i)
    )
      continue;
    const staff = Math.min(1, workers(metrics, i) / 8),
      scale = moduleScale(tile);
    let groundBudget = Math.floor(80 * scale * staff),
      radiationBudget = Math.floor(20 * scale * staff);
    const radius = 3 + (integer(tile.modules, 0, 3) ? tile.modules : 0);
    for (const cell of nearby(i, radius, city.width, city.height)) {
      const ground = Math.min(groundBudget, environment.ground[cell.index]);
      const radiation = Math.min(
        radiationBudget,
        environment.radiation[cell.index],
      );
      environment.ground[cell.index] -= ground;
      environment.radiation[cell.index] -= radiation;
      groundBudget -= ground;
      radiationBudget -= radiation;
      groundRemoved += ground;
      radiationRemoved += radiation;
      if (!groundBudget && !radiationBudget) break;
    }
  }
  return { groundRemoved, radiationRemoved };
}
export function advanceEnvironment(city, metrics = {}, { report = true } = {}) {
  const before = environmentOf(city);
  if (before.lastMonth >= city.month)
    return {
      ...(report ? environmentReport(city, metrics) : {}),
      changed: false,
      massBalance: null,
    };
  const size = city.width * city.height,
    sources = sourceReport(city, metrics);
  const next = {
    air: Array(size).fill(0),
    ground: Array(size).fill(0),
    radiation: Array(size).fill(0),
    wind: before.wind,
    lastMonth: city.month,
  };
  const [dx, dy] = DIRECTIONS[before.wind];
  const balance = {
    airBefore: before.air.reduce((a, b) => a + b, 0),
    airEmitted: sources.totals.air,
    airClipped: 0,
    airDecay: 0,
    airOutflow: 0,
    airAfter: 0,
    groundDeposited: 0,
    groundClipped: 0,
    groundDecay: 0,
    radiationDecay: 0,
    cleanupGround: 0,
    cleanupRadiation: 0,
  };
  for (let i = 0; i < size; i++) {
    const emitted = before.air[i] + sources.air[i],
      bounded = Math.min(MAX, emitted),
      decay = Math.floor(bounded / 10),
      deposition = Math.floor(decay / 4),
      remaining = bounded - decay,
      moving = Math.floor(remaining / 4);
    balance.airClipped += emitted - bounded;
    balance.airDecay += decay;
    balance.groundDeposited += deposition;
    next.air[i] += remaining - moving;
    const x = (i % city.width) + dx,
      y = Math.floor(i / city.width) + dy;
    if (x >= 0 && x < city.width && y >= 0 && y < city.height)
      next.air[y * city.width + x] += moving;
    else balance.airOutflow += moving;
    const groundDecay = Math.min(2, before.ground[i]),
      ground = before.ground[i] - groundDecay + sources.ground[i] + deposition;
    balance.groundDecay += groundDecay;
    balance.groundClipped += Math.max(0, ground - MAX);
    next.ground[i] = Math.min(MAX, ground);
    const radiationDecay = Math.min(1, before.radiation[i]);
    balance.radiationDecay += radiationDecay;
    next.radiation[i] = before.radiation[i] - radiationDecay;
  }
  const cleaned = cleanupWork(city, metrics, next);
  balance.cleanupGround = cleaned.groundRemoved;
  balance.cleanupRadiation = cleaned.radiationRemoved;
  balance.airAfter = next.air.reduce((a, b) => a + b, 0);
  validateEnvironment(next, city.width, city.height, city.month);
  city.environment = next;
  return {
    ...(report ? environmentReport(city, metrics) : {}),
    changed: true,
    massBalance: balance,
  };
}
export function environmentAction(city, action) {
  if (
    !action ||
    typeof action !== "object" ||
    Array.isArray(action) ||
    typeof action.type !== "string"
  )
    return fail("Invalid environmental action.");
  if (action.type === "wind") {
    if (
      !keys(action, ["type", "direction"]) ||
      typeof action.direction !== "string" ||
      !Object.hasOwn(DIRECTIONS, action.direction)
    )
      return fail("Wind direction must be N, E, S or W.");
    const environment = environmentOf(city);
    if (!city.environment) city.environment = environment;
    city.environment.wind = action.direction;
    return okay(`Wind now carries air contamination ${action.direction}.`);
  }
  if (action.type === "radiation") {
    if (
      !keys(action, ["type", "x", "y"]) ||
      !integer(action.x, 0, city.width - 1) ||
      !integer(action.y, 0, city.height - 1)
    )
      return fail("Choose a valid nuclear facility tile.");
    const index = action.y * city.width + action.x,
      tile = city.tiles[index];
    if (!tile || tile.type !== "nuclear")
      return fail(
        "A radiation incident requires an existing nuclear facility.",
      );
    const before = environmentOf(city),
      next = {
        ...before,
        air: before.air.slice(),
        ground: before.ground.slice(),
        radiation: before.radiation.slice(),
      };
    for (const cell of nearby(index, 4, city.width, city.height)) {
      const intensity = Math.floor(MAX * (1 - cell.distance / 5));
      next.radiation[cell.index] = Math.min(
        MAX,
        next.radiation[cell.index] + intensity,
      );
      next.ground[cell.index] = Math.min(
        MAX,
        next.ground[cell.index] + Math.floor(intensity / 4),
      );
    }
    city.environment = next;
    tile.type = "ruins";
    tile.occupancy = 0;
    tile.enabled = false;
    tile.fire = 0;
    return okay(
      "Nuclear facility lost. Radiation persists; protect residents and fund finite cleanup.",
    );
  }
  return fail("Unknown environmental action.");
}
