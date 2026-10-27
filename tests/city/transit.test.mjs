import test from "node:test";
import assert from "node:assert/strict";
import { planTransit, routeTransit } from "../../static/cmd-city/transit.mjs";
const W = 40,
  H = 32,
  N = W * H;
const idx = (x, y) => y * W + x;
function fixture() {
  return {
    width: W,
    height: H,
    tiles: Array.from({ length: N }, () => ({
      type: "empty",
      enabled: true,
      fire: 0,
      modules: 0,
    })),
  };
}
function road(s, y = 16, x1 = 0, x2 = 24) {
  for (let x = x1; x <= x2; x++) s.tiles[idx(x, y)].type = "road";
  return Array.from({ length: x2 - x1 + 1 }, (_, j) => idx(x1 + j, y));
}
function place(s, type, x, y, extra = {}) {
  Object.assign(s.tiles[idx(x, y)], { type, ...extra });
}
function access() {
  return Array(N).fill(true);
}
function busFixture() {
  const s = fixture(),
    path = road(s);
  place(s, "bus", 2, 15);
  place(s, "bus", 20, 15);
  return { s, path, origin: idx(2, 17), destination: idx(20, 17) };
}
function railFixture() {
  const f = busFixture();
  f.s.tiles[idx(2, 15)].type = "station";
  f.s.tiles[idx(20, 15)].type = "station";
  for (let x = 2; x <= 20; x++) place(f.s, "rail", x, 14);
  return f;
}

