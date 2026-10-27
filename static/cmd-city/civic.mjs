/** Original civic progression. All money is integer minor currency units. */
const MAX_MONTH = 1_000_000;
const MAX_CASH = 1_000_000_000_000;
const MAX_POPULATION = 1_000_000;
const TIERS = Object.freeze([
  Object.freeze({ tier: 1, population: 0, slots: 1, label: "Town government" }),
  Object.freeze({
    tier: 2,
    population: 500,
    slots: 2,
    label: "Growing municipality",
  }),
  Object.freeze({
    tier: 3,
    population: 1500,
    slots: 3,
    label: "City government",
  }),
  Object.freeze({
    tier: 4,
    population: 5000,
    slots: 4,
    label: "Metropolitan government",
  }),
  Object.freeze({
    tier: 5,
    population: 15000,
    slots: 6,
    label: "Regional capital",
  }),
]);
export const DEPARTMENTS = Object.freeze({
  utilities: Object.freeze({ label: "Utilities", cost: 200000, threshold: 0 }),
  safety: Object.freeze({ label: "Safety", cost: 200000, threshold: 0 }),
  finance: Object.freeze({ label: "Finance", cost: 250000, threshold: 500 }),
  education: Object.freeze({
    label: "Education",
    cost: 250000,
    threshold: 500,
  }),
  transportation: Object.freeze({
    label: "Transportation",
    cost: 350000,
    threshold: 1500,
  }),
  tourism: Object.freeze({ label: "Tourism", cost: 350000, threshold: 1500 }),
});
export const REQUESTS = Object.freeze({
  housing: Object.freeze({
    title: "A place to call home",
    description: "Reach 600 residents before the deadline.",
    target: 600,
    reward: 75000,
    duration: 12,
    threshold: 0,
    kind: "population",
  }),
  balancedBooks: Object.freeze({
    title: "Keep the books balanced",
    description:
      "Book three consecutive months with a positive operating balance.",
    target: 3,
    reward: 100000,
    duration: 8,
    threshold: 0,
    kind: "budget",
  }),
  publicHealth: Object.freeze({
    title: "A healthier city",
    description:
      "Maintain a health indicator of at least 75 with 200 residents for three consecutive months.",
    target: 3,
    reward: 120000,
    duration: 12,
    threshold: 200,
    kind: "health",
  }),
  researchDrive: Object.freeze({
    title: "Invest in the next idea",
    description: "Accumulate 120 unspent research points.",
    target: 120,
    reward: 150000,
    duration: 18,
    threshold: 500,
    kind: "research",
  }),
  cleanServices: Object.freeze({
    title: "A city that works",
    description:
      "Meet power, water, sewage and waste demand for 300 residents during three consecutive months.",
    target: 3,
    reward: 150000,
    duration: 12,
    threshold: 300,
    kind: "utilities",
  }),
});
export const ACHIEVEMENTS = Object.freeze({
  firstResidents: Object.freeze({
    title: "A town begins",
    description: "Reach 100 residents.",
  }),
  balancedYear: Object.freeze({
    title: "A balanced year",
    description: "Book twelve consecutive positive operating months.",
  }),
  educated: Object.freeze({
    title: "A learning city",
    description:
      "Serve 500 residents with an education coverage indicator of at least 75.",
  }),
  networked: Object.freeze({
    title: "Connected workers",
    description:
      "Employ 500 residents while an actual bus or rail trip is assigned.",
  }),
  regionalPower: Object.freeze({
    title: "Shared clean power",
    description: "Receive completed regional renewable power support.",
  }),
  metropolis: Object.freeze({
    title: "A metropolis grows",
    description: "Reach 5,000 residents.",
  }),
  researcher: Object.freeze({
    title: "Research in practice",
    description: "Complete two research topics.",
  }),
});
export const TUTORIAL_STEPS = Object.freeze([
  Object.freeze({
    title: "Connect the city",
    instruction: "Extend an open road from the regional gateway.",
  }),
  Object.freeze({
    title: "Make room for homes",
    instruction: "Zone homes beside a gateway-connected road.",
  }),
  Object.freeze({
    title: "Supply the essentials",
    instruction: "Provide enough connected power and water for current demand.",
  }),
  Object.freeze({
    title: "Create reachable work",
    instruction: "Provide at least one reachable job position.",
  }),
  Object.freeze({
    title: "Fund a public service",
    instruction:
      "Connect an open school, clinic, fire station or police station to a supplied neighborhood.",
  }),
  Object.freeze({
    title: "Observe a month",
    instruction: "Run the simulation until a complete month is recorded.",
  }),
  Object.freeze({
    title: "Read the balance",
    instruction: "Book a month with a nonnegative operating balance.",
  }),
  Object.freeze({
    title: "Open Town Hall",
    instruction: "Open a supplied Town Hall connected to the regional gateway.",
  }),
]);
const GATES = Object.freeze({
  university: Object.freeze(["education"]),
  academy: Object.freeze(["education"]),
  hospital: Object.freeze(["safety"]),
  waterFilter: Object.freeze(["utilities"]),
  airport: Object.freeze(["transportation"]),
  casino: Object.freeze(["tourism"]),
  nuclear: Object.freeze(["utilities", "education"]),
});
const STATUS = [
  "offered",
  "active",
  "completed",
  "claimed",
  "rejected",
  "cancelled",
  "expired",
];
// Catalog IDs are primitive strings; never let property-key coercion accept arrays or boxed IDs.
const own = (o, key) => typeof key === "string" && Object.hasOwn(o, key);
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const ok = (message) => ({ ok: true, message });
const fail = (message) => ({ ok: false, message });
const invalid = () => {
  throw Error("Invalid CMD City civic version 1 state.");
};
const plain = (value) =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
function exactKeys(value, keys) {
  if (
    !plain(value) ||
    Object.keys(value).length !== keys.length ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    invalid();
}
function tierFor(peak) {
  return TIERS.findLast((tier) => peak >= tier.population);
}
function newRequest() {
  return {
    status: "offered",
    acceptedMonth: null,
    deadlineMonth: null,
    completedMonth: null,
    claimedMonth: null,
    progress: 0,
  };
}

export function createCivic({ sandbox = false, month = 0 } = {}) {
  if (typeof sandbox !== "boolean" || !integer(month, 0, MAX_MONTH)) invalid();
  return {
    version: 1,
    eligible: !sandbox,
    peakPopulation: 0,
    tier: 1,
    lastMonth: month,
    departments: [],
    requests: Object.fromEntries(
      Object.keys(REQUESTS).map((id) => [id, newRequest()]),
    ),
    tutorial: { step: 0, completed: false, dismissed: false, replays: 0 },
    achievements: [],
  };
}

export function validateCivic(value, cityMonth, sandbox) {
  if (!integer(cityMonth, 0, MAX_MONTH) || typeof sandbox !== "boolean")
    invalid();
  exactKeys(value, [
    "version",
    "eligible",
    "peakPopulation",
    "tier",
    "lastMonth",
    "departments",
    "requests",
    "tutorial",
    "achievements",
  ]);
  if (
    value.version !== 1 ||
    typeof value.eligible !== "boolean" ||
    !integer(value.peakPopulation, 0, MAX_POPULATION) ||
    value.tier !== tierFor(value.peakPopulation).tier ||
    !integer(value.lastMonth, Math.max(0, cityMonth - 1), cityMonth) ||
    (sandbox && value.eligible)
  )
    invalid();
  if (
    !Array.isArray(value.departments) ||
    value.departments.length > tierFor(value.peakPopulation).slots ||
    new Set(value.departments).size !== value.departments.length ||
    value.departments.some(
      (id) =>
        !own(DEPARTMENTS, id) ||
        DEPARTMENTS[id].threshold > value.peakPopulation,
    )
  )
    invalid();
  exactKeys(value.requests, Object.keys(REQUESTS));
  for (const [id, definition] of Object.entries(REQUESTS)) {
    const r = value.requests[id];
    exactKeys(r, [
      "status",
      "acceptedMonth",
      "deadlineMonth",
      "completedMonth",
      "claimedMonth",
      "progress",
    ]);
    if (
      !STATUS.includes(r.status) ||
      !integer(r.progress, 0, definition.target)
    )
      invalid();
    if (["offered", "rejected"].includes(r.status)) {
      if (
        r.progress !== 0 ||
        r.acceptedMonth !== null ||
        r.deadlineMonth !== null ||
        r.completedMonth !== null ||
        r.claimedMonth !== null
      )
        invalid();
      continue;
    }
    if (
      !integer(r.acceptedMonth, 0, value.lastMonth) ||
      r.deadlineMonth !== r.acceptedMonth + definition.duration ||
      r.deadlineMonth > MAX_MONTH
    )
      invalid();
    if (["completed", "claimed"].includes(r.status)) {
      if (
        r.progress !== definition.target ||
        !integer(
          r.completedMonth,
          r.acceptedMonth,
          Math.min(r.deadlineMonth, value.lastMonth),
        )
      )
        invalid();
      if (
        r.status === "claimed"
          ? !integer(r.claimedMonth, r.completedMonth, value.lastMonth)
          : r.claimedMonth !== null
      )
        invalid();
    } else {
      if (
        r.progress >= definition.target ||
        r.completedMonth !== null ||
        r.claimedMonth !== null
      )
        invalid();
      if (r.status === "active" && r.deadlineMonth <= value.lastMonth)
        invalid();
      if (r.status === "expired" && r.deadlineMonth > value.lastMonth)
        invalid();
    }
  }
  exactKeys(value.tutorial, ["step", "completed", "dismissed", "replays"]);
  const tutorial = value.tutorial;
  if (
    !integer(tutorial.step, 0, TUTORIAL_STEPS.length) ||
    tutorial.completed !== (tutorial.step === TUTORIAL_STEPS.length) ||
    typeof tutorial.dismissed !== "boolean" ||
    !integer(tutorial.replays, 0, MAX_MONTH)
  )
    invalid();
  if (
    !Array.isArray(value.achievements) ||
    value.achievements.length > Object.keys(ACHIEVEMENTS).length ||
    new Set(value.achievements).size !== value.achievements.length ||
    value.achievements.some((id) => !own(ACHIEVEMENTS, id)) ||
    (!value.eligible && value.achievements.length)
  )
    invalid();
  if (
    value.achievements.includes("firstResidents") &&
    value.peakPopulation < 100
  )
    invalid();
  if (value.achievements.includes("metropolis") && value.peakPopulation < 5000)
    invalid();
  return true;
}

function observation(city, metrics) {
  if (
    !integer(city.month, 0, MAX_MONTH) ||
    !integer(city.cash, -MAX_CASH, MAX_CASH) ||
    typeof city.sandbox !== "boolean" ||
    !Array.isArray(city.tiles) ||
    !plain(metrics) ||
    !integer(metrics.population, 0, MAX_POPULATION) ||
    !Array.isArray(metrics.access) ||
    metrics.access.length !== city.tiles.length
  )
    throw Error(
      "Civic progress requires a valid authoritative city observation.",
    );
  if (
    !integer(city.research?.points, 0, 1_000_000) ||
    !Array.isArray(city.research?.completed) ||
    city.research.completed.length > 4 ||
    new Set(city.research.completed).size !== city.research.completed.length ||
    city.research.completed.some((id) => typeof id !== "string")
  )
    throw Error("Invalid civic research observation.");
  for (const key of ["education", "health", "crime"])
    if (
      own(metrics, key) &&
      (!Number.isFinite(metrics[key]) || metrics[key] < 0 || metrics[key] > 100)
    )
      throw Error("Invalid civic indicator.");
  for (const key of ["jobs", "employed", "busPassengers", "railPassengers"])
    if (own(metrics, key) && !integer(metrics[key], 0, MAX_POPULATION))
      throw Error("Invalid civic count.");
  for (const name of ["power", "water", "sewage", "waste"]) {
    const u = metrics.utilities?.[name];
    if (
      !plain(u) ||
      !Number.isFinite(u.supply) ||
      !Number.isFinite(u.demand) ||
      u.supply < 0 ||
      u.demand < 0 ||
      !Number.isFinite(u.ratio) ||
      u.ratio < 0 ||
      u.ratio > 1
    )
      throw Error("Invalid civic utility observation.");
  }
  return metrics;
}
function supplyReady(metrics, threshold = 0.9) {
  return ["power", "water"].every(
    (name) =>
      metrics.utilities[name].supply > 0 &&
      metrics.utilities[name].ratio >= threshold,
  );
}
function gatewayReady(city, metrics) {
  const gateway = 16 * city.width;
  return (
    ["road", "avenue"].includes(city.tiles[gateway]?.type) &&
    metrics.access[gateway] === true
  );
}
function townHall(city, metrics) {
  if (!gatewayReady(city, metrics))
    return { ready: false, reason: "Connect an intact regional road gateway." };
  if (!supplyReady(metrics))
    return {
      ready: false,
      reason: "Town Hall requires positive supplied power and water.",
    };
  const hall = city.tiles.some(
    (tile, index) =>
      tile.type === "townHall" &&
      tile.enabled !== false &&
      tile.fire === 0 &&
      metrics.access[index] === true,
  );
  return hall
    ? { ready: true, reason: "" }
    : {
        ready: false,
        reason: "Open a non-burning Town Hall on a gateway-connected road.",
      };
}
function government(city, metrics) {
  const peakPopulation = Math.max(
      city.civic.peakPopulation,
      metrics.population,
    ),
    tier = tierFor(peakPopulation),
    hall = townHall(city, metrics);
  return {
    tier: tier.tier,
    label: tier.label,
    peakPopulation,
    population: metrics.population,
    slots: tier.slots,
    slotsRemaining: tier.slots - city.civic.departments.length,
    townHallReady: hall.ready,
    townHallReason: hall.reason,
    nextPopulation:
      TIERS.find((item) => item.population > peakPopulation)?.population ??
      null,
  };
}
function updateGovernment(city, metrics) {
  city.civic.peakPopulation = Math.max(
    city.civic.peakPopulation,
    metrics.population,
  );
  city.civic.tier = tierFor(city.civic.peakPopulation).tier;
}
function departmentReason(
  city,
  id,
  metrics,
  report = government(city, metrics),
) {
  const d = DEPARTMENTS[id];
  if (city.civic.departments.includes(id))
    return "Department already installed.";
  if (!report.townHallReady) return report.townHallReason;
  if (report.peakPopulation < d.threshold)
    return `Reach a peak population of ${d.threshold.toLocaleString("en-US")}.`;
  if (report.slotsRemaining <= 0)
    return "All department slots are occupied; reach the next government tier.";
  if (city.cash < d.cost) return "Insufficient treasury for this department.";
  return "";
}
function bookedMonth(city) {
  const row = city.history?.at(-1);
  return row && row.month === city.month && Number.isSafeInteger(row.net)
    ? row
    : null;
}
function absoluteProgress(city, metrics, id) {
  return id === "housing"
    ? metrics.population
    : id === "researchDrive"
      ? (city.research?.points ?? 0)
      : null;
}
function progressRequest(city, metrics, id, monthly) {
  const definition = REQUESTS[id],
    request = city.civic.requests[id],
    absolute = absoluteProgress(city, metrics, id);
  if (absolute !== null)
    request.progress = Math.min(
      definition.target,
      Math.max(0, Math.floor(absolute)),
    );
  else if (monthly) {
    const qualifies =
      id === "balancedBooks"
        ? (bookedMonth(city)?.net ?? 0) > 0
        : id === "publicHealth"
          ? metrics.population >= 200 && (metrics.health ?? 0) >= 75
          : metrics.population >= 300 &&
            ["power", "water", "sewage", "waste"].every(
              (name) =>
                metrics.utilities[name].supply > 0 &&
                metrics.utilities[name].ratio === 1,
            );
    request.progress = qualifies
      ? Math.min(definition.target, request.progress + 1)
      : 0;
  }
  if (request.progress === definition.target) {
    request.status = "completed";
    request.completedMonth = city.month;
  } else if (monthly && city.month >= request.deadlineMonth)
    request.status = "expired";
}
function tutorialSatisfied(city, metrics, step) {
  if (step === 0)
    return (
      city.tiles.filter(
        (tile, i) =>
          ["road", "avenue", "bridge"].includes(tile.type) &&
          tile.enabled !== false &&
          metrics.access[i] === true,
      ).length >= 2
    );
  if (step === 1)
    return city.tiles.some(
      (tile, i) =>
        ["residential", "tower"].includes(tile.type) &&
        metrics.access[i] === true,
    );
  if (step === 2) return supplyReady(metrics, 1);
  if (step === 3) return (metrics.jobs ?? 0) > 0;
  if (step === 4)
    return (
      supplyReady(metrics) &&
      city.tiles.some(
        (tile, i) =>
          ["school", "clinic", "fire", "police"].includes(tile.type) &&
          tile.enabled !== false &&
          tile.fire === 0 &&
          metrics.access[i] === true,
      )
    );
  if (step === 5) return city.month > 0 && bookedMonth(city) !== null;
  if (step === 6) return (bookedMonth(city)?.net ?? -1) >= 0;
  if (step === 7) return townHall(city, metrics).ready;
  return false;
}
function progressTutorial(city, metrics) {
  const t = city.civic.tutorial;
  if (
    !t.dismissed &&
    !t.completed &&
    tutorialSatisfied(city, metrics, t.step)
  ) {
    t.step++;
    t.completed = t.step === TUTORIAL_STEPS.length;
  }
}
function earnedAchievement(city, metrics, id) {
  if (id === "firstResidents") return city.civic.peakPopulation >= 100;
  if (id === "metropolis") return city.civic.peakPopulation >= 5000;
  if (id === "educated")
    return metrics.population >= 500 && (metrics.education ?? 0) >= 75;
  if (id === "networked")
    return (
      (metrics.employed ?? 0) >= 500 &&
      (metrics.busPassengers ?? 0) + (metrics.railPassengers ?? 0) > 0
    );
  if (id === "regionalPower") return city.regionalPower > 0;
  if (id === "researcher") return (city.research?.completed?.length ?? 0) >= 2;
  const rows = city.history?.slice(-12) ?? [];
  return (
    rows.length === 12 &&
    rows.every(
      (row, index) =>
        row.month === city.month - 11 + index &&
        Number.isSafeInteger(row.net) &&
        row.net > 0,
    )
  );
}

export function civicReport(city, metrics) {
  observation(city, metrics);
  validateCivic(city.civic, city.month, city.sandbox);
  const gov = government(city, metrics),
    eligible = city.civic.eligible && !city.sandbox;
  const departments = Object.entries(DEPARTMENTS).map(([id, d]) => {
    const reason = departmentReason(city, id, metrics, gov);
    return {
      id,
      ...d,
      installed: city.civic.departments.includes(id),
      available: !reason,
      reason,
    };
  });
  const requests = Object.entries(REQUESTS).map(([id, d]) => {
    const r = city.civic.requests[id];
    let reason =
      r.status !== "offered"
        ? `Request is ${r.status}.`
        : metrics.population < d.threshold
          ? `Reach ${d.threshold} residents before accepting.`
          : city.month + d.duration > MAX_MONTH
            ? "Insufficient simulation time remains for this request."
            : "";
    const canClaim =
      r.status === "completed" && city.cash <= MAX_CASH - d.reward;
    if (r.status === "completed")
      reason = canClaim
        ? "Ready to claim its one-time reward."
        : "Spend down the treasury before claiming this reward.";
    return {
      id,
      title: d.title,
      description: d.description,
      status: r.status,
      progress: r.progress,
      target: d.target,
      reward: d.reward,
      deadlineMonth: r.deadlineMonth,
      remainingMonths:
        r.deadlineMonth === null
          ? null
          : Math.max(0, r.deadlineMonth - city.month),
      canAccept: !reason,
      canClaim,
      reason,
    };
  });
  const t = city.civic.tutorial,
    step = TUTORIAL_STEPS[t.step];
  return {
    eligible,
    government: gov,
    departments,
    requests,
    tutorial: {
      ...t,
      title: step?.title ?? "Tutorial complete",
      instruction:
        step?.instruction ??
        "Continue governing, or explicitly replay the guide.",
      progress: t.completed
        ? 1
        : Number(tutorialSatisfied(city, metrics, t.step)),
      target: 1,
    },
    achievements: Object.entries(ACHIEVEMENTS).map(([id, d]) => ({
      id,
      ...d,
      earned: city.civic.achievements.includes(id),
      eligible,
    })),
  };
}

export function civicAction(city, action, metrics) {
  if (!plain(action) || !own(action, "type"))
    return fail("Choose a valid civic action.");
  try {
    observation(city, metrics);
    validateCivic(city.civic, city.month, city.sandbox);
  } catch {
    return fail("Civic state or observation is invalid.");
  }
  if (city.civic.lastMonth !== city.month)
    return fail("Complete the current civic month before taking an action.");
  const finish = (message) => {
    updateGovernment(city, metrics);
    return ok(message);
  };
  if (action.type === "department") {
    if (
      Object.keys(action).length !== 2 ||
      !own(action, "department") ||
      !own(DEPARTMENTS, action.department)
    )
      return fail("Choose a known department.");
    const reason = departmentReason(city, action.department, metrics);
    if (reason) return fail(reason);
    const definition = DEPARTMENTS[action.department];
    city.cash -= definition.cost;
    city.civic.departments.push(action.department);
    return finish(
      `${definition.label} installed for ${(definition.cost / 100).toLocaleString("en-US")}. One government slot is occupied.`,
    );
  }
  if (action.type === "redeemBond") {
    if (
      Object.keys(action).length !== 2 ||
      !own(action, "index") ||
      !Array.isArray(city.bonds) ||
      !integer(action.index, 0, city.bonds.length - 1)
    )
      return fail("Choose an existing city bond.");
    if (!city.civic.departments.includes("finance"))
      return fail("Install Finance before redeeming a bond early.");
    const hall = townHall(city, metrics);
    if (!hall.ready) return fail(hall.reason);
    const bond = city.bonds[action.index];
    if (
      !plain(bond) ||
      !integer(bond.balance, 1, 2_200_000) ||
      bond.payment !== 91667 ||
      !integer(bond.months, 1, 24) ||
      bond.balance > bond.payment * bond.months
    )
      return fail("The selected bond obligation is invalid.");
    if (city.cash < bond.balance)
      return fail("The treasury cannot cover this bond remaining balance.");
    const balance = bond.balance;
    city.cash -= balance;
    city.bonds.splice(action.index, 1);
    return finish(
      `Bond redeemed for ${(balance / 100).toLocaleString("en-US")}. This obligation is removed; past operating history is unchanged.`,
    );
  }
  if (action.type === "request") {
    if (
      Object.keys(action).length !== 3 ||
      !own(action, "id") ||
      !own(action, "operation") ||
      !own(REQUESTS, action.id)
    )
      return fail("Choose a known request and operation.");
    const r = city.civic.requests[action.id],
      d = REQUESTS[action.id];
    if (action.operation === "accept") {
      if (r.status !== "offered")
        return fail("This request cannot be accepted again.");
      if (metrics.population < d.threshold)
        return fail(`Reach ${d.threshold} residents before accepting.`);
      if (city.month + d.duration > MAX_MONTH)
        return fail("Insufficient simulation time remains for this request.");
      r.status = "active";
      r.acceptedMonth = city.month;
      r.deadlineMonth = city.month + d.duration;
      progressRequest(city, metrics, action.id, false);
      return finish(`${d.title} accepted. Deadline: month ${r.deadlineMonth}.`);
    }
    if (action.operation === "reject") {
      if (r.status !== "offered")
        return fail("Only an offered request can be rejected.");
      r.status = "rejected";
      return finish("Request rejected. It cannot be reaccepted.");
    }
    if (action.operation === "cancel") {
      if (r.status !== "active")
        return fail("Only an active request can be cancelled.");
      r.status = "cancelled";
      return finish("Request cancelled without a reward.");
    }
    if (action.operation === "claim") {
      if (r.status !== "completed")
        return fail("Complete this request before claiming its reward.");
      if (city.cash > MAX_CASH - d.reward)
        return fail("The reward would exceed the supported treasury limit.");
      city.cash += d.reward;
      r.status = "claimed";
      r.claimedMonth = city.month;
      return finish(
        `Claimed the one-time ${(d.reward / 100).toLocaleString("en-US")} reward. Monthly operating history is unchanged.`,
      );
    }
    return fail("Choose accept, reject, cancel or claim.");
  }
  if (action.type === "tutorial") {
    if (Object.keys(action).length !== 2 || !own(action, "operation"))
      return fail("Choose a tutorial operation.");
    const t = city.civic.tutorial;
    if (action.operation === "check") {
      if (
        t.completed ||
        t.dismissed ||
        !tutorialSatisfied(city, metrics, t.step)
      )
        return fail("Meet the current tutorial objective before continuing.");
      progressTutorial(city, metrics);
      return finish(
        t.completed
          ? "Tutorial completed. No money is awarded."
          : "Objective confirmed. Continue with the next step.",
      );
    }
    if (action.operation === "replay") {
      if (t.replays >= MAX_MONTH)
        return fail("The supported tutorial replay limit has been reached.");
      t.step = 0;
      t.completed = false;
      t.dismissed = false;
      t.replays++;
      return finish(
        "Tutorial replay started. Existing city, achievements and finances are preserved.",
      );
    }
    if (action.operation === "dismiss") {
      t.dismissed = true;
      return finish("Tutorial hidden; progress is preserved.");
    }
    if (action.operation === "resume") {
      t.dismissed = false;
      return finish("Tutorial resumed.");
    }
    return fail("Choose check, replay, dismiss or resume.");
  }
  return fail("Unknown civic action.");
}

export function advanceCivic(city, metrics) {
  observation(city, metrics);
  validateCivic(city.civic, city.month, city.sandbox);
  if (city.civic.lastMonth === city.month) return civicReport(city, metrics);
  if (city.month !== city.civic.lastMonth + 1 || !bookedMonth(city))
    throw Error("Civic progress requires the next booked city month.");
  updateGovernment(city, metrics);
  for (const id of Object.keys(REQUESTS))
    if (city.civic.requests[id].status === "active")
      progressRequest(city, metrics, id, true);
  progressTutorial(city, metrics);
  if (city.civic.eligible && !city.sandbox)
    for (const id of Object.keys(ACHIEVEMENTS))
      if (
        !city.civic.achievements.includes(id) &&
        earnedAchievement(city, metrics, id)
      )
        city.civic.achievements.push(id);
  city.civic.lastMonth = city.month;
  return civicReport(city, metrics);
}

export function buildPermission(city, tool, metrics) {
  if (typeof tool !== "string" || Object.hasOwn(Object.prototype, tool))
    return fail("Choose a valid construction tool.");
  if (city.sandbox === true)
    return ok(
      "Sandbox bypasses government construction requirements; achievements remain ineligible.",
    );
  if (tool !== "townHall" && !own(GATES, tool))
    return ok("No government department is required for this construction.");
  try {
    observation(city, metrics);
    validateCivic(city.civic, city.month, city.sandbox);
  } catch {
    return fail(
      "Valid civic and utility data are required for this construction.",
    );
  }
  if (tool === "townHall") {
    if (!gatewayReady(city, metrics))
      return fail(
        "Connect an intact regional road gateway before opening Town Hall.",
      );
    if (!supplyReady(metrics, 1))
      return fail(
        "Supply complete working power and water before opening Town Hall.",
      );
    return ok(
      "Government services may be constructed beside a gateway-connected road.",
    );
  }
  const missing = GATES[tool].filter(
    (id) => !city.civic.departments.includes(id),
  );
  if (missing.length)
    return fail(
      `Install ${missing.map((id) => DEPARTMENTS[id].label).join(" and ")} before new construction of this facility.`,
    );
  if (
    tool === "nuclear" &&
    Math.max(city.civic.peakPopulation, metrics.population) < 5000
  )
    return fail("Nuclear construction requires a peak population of 5,000.");
  return ok(
    "Government construction requirements are satisfied. Existing research requirements still apply.",
  );
}
