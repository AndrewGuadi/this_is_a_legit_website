/**
 * Demand-assigned local transit. These are deterministic capacity reservations,
 * not individual vehicle timetables or a user-authored bus route planner.
 * All writes affect only the derived network returned by planTransit.
 */
const ROAD_TYPES = new Set(["road", "avenue", "bridge"]);
const CATCHMENT = 6;
const RAIL_EDGE_CAPACITY = 400;
const BUS_EDGE_CAPACITY = 120;
const noRoute = () => ({ mode: "none", moved: 0, roadFactor: 1 });
const validIndex = (n, size) => Number.isInteger(n) && n >= 0 && n < size;
const distance = (a, b, width) =>
  Math.abs((a % width) - (b % width)) +
  Math.abs(Math.floor(a / width) - Math.floor(b / width));
const edgeKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function neighbors(i, width, height) {
  const out = [];
  if (i % width > 0) out.push(i - 1);
  if (i % width < width - 1) out.push(i + 1);
  if (i >= width) out.push(i - width);
  if (i < width * (height - 1)) out.push(i + width);
  return out;
}

/** Snapshot eligibility and graph data; never retain mutable city references. */
export function planTransit(state, access) {
  const { width, height, tiles } = state;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    !Array.isArray(tiles) ||
    tiles.length !== width * height ||
    !Array.isArray(access) ||
    access.length !== tiles.length
  ) {
    throw new Error("Transit planning requires a valid city and access map.");
  }
  const size = tiles.length;
  const rail = tiles.map(
    (t) => t.type === "rail" && t.enabled !== false && !t.fire,
  );
  const road = tiles.map(
    (t, i) =>
      ROAD_TYPES.has(t.type) &&
      access[i] === true &&
      t.enabled !== false &&
      !t.fire,
  );
  const stations = [],
    exchanges = [];
  for (let i = 0; i < size; i++) {
    const tile = tiles[i];
    if (!access[i] || tile.enabled === false || tile.fire) continue;
    const modules = Number.isInteger(tile.modules)
      ? Math.max(0, Math.min(3, tile.modules))
      : 0;
    const near = neighbors(i, width, height);
    const roads = near.filter((n) => road[n]);
    if (!roads.length) continue;
    if (tile.type === "station") {
      const frontages = near.filter((n) => rail[n]);
      if (frontages.length)
        stations.push({
          tile: i,
          frontages,
          capacity: Math.floor(400 * (1 + modules * 0.5)),
          load: 0,
        });
    }
    if (tile.type === "bus")
      exchanges.push({
        tile: i,
        frontages: roads,
        capacity: Math.floor(120 * (1 + modules * 0.5)),
        load: 0,
      });
  }
  return {
    width,
    height,
    size,
    rail,
    road,
    stations,
    exchanges,
    busLoad: Array(size).fill(0),
    railLoad: Array(size).fill(0),
    busEdgeLoad: {},
    railEdgeLoad: {},
    busPassengers: 0,
    railPassengers: 0,
  };
}

function eligiblePairs(stops, origin, destination, width) {
  const starts = stops.filter(
    (stop) =>
      stop.load < stop.capacity &&
      distance(origin, stop.tile, width) <= CATCHMENT,
  );
  const ends = stops.filter(
    (stop) =>
      stop.load < stop.capacity &&
      distance(destination, stop.tile, width) <= CATCHMENT,
  );
  const pairs = [];
  for (const start of starts)
    for (const end of ends) {
      if (start.tile !== end.tile)
        pairs.push({
          start,
          end,
          walk:
            distance(origin, start.tile, width) +
            distance(destination, end.tile, width),
        });
    }
  return pairs.sort(
    (a, b) =>
      a.walk - b.walk || a.start.tile - b.start.tile || a.end.tile - b.end.tile,
  );
}

/** Find an actual track path with capacity remaining on every shared edge. */
function railPath(network, start, end) {
  const queue = start.frontages.slice(),
    previous = Array(network.size).fill(-2);
  for (const n of queue) previous[n] = -1;
  const goals = new Set(end.frontages);
  let goal = -1;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const here = queue[cursor];
    if (goals.has(here)) {
      goal = here;
      break;
    }
    for (const next of neighbors(here, network.width, network.height)) {
      if (
        !network.rail[next] ||
        previous[next] !== -2 ||
        (network.railEdgeLoad[edgeKey(here, next)] || 0) >= RAIL_EDGE_CAPACITY
      )
        continue;
      previous[next] = here;
      queue.push(next);
    }
  }
  if (goal < 0) return null;
  const path = [];
  for (let p = goal; p !== -1; p = previous[p]) path.push(p);
  return path.reverse();
}