test("planning creates bounded zeroed derived loads and never mutates the authoritative city", () => {
  const { s } = railFixture(),
    before = structuredClone(s),
    a = access(),
    network = planTransit(s, a);
  assert.equal(network.busLoad.length, N);
  assert.equal(network.railLoad.length, N);
  assert.ok(network.busLoad.every((x) => x === 0));
  assert.ok(network.railLoad.every((x) => x === 0));
  assert.equal(network.busPassengers, 0);
  assert.equal(network.railPassengers, 0);
  assert.deepEqual(s, before);
  assert.deepEqual(a, access());
});
test("a connected rail path with two distinct accessible stations carries actual passengers", () => {
  const { s, path, origin, destination } = railFixture(),
    before = structuredClone(s),
    n = planTransit(s, access());
  const r = routeTransit(n, origin, destination, path, 60);
  assert.deepEqual(r, { mode: "rail", moved: 60, roadFactor: 0 });
  assert.equal(n.railPassengers, 60);
  assert.equal(n.busPassengers, 0);
  assert.ok(n.railLoad.some((x) => x === 60));
  assert.deepEqual(s, before);
});
test("disconnected rail segments, one station and tracks without stations serve nobody", () => {
  for (const change of [
    (s) => place(s, "empty", 10, 14),
    (s) => place(s, "empty", 20, 15),
    (s) => {
      place(s, "empty", 2, 15);
      place(s, "empty", 20, 15);
    },
  ]) {
    const { s, path, origin, destination } = railFixture();
    change(s);
    const n = planTransit(s, access());
    assert.deepEqual(routeTransit(n, origin, destination, path, 60), {
      mode: "none",
      moved: 0,
      roadFactor: 1,
    });
    assert.ok(n.railLoad.every((x) => x === 0));
  }
});
test("disabled, burning or road-disconnected stations are ineligible", () => {
  for (const field of ["disabled", "burning", "disconnected"]) {
    const { s, path, origin, destination } = railFixture(),
      a = access();
    if (field === "disabled") s.tiles[idx(2, 15)].enabled = false;
    if (field === "burning") s.tiles[idx(2, 15)].fire = 1;
    if (field === "disconnected") a[idx(2, 15)] = false;
    assert.equal(
      routeTransit(planTransit(s, a), origin, destination, path, 10).moved,
      0,
    );
  }
});
test("catchments are bounded and one shared station cannot pretend to be a route", () => {
  const { s, path, origin } = railFixture();
  assert.equal(
    routeTransit(planTransit(s, access()), origin, idx(38, 30), path, 10).moved,
    0,
  );
  const f = busFixture();
  place(f.s, "empty", 20, 15);
  assert.equal(
    routeTransit(planTransit(f.s, access()), f.origin, idx(4, 17), f.path, 10)
      .moved,
    0,
  );
});
test("rail capacity is reserved across repeated callers sharing the same track", () => {
  const { s, path, origin, destination } = railFixture(),
    n = planTransit(s, access());
  assert.equal(routeTransit(n, origin, destination, path, 350).moved, 350);
  assert.equal(routeTransit(n, origin, destination, path, 150).moved, 50);
  assert.equal(routeTransit(n, origin, destination, path, 1).moved, 0);
  assert.equal(n.railPassengers, 400);
  assert.ok(n.railLoad.every((v) => v <= 400));
});
test("buses need two exchanges and a genuine connected road path, reducing car equivalents", () => {
  const { s, path, origin, destination } = busFixture(),
    n = planTransit(s, access());
  const r = routeTransit(n, origin, destination, path, 100);
  assert.deepEqual(r, { mode: "bus", moved: 100, roadFactor: 0.05 });
  assert.equal(n.busPassengers, 100);
  assert.equal(n.railPassengers, 0);
  assert.ok(n.busLoad.some((v) => v === 100));
  assert.equal(r.moved * r.roadFactor, 5);
});
test("bus capacity is shared across overlapping trips without inventing passengers", () => {
  const { s, path, origin, destination } = busFixture(),
    n = planTransit(s, access());
  assert.equal(routeTransit(n, origin, destination, path, 90).moved, 90);
  assert.equal(
    routeTransit(n, destination, origin, path.slice().reverse(), 90).moved,
    30,
  );
  assert.equal(routeTransit(n, origin, destination, path, 10).moved, 0);
  assert.equal(n.busPassengers, 120);
  assert.ok(n.busLoad.every((v) => v <= 120));
});
test("bus path cannot jump over missing tiles, diagonals or disconnected roads", () => {
  for (const change of [
    (s) => place(s, "empty", 10, 16),
    (s) => {},
    (s) => {},
  ]) {
    const { s, path, origin, destination } = busFixture();
    change(s);
    const a = access();
    if (s.tiles[idx(10, 16)].type !== "empty") a[idx(10, 16)] = false;
    const n = planTransit(s, a);
    assert.equal(routeTransit(n, origin, destination, path, 20).moved, 0);
  }
  const { s, path, origin, destination } = busFixture();
  const n = planTransit(s, access());
  assert.equal(
    routeTransit(
      n,
      origin,
      destination,
      path.filter((_, i) => i !== 10),
      20,
    ).moved,
    0,
  );
});
test("invalid requests and invalid endpoint indices leave every derived load unchanged", () => {
  const { s, path, origin, destination } = railFixture(),
    n = planTransit(s, access());
  for (const request of [
    0,
    -1,
    NaN,
    Infinity,
    2.4,
    "10",
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    const before = structuredClone(n);
    assert.deepEqual(routeTransit(n, origin, destination, path, request), {
      mode: "none",
      moved: 0,
      roadFactor: 1,
    });
    assert.deepEqual(n, before);
  }
  for (const endpoint of [-1, N, 1.3, NaN])
    assert.equal(routeTransit(n, endpoint, destination, path, 20).moved, 0);
  assert.equal(routeTransit(n, origin, origin, path, 20).moved, 0);
});
test("planning snapshots network eligibility rather than retaining writable source references", () => {
  const { s, path, origin, destination } = railFixture(),
    n = planTransit(s, access());
  place(s, "empty", 10, 14);
  assert.equal(routeTransit(n, origin, destination, path, 20).moved, 20);
  assert.equal(
    routeTransit(planTransit(s, access()), origin, destination, path, 20).moved,
    0,
  );
});
test("rail is preferred when both a valid bus and rail route serve a journey", () => {
  const { s, path, origin, destination } = railFixture();
  place(s, "bus", 2, 17);
  place(s, "bus", 20, 17);
  const n = planTransit(s, access());
  assert.equal(routeTransit(n, origin, destination, path, 30).mode, "rail");
  assert.equal(n.busPassengers, 0);
});
test("station modules increase aggregate throughput across different rail branches without raising edge capacity", () => {
  for (const modules of [0, 1]) {
    const s = fixture();
    place(s, "station", 10, 15, { modules });
    place(s, "road", 9, 15);
    place(s, "station", 20, 13);
    place(s, "road", 20, 12);
    place(s, "station", 20, 17);
    place(s, "road", 20, 18);
    for (let x = 10; x <= 20; x++) {
      place(s, "rail", x, 14);
      place(s, "rail", x, 16);
    }
    const n = planTransit(s, access());
    assert.equal(routeTransit(n, idx(10, 15), idx(20, 13), [], 400).moved, 400);
    assert.equal(
      routeTransit(n, idx(10, 15), idx(20, 17), [], 400).moved,
      modules ? 200 : 0,
    );
    assert.equal(n.railPassengers, modules ? 600 : 400);
    assert.ok(Object.values(n.railEdgeLoad).every((load) => load <= 400));
  }
});
test("saturated rail edges do not hide an available alternate track path", () => {
  const { s, path, origin, destination } = railFixture();
  for (let x = 2; x <= 20; x++) place(s, "rail", x, 13);
  place(s, "rail", 2, 14);
  place(s, "rail", 20, 14);
  s.tiles[idx(2, 15)].modules = 1;
  s.tiles[idx(20, 15)].modules = 1;
  const n = planTransit(s, access());
  assert.equal(routeTransit(n, origin, destination, path, 400).moved, 400);
  assert.equal(routeTransit(n, origin, destination, path, 200).moved, 200);
  assert.equal(n.railPassengers, 600);
  assert.ok(n.railLoad.some((v) => v === 200));
  assert.ok(Object.values(n.railEdgeLoad).every((v) => v <= 400));
});
test("a disabled or burning bus exchange cannot provide service", () => {
  for (const fields of [{ enabled: false }, { fire: 2 }]) {
    const { s, path, origin, destination } = busFixture();
    Object.assign(s.tiles[idx(2, 15)], fields);
    const n = planTransit(s, access());
    assert.equal(routeTransit(n, origin, destination, path, 10).moved, 0);
    assert.equal(n.busPassengers, 0);
  }
});

function modeFixture(mode) {
  const f = railFixture();
  const stops = {
    streetcar: "streetcarStop",
    ferry: "ferryTerminal",
    maglev: "maglevStation",
  };
  f.s.research = { completed: ["maglev"] };
  for (const x of [2, 20]) place(f.s, stops[mode], x, 15);
  for (let x = 2; x <= 20; x++)
    place(f.s, mode === "ferry" ? "empty" : `${mode}Track`, x, 14, {
      terrain: mode === "ferry" ? "water" : "land",
    });
  return f;
}
for (const [mode, capacity] of [
  ["streetcar", 160],
  ["ferry", 200],
  ["maglev", 600],
]) {
  test(`${mode} assigns real demand on its connected network with finite shared segments and endpoints`, () => {
    const { s, origin, destination } = modeFixture(mode),
      before = structuredClone(s),
      n = planTransit(s, access());
    assert.deepEqual(routeTransit(n, origin, destination, [], capacity - 20), {
      mode,
      moved: capacity - 20,
      roadFactor: 0,
    });
    assert.equal(routeTransit(n, destination, origin, [], 50).moved, 20);
    assert.equal(routeTransit(n, origin, destination, [], 1).moved, 0);
    assert.equal(n[`${mode}Passengers`], capacity);
    assert.ok(n[`${mode}Load`].some((x) => x === capacity));
    assert.deepEqual(s, before);
  });
  test(`${mode} rejects disconnected or demolished paths and inaccessible/closed/burning endpoints`, () => {
    for (const change of [
      (s, a) => {
        s.tiles[idx(10, 14)].type = mode === "ferry" ? "landfill" : "empty";
      },
      (s, a) => {
        s.tiles[idx(2, 15)].type = "empty";
      },
      (s, a) => {
        s.tiles[idx(20, 15)].enabled = false;
      },
      (s, a) => {
        s.tiles[idx(20, 15)].fire = 1;
      },
      (s, a) => {
        a[idx(20, 15)] = false;
      },
    ]) {
      const { s, origin, destination } = modeFixture(mode),
        a = access();
      change(s, a);
      const n = planTransit(s, a);
      assert.equal(routeTransit(n, origin, destination, [], 10).moved, 0);
      assert.equal(n[`${mode}Passengers`], 0);
    }
  });
  test(`${mode} module capacity never raises a shared segment's capacity`, () => {
    const { s, origin, destination } = modeFixture(mode);
    s.tiles[idx(2, 15)].modules = s.tiles[idx(20, 15)].modules = 3;
    const n = planTransit(s, access());
    assert.equal(
      routeTransit(n, origin, destination, [], capacity * 2).moved,
      capacity,
    );
    assert.equal(routeTransit(n, origin, destination, [], 1).moved, 0);
  });
}
test("ferry terminals cannot teleport across land and a water bridge preserves navigation", () => {
  const { s, origin, destination } = modeFixture("ferry");
  s.tiles[idx(10, 14)].terrain = "land";
  assert.equal(
    routeTransit(planTransit(s, access()), origin, destination, [], 30).moved,
    0,
  );
  s.tiles[idx(10, 14)].terrain = "water";
  s.tiles[idx(10, 14)].type = "bridge";
  assert.equal(
    routeTransit(planTransit(s, access()), origin, destination, [], 30).moved,
    30,
  );
});
test("future movement requires completed maglev research, even for imported infrastructure", () => {
  const { s, origin, destination } = modeFixture("maglev");
  s.research.completed = [];
  assert.equal(
    routeTransit(planTransit(s, access()), origin, destination, [], 30).moved,
    0,
  );
  s.research.completed = ["maglev"];
  assert.equal(
    routeTransit(planTransit(s, access()), origin, destination, [], 30).moved,
    30,
  );
});
for (const [mode, capacity] of [
  ["streetcar", 160],
  ["ferry", 200],
  ["maglev", 600],
])
  test(`${mode} a single shared track or water tile cannot be reserved repeatedly beyond capacity`, () => {
    const s = fixture();
    s.research = { completed: ["maglev"] };
    const stop = {
      streetcar: "streetcarStop",
      ferry: "ferryTerminal",
      maglev: "maglevStation",
    }[mode];
    place(s, mode === "ferry" ? "empty" : `${mode}Track`, 10, 10, {
      terrain: mode === "ferry" ? "water" : "land",
    });
    place(s, stop, 9, 10, { modules: 3 });
    place(s, stop, 11, 10, { modules: 3 });
    place(s, "road", 8, 10);
    place(s, "road", 12, 10);
    const n = planTransit(s, access());
    assert.equal(
      routeTransit(n, idx(9, 10), idx(11, 10), [], capacity - 10).moved,
      capacity - 10,
    );
    assert.equal(routeTransit(n, idx(11, 10), idx(9, 10), [], 30).moved, 10);
    assert.equal(n[`${mode}Load`][idx(10, 10)], capacity);
  });
test("rail shares one track tile's 400 passenger capacity across repeated module-expanded station requests", () => {
  const s = fixture();
  place(s, "rail", 10, 10);
  place(s, "station", 9, 10, { modules: 3 });
  place(s, "station", 11, 10, { modules: 3 });
  place(s, "road", 8, 10);
  place(s, "road", 12, 10);
  const n = planTransit(s, access());
  assert.equal(routeTransit(n, idx(9, 10), idx(11, 10), [], 350).moved, 350);
  assert.equal(routeTransit(n, idx(9, 10), idx(11, 10), [], 350).moved, 50);
  assert.equal(n.railPassengers, 400);
  assert.equal(n.railLoad[idx(10, 10)], 400);
});