function remainingOnPath(path, loads, capacity) {
  let remaining = capacity;
  for (let i = 1; i < path.length; i++)
    remaining = Math.min(
      remaining,
      capacity - (loads[edgeKey(path[i - 1], path[i])] || 0),
    );
  return remaining;
}

function reservePath(path, edgeLoads, tileLoads, amount) {
  // Tile overlays report the busiest incident edge, not the sum of unrelated routes.
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      key = edgeKey(a, b);
    edgeLoads[key] = (edgeLoads[key] || 0) + amount;
    tileLoads[a] = Math.max(tileLoads[a], edgeLoads[key]);
    tileLoads[b] = Math.max(tileLoads[b], edgeLoads[key]);
  }
  if (path.length === 1)
    tileLoads[path[0]] = Math.max(tileLoads[path[0]], amount);
}

function validRoadPath(network, path, origin, destination) {
  if (
    !Array.isArray(path) ||
    !path.length ||
    path.length > network.size ||
    new Set(path).size !== path.length
  )
    return false;
  if (
    distance(origin, path[0], network.width) > CATCHMENT ||
    distance(destination, path.at(-1), network.width) > CATCHMENT
  )
    return false;
  for (let i = 0; i < path.length; i++) {
    if (!validIndex(path[i], network.size) || !network.road[path[i]])
      return false;
    if (i && distance(path[i - 1], path[i], network.width) !== 1) return false;
  }
  return true;
}

/**
 * Reserve up to requested passengers, preferring connected rail over bus service.
 * Callers account for moved * roadFactor road vehicle equivalents; non-moved
 * commuters can still be assigned to cars by the caller. Invalid requests are inert.
 */
export function routeTransit(
  network,
  originTileIndex,
  destinationTileIndex,
  roadPath,
  requested,
) {
  if (
    !network ||
    !Number.isSafeInteger(requested) ||
    requested <= 0 ||
    !validIndex(originTileIndex, network.size) ||
    !validIndex(destinationTileIndex, network.size) ||
    originTileIndex === destinationTileIndex
  )
    return noRoute();
  for (const pair of eligiblePairs(
    network.stations,
    originTileIndex,
    destinationTileIndex,
    network.width,
  )) {
    const path = railPath(network, pair.start, pair.end);
    if (!path) continue;
    const moved = Math.min(
      requested,
      pair.start.capacity - pair.start.load,
      pair.end.capacity - pair.end.load,
      remainingOnPath(path, network.railEdgeLoad, RAIL_EDGE_CAPACITY),
    );
    if (moved <= 0) continue;
    pair.start.load += moved;
    pair.end.load += moved;
    reservePath(path, network.railEdgeLoad, network.railLoad, moved);
    network.railPassengers += moved;
    return { mode: "rail", moved, roadFactor: 0 };
  }
  if (!validRoadPath(network, roadPath, originTileIndex, destinationTileIndex))
    return noRoute();
  const onPath = new Set(roadPath);
  for (const pair of eligiblePairs(
    network.exchanges,
    originTileIndex,
    destinationTileIndex,
    network.width,
  )) {
    if (
      !pair.start.frontages.some((n) => onPath.has(n)) ||
      !pair.end.frontages.some((n) => onPath.has(n))
    )
      continue;
    const moved = Math.min(
      requested,
      pair.start.capacity - pair.start.load,
      pair.end.capacity - pair.end.load,
      remainingOnPath(roadPath, network.busEdgeLoad, BUS_EDGE_CAPACITY),
    );
    if (moved <= 0) continue;
    pair.start.load += moved;
    pair.end.load += moved;
    reservePath(roadPath, network.busEdgeLoad, network.busLoad, moved);
    network.busPassengers += moved;
    return { mode: "bus", moved, roadFactor: 0.05 };
  }
  return noRoute();
}
