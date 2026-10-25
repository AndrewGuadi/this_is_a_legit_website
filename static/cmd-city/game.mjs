import { TOOLS, RESEARCH, RESOURCES, money } from "./content.mjs";
import {
  createCity,
  measure,
  applyAction,
  advanceMonth,
  inspectTile,
} from "./core.mjs";
import { parseCity } from "./save.mjs";
import {
  createRegion,
  regionAction,
  advanceRegion,
  serializeRegion,
  parseRegion,
} from "./region.mjs";
import { createClock, setRunning, setSpeed, advanceClock } from "./clock.mjs";
import { createView } from "./view.mjs";
import { createCivic, REQUESTS } from "./civic.mjs";

const $ = (id) => document.getElementById(id);
const STORAGE = "cmd-city-save-v1",
  OPT_IN = "cmd-city-local-opt-in-v1";
const whole = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const percent = (n) => `${Math.round(Number(n) || 0)}%`;
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const glyphs = {
  road: "╋",
  avenue: "═",
  bridge: "∩",
  residential: "R",
  commercial: "C",
  industrial: "I",
  wind: "✳",
  coalPlant: "▥",
  water: "◉",
  sewage: "≋",
  landfill: "▧",
  recycling: "↻",
  park: "♧",
  school: "▤",
  university: "⌂",
  clinic: "+",
  hospital: "+",
  fire: "◇",
  police: "⬡",
  bus: "▰",
  rail: "╫",
  station: "▱",
  port: "⚓",
  airport: "↗",
  mine: "◒",
  oilWell: "⌁",
  factory: "▥",
  trade: "⇄",
  tourism: "✧",
  casino: "♢",
  academy: "⌬",
  tower: "▤",
  townHall: "▥",
  waterFilter: "◈",
  cleanup: "↻",
  nuclear: "☢",
};
const overlays = {
  none: "CITY VIEW · Roads connect homes, jobs and services.",
  access:
    "ROAD ACCESS · Green reaches the regional gateway. Orange is disconnected.",
  power: "ELECTRICITY · Connected capacity serves occupied demand.",
  water: "WATER · Connected pumps draw from a finite aquifer.",
  pollution: "AIR POLLUTION · Legacy view of persistent wind-carried air contamination.",
  air: "AIR POLLUTION · Wind carries persistent air contamination across the map.",
  ground: "GROUND CONTAMINATION · Soil effects can remain after demolition.",
  radiation: "RADIATION · Purple indicates contamination; strong exposure restricts new development.",
  landValue: "LAND VALUE · Brighter green indicates higher land value.",
  traffic:
    "ROAD TRAFFIC · Assigned commutes, from green to orange at capacity.",
  services:
    "PUBLIC SERVICES · Blue shows local coverage from an operating service.",
};
let region = createRegion(),
  city = region.cities[region.active].state,
  metrics = measure(city),
  selected = { x: 5, y: 16 },
  hover = null,
  tool = "inspect",
  overlay = "none";
let running = false,
  saving = false,
  dirty = true,
  pointer = null,
  previousFrame = null,
  pendingConfirm = null;
const clock = createClock();
const canvas = $("city-map");
let view;

function message(text, error = false) {
  $("city-message").textContent = text;
  $("city-message").classList.toggle("error", error);
}
function storageNote(text) {
  $("storage-note").textContent = text;
}
function storeCity() {
  if (!saving) return false;
  try {
    localStorage.setItem(STORAGE, serializeRegion(region));
    localStorage.setItem(OPT_IN, "yes");
    storageNote(
      "Saved in this browser. Nothing is sent to a server. Export a copy for another device.",
    );
    return true;
  } catch {
    storageNote(
      "Local storage is unavailable or saving failed. Keep this page open or export your city.",
    );
    return false;
  }
}
function pause(reason = "") {
  running = false;
  setRunning(clock, false);
  previousFrame = null;
  updateRunState();
  if (reason) message(reason);
}
function updateRunState() {
  $("city-game").dataset.state = running ? "playing" : "paused";
  $("run-state").textContent = running ? "RUNNING" : "PAUSED";
  $("simulation-action").textContent = running
    ? "Pause simulation"
    : "Resume simulation";
  $("simulation-action").disabled = false;
}
function toggleRun() {
  if ($("city-dialog").open) return;
  running = !running;
  setRunning(clock, running);
  previousFrame = null;
  updateRunState();
  message(
    running
      ? "Simulation running. Each game month books growth, services and the budget."
      : "Simulation paused. Inspect and build at your own pace.",
  );
}
function list(container, entries, tag = "li") {
  container.replaceChildren(
    ...entries.map((text) => {
      const node = document.createElement(tag);
      node.textContent = text;
      return node;
    }),
  );
}
function ledger(container, entries) {
  container.replaceChildren(
    ...entries.flatMap(([label, value, total]) => {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      if (total) {
        dt.className = "total";
        dd.className = "total";
      }
      return [dt, dd];
    }),
  );
}
function setInput(id, value) {
  const el = $(id);
  if (document.activeElement !== el) el.value = value;
}
function chooseTool(id) {
  tool = id;
  dirty = true;
  $("inspect-tool").setAttribute("aria-pressed", String(id === "inspect"));
  $("bulldoze-tool").setAttribute("aria-pressed", String(id === "bulldoze"));
  for (const button of document.querySelectorAll("[data-tool]"))
    button.setAttribute("aria-pressed", String(button.dataset.tool === id));
  const strong = document.createElement("strong"),
    copy = document.createElement("p");
  strong.textContent =
    id === "inspect"
      ? "Inspect"
      : id === "bulldoze"
        ? "Bulldoze"
        : TOOLS[id].label;
  copy.textContent =
    id === "inspect"
      ? "Select any tile to understand what is working and what needs attention. Drag the map to look around."
      : id === "bulldoze"
        ? "Select a structure to decommission it. This has a fee and no construction refund; confirm before demolition."
        : TOOLS[id].description;
  $("tool-info").replaceChildren(strong, copy);
  if (TOOLS[id]) {
    const cost = document.createElement("p");
    cost.className = "cost-line";
    cost.textContent = `${money(TOOLS[id].cost)} to build · ${money(TOOLS[id].upkeep)}/month`;
    $("tool-info").append(cost);
  }
}
function renderPalette() {
  const group = $("tool-group").value;
  $("tool-palette").replaceChildren(
    ...Object.entries(TOOLS)
      .filter(([, d]) => d.group === group)
      .map(([id, d]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tool-button";
        button.dataset.tool = id;
        button.setAttribute("aria-pressed", String(tool === id));
        const symbol = document.createElement("span");
        symbol.className = `tool-icon ${id}`;
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = glyphs[id] || "◇";
        const copy = document.createElement("span");
        copy.className = "tool-copy";
        const name = document.createElement("span");
        name.className = "tool-name";
        name.textContent = d.label;
        const cost = document.createElement("span");
        cost.className = "tool-cost";
        cost.textContent = `${money(d.cost)} · ${money(d.upkeep)}/mo`;
        copy.append(name, cost);
        button.append(symbol, copy);
        button.addEventListener("click", () => chooseTool(id));
        return button;
      }),
  );
}
function updateInspector() {
  const info = inspectTile(city, selected.x, selected.y, metrics);
  $("tile-title").textContent = info.title;
  $("tile-description").textContent =
    `Tile ${selected.x}, ${selected.y} · ${info.operating ? "Gateway connected / active" : info.connected ? "Gateway connected" : "No regional access"}`;
  list($("tile-lines"), info.lines);
  if (info.blockers.length) list($("tile-blockers"), info.blockers, "p");
  else {
    const p = document.createElement("p");
    p.className = "healthy";
    p.textContent = "No reported growth blockers on this tile.";
    $("tile-blockers").replaceChildren(p);
  }
  const tile = city.tiles[selected.y * city.width + selected.x];
  $("upgrade-tile").disabled = !TOOLS[tile.type];
  setInput("tile-x", selected.x);
  setInput("tile-y", selected.y);
  $("coordinate-label").textContent =
    `TILE ${String(selected.x).padStart(2, "0")} / ${String(selected.y).padStart(2, "0")}`;
  // The optional facility closure action is exposed only if the core recognizes it.
  const toggle = $("toggle-facility");
  if (toggle) {
    toggle.disabled =
      !TOOLS[tile.type] ||
      ["road", "avenue", "bridge", "rail"].includes(tile.type);
    toggle.textContent =
      tile.enabled === false
        ? "Reopen selected facility"
        : "Suspend selected facility";
  }
  updateEnvironmentSelection();
}
function renderUtilities() {
  const labels = {
    power: "Electricity",
    water: "Water",
    sewage: "Sewage",
    waste: "Waste",
  };
  $("utilities").replaceChildren(
    ...Object.entries(metrics.utilities).map(([id, item]) => {
      const row = document.createElement("div");
      row.className = "utility-line";
      const name = document.createElement("strong");
      name.textContent = labels[id] || id;
      const total = document.createElement("span");
      total.textContent = `${whole(item.demand)} / ${whole(item.supply)}`;
      total.title = "Monthly demand / connected capacity";
      row.append(name, total);
      if (item.ratio < 1) {
        const warning = document.createElement("small");
        warning.textContent = `${percent(item.ratio * 100)} of demand served`;
        row.append(warning);
      }
      return row;
    }),
  );
}
function textNode(tag, text, className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function initializeProgression() {
  // These controls are created once. Monthly report refreshes preserve focused
  // inputs/buttons instead of replacing an entire interactive subtree.
  const departmentDescriptions = {
    utilities: "Permits new water filtration facilities.",
    safety: "Permits new hospitals.",
    finance: "Permits early bond redemption from an operating Town Hall.",
    education: "Permits new universities and Civic Research Institutes.",
    transportation: "Permits new air terminals.",
    tourism: "Permits new entertainment districts.",
  };
  for (const department of metrics.civic.departments) {
    const card = textNode("article", "", "department-card");
    card.id = `department-${department.id}`;
    const heading = textNode("h4", department.label);
    const price = textNode("span", money(department.cost), "department-price");
    const reason = textNode("p", "", "fine-print");
    reason.id = `department-${department.id}-reason`;
    const button = textNode("button", `Install ${department.label}`);
    button.type = "button";
    button.id = `install-${department.id}`;
    button.setAttribute("aria-describedby", reason.id);
    button.addEventListener("click", () => act({type:"department", department:department.id}));
    const purpose=textNode("p",departmentDescriptions[department.id],"department-purpose");
    card.append(heading, price, purpose, reason, button);
    $("department-cards").append(card);
  }
  for (const request of metrics.civic.requests) {
    const card = textNode("article", "", "request-card");
    card.id = `request-${request.id}`;
    const heading = textNode("h4", request.title); heading.tabIndex = -1; heading.id=`request-${request.id}-title`;
    const description = textNode("p", request.description, "request-description");
    const status = textNode("span", "", "civic-status"); status.id = `request-${request.id}-status`;
    const progress = document.createElement("progress"); progress.max = request.target; progress.value = 0;
    progress.id = `request-${request.id}-progress`; progress.setAttribute("aria-label", `${request.title} progress`);
    const detail = textNode("p", "", "request-detail"); detail.id = `request-${request.id}-detail`;
    const reason = textNode("p", "", "fine-print"); reason.id = `request-${request.id}-reason`;
    const actions = textNode("div", "", "civic-actions");
    for (const [operation, label] of [["accept","Accept request"],["reject","Reject request"],["cancel","Cancel request"],["claim","Claim reward"]]) {
      const button = textNode("button", label); button.type = "button"; button.id = `request-${request.id}-${operation}`;
      button.setAttribute("aria-describedby", `${heading.id} ${reason.id}`);
      button.addEventListener("click", () => {
        const perform = () => {
          const result = act({type:"request",id:request.id,operation});
          if(result.ok) {
            const next = Array.from(actions.querySelectorAll("button")).find(b=>!b.hidden&&!b.disabled);
            (next || heading).focus({preventScroll:true});
          }
        };
        if(operation === "reject" || operation === "cancel") ask(`${operation === "reject" ? "Reject" : "Cancel"} this request?`, `${request.title} will not be available to accept again. No reward will be paid.`, operation === "reject" ? "Reject request" : "Cancel request", perform);
        else perform();
      });
      actions.append(button);
    }
    card.append(heading,description,status,progress,detail,reason,actions);
    $("request-cards").append(card);
  }
  for (const achievement of metrics.civic.achievements) {
    const card = textNode("li", "", "achievement-card"); card.id=`achievement-${achievement.id}`;
    card.append(textNode("strong",achievement.title), textNode("span","","achievement-state"), textNode("p",achievement.description));
    $("achievement-cards").append(card);
  }
  for(let index=0;index<3;index++) {
    const row = textNode("div","","bond-row"); row.id=`bond-${index}`;
    const description=textNode("p",""), button=textNode("button","Redeem bond early");
    button.type="button";button.dataset.bond=String(index);
    button.addEventListener("click",()=>{
      const bond=city.bonds[index];if(!bond)return;
      ask("Redeem this bond early?",`Pay the entire remaining ${money(bond.balance)} from treasury now. This removes the obligation once. Previous operating history stays unchanged; an operating Town Hall and Finance department are required.`,"Redeem obligation",()=>act({type:"redeemBond",index}));
    });
    row.append(description,button);$("bond-obligations").append(row);
  }
  for(const [id,operation] of [["tutorial-check","check"],["tutorial-dismiss","dismiss"],["tutorial-resume","resume"]]) $(id).addEventListener("click",()=>{
    const result=act({type:"tutorial",operation});
    if(result.ok&&operation==="dismiss")$("tutorial-resume").focus({preventScroll:true});
    if(result.ok&&operation==="resume")$("tutorial-check").focus({preventScroll:true});
  });
  $("tutorial-replay").addEventListener("click",()=>ask("Replay the city guide?","The guide restarts at its first step. The existing city, money, requests and achievements stay intact. Replay pays no reward.","Replay guide",()=>act({type:"tutorial",operation:"replay"})));
  $("wind-direction").addEventListener("change",()=>act({type:"environment",action:{type:"wind",direction:$("wind-direction").value}}));
  $("reactor-incident").addEventListener("click",()=>{
    const target={...selected};
    ask("Trigger a reactor incident?",`The nuclear facility at ${target.x}, ${target.y} will be ruined and the surrounding area contaminated. Radiation persists, can restrict new development and affect residents. This is a deliberate game scenario; export a recovery copy before confirming if needed.`,"Confirm reactor incident",()=>act({type:"environment",action:{type:"radiation",...target}}));
  });
}
function renderProgression() {
  const civic=metrics.civic,g=civic.government;
  $("government-status").textContent=`${g.label} · Tier ${g.tier} · ${g.slots} department slot${g.slots===1?"":"s"} · ${g.slotsRemaining} available. Peak population ${whole(g.peakPopulation)}.`;
  $("town-hall-status").textContent=g.townHallReady?"Town Hall is open, supplied and connected to the regional gateway.":g.townHallReason;
  $("town-hall-status").classList.toggle("needs-attention",!g.townHallReady);
  $("government-next").textContent=g.nextPopulation===null?"The highest government tier is attained.":`Next government tier at a peak population of ${whole(g.nextPopulation)}. Attained tiers and purchased departments survive later population declines.`;
  $("eligibility-note").textContent=civic.eligible?"Badge eligibility: standard city. Achievements record earned progress.":"Badge eligibility: this city is permanently ineligible for badges because of its sandbox history. Requests and tutorial controls remain available.";
  for(const d of civic.departments) {
    const card=$(`department-${d.id}`),button=$(`install-${d.id}`);
    card.classList.toggle("installed",d.installed);
    $(`department-${d.id}-reason`).textContent=d.installed?"Installed · one government slot occupied.":d.available?`Available at ${money(d.cost)}. Install to occupy one department slot.`:d.reason;
    button.textContent=d.installed?`${d.label} installed`:`Install ${d.label}`;
    button.disabled=!d.available||d.installed;
  }
  for(const r of civic.requests) {
    $(`request-${r.id}-status`).textContent=r.status[0].toUpperCase()+r.status.slice(1);
    $(`request-${r.id}-progress`).value=r.progress;
    $(`request-${r.id}-detail`).textContent=`${whole(r.progress)} / ${whole(r.target)} · One-time reward ${money(r.reward)}${r.deadlineMonth===null?` · ${REQUESTS[r.id].duration} game months from acceptance`:` · Deadline month ${r.deadlineMonth} (${r.remainingMonths} remaining)`}`;
    $(`request-${r.id}-reason`).textContent=r.status==="offered"&&r.canAccept?"":r.reason;
    for(const operation of ["accept","reject","cancel","claim"]) {
      const b=$(`request-${r.id}-${operation}`);
      b.hidden=operation==="accept"||operation==="reject"?r.status!=="offered":operation==="cancel"?r.status!=="active":r.status!=="completed";
      b.disabled=operation==="accept"?!r.canAccept:operation==="claim"?!r.canClaim:false;
    }
  }
  const t=civic.tutorial;
  $("tutorial-progress").textContent=t.completed?"8 / 8 · Complete":`${t.step+1} / 8${t.dismissed?" · Dismissed":""}`;
  $("tutorial-title").textContent=t.title;
  $("tutorial-instruction").textContent=t.dismissed?"The guide is hidden. Resume to continue from this same step.":t.instruction;
  $("tutorial-ready").textContent=t.completed?"Guide complete. Your city continues to operate normally.":t.progress?"Current objective is satisfied. Check the step to continue.":"Meet the displayed objective before checking this step.";
  $("tutorial-check").disabled=t.completed||t.dismissed||!t.progress;
  $("tutorial-dismiss").hidden=t.dismissed||t.completed;
  $("tutorial-resume").hidden=!t.dismissed;
  for(const a of civic.achievements) {
    const card=$(`achievement-${a.id}`);card.classList.toggle("earned",a.earned);
    card.querySelector(".achievement-state").textContent=!a.eligible?"Ineligible":a.earned?"Earned ✓":"Not earned";
  }
  for(let index=0;index<3;index++) {
    const row=$(`bond-${index}`),bond=city.bonds[index];row.hidden=!bond;if(!bond)continue;
    row.querySelector("p").textContent=`Bond ${index+1}: ${money(bond.balance)} remaining · ${bond.months} payments left.`;
    const finance=city.civic.departments.includes("finance"),canPay=city.cash>=bond.balance;
    const button=row.querySelector("button");button.disabled=!finance||!g.townHallReady||!canPay;
    button.title=!finance?"Install Finance to redeem an obligation early.":!g.townHallReady?g.townHallReason:!canPay?"Treasury must cover the full remaining balance.":`Pay ${money(bond.balance)} to remove this obligation.`;
  }
}
function updateEnvironmentSelection() {
  const e=metrics.environment,i=selected.y*city.width+selected.x;
  if(!e)return;
  const reactor=city.tiles[i].type==="nuclear";
  $("reactor-incident").disabled=!reactor;
  $("reactor-target").textContent=reactor?`Selected nuclear facility: column ${selected.x}, row ${selected.y}. The scenario affects this site.`:"Inspect an actual nuclear facility to enable the scenario. An already ruined site cannot trigger it again.";
}
function renderEnvironment() {
  const e=metrics.environment,directions={N:"Northbound",E:"Eastbound",S:"Southbound",W:"Westbound"};
  setInput("wind-direction",city.environment.wind);
  $("environment-wind").textContent=`Air movement: ${directions[city.environment.wind]} (${city.environment.wind}). Changes apply to the next monthly advection step.`;
  ledger($("environment-report"),[["Forecast air emissions",`${whole(e.emissions.air)} game units`],["Forecast ground emissions",`${whole(e.emissions.ground)} game units`],["Resident air exposure",`${whole(e.residentAirExposure)}/100`],["Resident radiation exposure",`${whole(e.residentRadiationExposure)}/100`],["Environmental health penalty",`${whole(e.healthPenalty)} indicator points`]]);
  const restricted=e.restricted.filter(Boolean).length;
  $("radiation-status").textContent=`${whole(restricted)} restricted tile${restricted===1?"":"s"}. Radiation can restrict new non-recovery construction; connected cleanup works gradually.`;
  $("radiation-status").classList.toggle("needs-attention",restricted>0);
  ledger($("water-quality-report"),[["Pump-weighted raw contamination",`${whole(e.pumpWeightedRawContamination)}/100`],["Delivered water contamination",`${whole(e.deliveredWaterContamination)}/100`],["Actual delivered water",`${whole(e.deliveredWater)} units/month`],["Staffed filtration capacity",`${whole(e.waterFilterCapacity)} units/month`],["Water actually filtered",`${whole(e.filteredWater)} units/month`]]);
  updateEnvironmentSelection();
}
function renderManagement() {
  const booked = city.history.at(-1),
    budget = booked || metrics.monthly;
  ledger($("budget-ledger"), [
    [
      booked ? `Booked month ${booked.month}` : "Current forecast",
      booked ? "Completed" : "Before trade orders",
    ],
    ["Tax & visitor income", money(budget.income)],
    ["Infrastructure & services", `−${money(budget.upkeep)}`],
    ["Bond payments", `−${money(budget.debt)}`],
    ["Net trade", money(budget.trade || 0)],
    ["Operating balance", money(budget.net), true],
    ["Outstanding debt", money(city.bonds.reduce((n, b) => n + b.balance, 0))],
  ]);
  for (const sector of ["residential", "commercial", "industrial"])
    setInput(`tax-${sector}`, city.taxes[sector]);
  for (const service of ["school", "clinic", "fire", "police"])
    setInput(`funding-${service}`, city.funding[service]);
  for (const policy of ["recycling", "disasters"])
    $(`policy-${policy}`).checked = city.policies[policy];
  ledger($("service-report"), [
    ["Education coverage", `${whole(metrics.education)}/100`],
    ["Health indicator", `${whole(metrics.health)}/100`],
    ["Crime pressure", `${whole(metrics.crime)}/100`],
    ["Local pollution", `${whole(metrics.pollutionAverage)}/100`],
  ]);
  ledger($("city-indicators"), [
    ["Working residents", whole(metrics.workers)],
    ["Bus passengers", whole(metrics.busPassengers)],
    ["Rail passengers", whole(metrics.railPassengers)],
    ["Regional renewable support", `${whole(city.regionalPower)} power units`],
    ["Reachable job capacity", whole(metrics.jobs)],
    ["Filled jobs", whole(metrics.employed)],
    ["Unemployment", percent(metrics.unemployment)],
    ["Busiest road", `${percent(metrics.traffic)} of capacity`],
    ["Groundwater remaining", `${whole(city.groundwater)} units`],
    ["Untreated sewage backlog", `${whole(city.backlogs?.sewage)} units`],
    ["Uncollected waste backlog", `${whole(city.backlogs?.waste)} units`],
  ]);
  $("research-points").textContent =
    `${whole(city.research.points)} research points`;
  for (const resource of RESOURCES) {
    $(`inventory-${resource}`).textContent = whole(city.inventory[resource]);
    setInput(`trade-${resource}`, city.trade[resource]);
  }
  for (const [id, topic] of Object.entries(RESEARCH)) {
    const completed = city.research.completed.includes(id),
      button = $(`research-${id}`);
    button.classList.toggle("complete", completed);
    button.disabled = completed;
    button.lastElementChild.textContent = completed
      ? "Completed ✓"
      : `${topic.cost} points`;
  }
  $("history-rows").replaceChildren(
    ...city.history
      .slice()
      .reverse()
      .map((row) => {
        const tr = document.createElement("tr");
        for (const value of [
          row.month,
          whole(row.population),
          money(row.net),
        ]) {
          const td = document.createElement("td");
          td.textContent = value;
          tr.append(td);
        }
        return tr;
      }),
  );
  if (!city.history.length) {
    const tr = document.createElement("tr"),
      td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "Run the simulation to record the first month.";
    tr.append(td);
    $("history-rows").append(tr);
  }
  list(
    $("city-events"),
    city.events.length
      ? city.events.slice().reverse()
      : ["No city events yet."],
  );
  setInput("city-name", city.name);
  renderProgression();
  renderEnvironment();
}
function update() {
  $("city-name-display").textContent = city.name;
  $("city-game").dataset.month = city.month;
  $("month-label").textContent =
    `Year ${Math.floor(city.month / 12) + 1} · ${months[city.month % 12]}`;
  $("cash-value").textContent = money(city.cash);
  $("cash-value").classList.toggle("negative", city.cash < 0);
  const net = city.history.at(-1)?.net ?? metrics.monthly.net;
  $("balance-value").textContent =
    `${net >= 0 ? "+" : ""}${money(net)} / month`;
  $("population-value").textContent = whole(metrics.population);
  $("jobs-value").textContent =
    `${whole(metrics.employed)} employed · ${whole(metrics.jobs)} jobs`;
  $("happiness-value").textContent = percent(metrics.happiness);
  $("mood-label").textContent =
    metrics.happiness >= 70
      ? "A city finding its rhythm"
      : metrics.happiness >= 45
        ? "Room to make life better"
        : "Residents need attention";
  $("map-seed").textContent = city.seed;
  for (const sector of ["residential", "commercial", "industrial"]) {
    $(`demand-${sector}`).value = metrics.demand[sector];
    $(`demand-${sector}`).textContent = whole(metrics.demand[sector]);
    $(`demand-${sector}-value`).textContent = percent(metrics.demand[sector]);
  }
  list(
    $("city-advice"),
    metrics.warnings.length
      ? metrics.warnings.slice(0, 5)
      : [
          "Infrastructure is meeting occupied demand. Inspect land value and demand before your next expansion.",
        ],
  );
  updateInspector();
  renderUtilities();
  renderManagement();
  renderRegion();
  updateRunState();
  dirty = true;
}
function act(action) {
  const result = applyAction(city, action);
  message(result.message, !result.ok);
  if (result.ok) {
    metrics = measure(city);
    update();
    storeCity();
  }
  return result;
}
function selectTile(tile, reveal = false) {
  if (!tile) return;
  selected = tile;
  updateInspector();
  dirty = true;
  if (reveal) view.ensureVisible(selected);
}
function performTool(tile) {
  selectTile(tile);
  if (tool === "inspect") return;
  if (tool === "bulldoze") {
    const info = inspectTile(city, tile.x, tile.y, metrics);
    ask(
      "Decommission this tile?",
      `${info.title} at ${tile.x}, ${tile.y} will be removed for ${money(2500)}, with no construction refund. This can deepen a deficit while reducing future upkeep.`,
      "Decommission",
      () => act({ type: "bulldoze", ...tile }),
    );
  } else act({ type: "build", tool, ...tile });
}
function ask(title, copy, confirmLabel, confirm, setup = false) {
  pause();
  pointer = null;
  $("dialog-title").textContent = title;
  $("dialog-copy").textContent = copy;
  $("dialog-confirm").textContent = confirmLabel;
  $("new-city-options").hidden = !setup;
  pendingConfirm = confirm;
  $("city-dialog").showModal();
}
function replaceCity(candidate, note) {
  region = candidate.cities ? candidate : wrapCity(candidate);
  city = region.cities[region.active].state;
  selected = { x: 5, y: 16 };
  metrics = measure(city);
  pause();
  chooseTool("inspect");
  view.reset();
  update();
  storeCity();
  message(note);
}
function wrapCity(solo) {
  if (solo.regionalPower)
    throw Error(
      "Import the complete region to preserve regional power support.",
    );
  const r = createRegion({ seed: solo.seed });
  r.month = solo.month;
  r.cities[0].state = solo;
  for (let i = 1; i < r.cities.length; i++) {
    const companion = r.cities[i].state;
    companion.month = solo.month;
    companion.civic = createCivic({ month: solo.month, sandbox: companion.sandbox });
    companion.environment.lastMonth = solo.month - 1;
  }
  r.events.push(
    `Single-city import: two fresh towns initialized at calendar month ${solo.month}; their prior months were not simulated.`,
  );
  return r;
}
function parsePlayable(text) {
  try {
    return parseRegion(text);
  } catch (regionError) {
    try {
      return wrapCity(parseCity(text));
    } catch {
      throw regionError;
    }
  }
}
function regionAct(action) {
  const result = regionAction(region, action);
  message(result.message, !result.ok);
  if (result.ok) {
    city = region.cities[region.active].state;
    metrics = measure(city);
    update();
    storeCity();
  }
  return result;
}
function renderRegion() {
  const selector = $("region-city"),
    destination = $("shipment-to");
  const old = destination.value;
  selector.replaceChildren(
    ...region.cities.map((c, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = c.state.name;
      return o;
    }),
  );
  selector.value = region.active;
  destination.replaceChildren(
    ...region.cities.flatMap((c, i) => {
      if (i === region.active) return [];
      const o = document.createElement("option");
      o.value = i;
      o.textContent = c.state.name;
      return [o];
    }),
  );
  if (old !== "" && old !== String(region.active) && region.cities[Number(old)])
    destination.value = old;
  ledger(
    $("region-report"),
    region.cities.map((c) => [
      c.state.name,
      `${whole(measure(c.state).population)} residents · ${money(c.state.cash)}`,
    ]),
  );
  $("project-progress").textContent = region.project.complete
    ? "Complete: 200 renewable power capacity per city."
    : `${region.project.goods}/1,000 goods · ${region.project.alloy}/500 alloy contributed`;
  list(
    $("region-shipments"),
    region.shipments.length
      ? region.shipments.map(
          (t) =>
            `${t.amount} ${t.resource} → ${region.cities[t.to].state.name}, month ${t.arrivalMonth}`,
        )
      : ["No shipments in transit."],
  );
  list(
    $("region-events"),
    region.events.length
      ? region.events.slice().reverse()
      : ["No regional transfers yet."],
  );
}
function initializeRegion() {
  $("region-city").addEventListener("change", () => {
    pause();
    regionAct({ type: "switch", index: Number($("region-city").value) });
    chooseTool("inspect");
    view.reset();
    dirty = true;
  });
  $("shipment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number($("shipment-amount").value),
      to = Number($("shipment-to").value),
      resource = $("shipment-resource").value;
    ask(
      "Dispatch regional shipment?",
      `Send ${whole(amount)} ${resource} from ${city.name} to ${region.cities[to]?.state.name}? Freight ${money(amount * 200)} is charged once. Resources arrive next region month.`,
      `Dispatch ${resource}`,
      () =>
        regionAct({
          type: "shipment",
          from: region.active,
          to,
          resource,
          amount,
        }),
    );
  });
  $("contribution-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const resource = $("contribution-resource").value,
      amount = Number($("contribution-amount").value);
    ask(
      "Contribute to the regional project?",
      `${whole(amount)} ${resource} will be consumed from ${city.name} and reserved for the Regional Solar Commons.`,
      "Contribute resources",
      () =>
        regionAct({
          type: "contribute",
          from: region.active,
          resource,
          amount,
        }),
    );
  });
}
function initializeControls() {
  $("simulation-action").addEventListener("click", toggleRun);
  $("inspect-tool").addEventListener("click", () => chooseTool("inspect"));
  $("bulldoze-tool").addEventListener("click", () => chooseTool("bulldoze"));
  $("tool-group").addEventListener("change", () => {
    chooseTool("inspect");
    renderPalette();
  });
  $("overlay").addEventListener("change", () => {
    overlay = $("overlay").value;
    $("overlay-caption").textContent = overlays[overlay];
    dirty = true;
  });
  for (const button of document.querySelectorAll("[data-speed]"))
    button.addEventListener("click", () => {
      setSpeed(clock, Number(button.dataset.speed));
      previousFrame = null;
      for (const other of document.querySelectorAll("[data-speed]"))
        other.setAttribute("aria-pressed", String(other === button));
      message(
        `Simulation speed set to ${button.dataset.speed}×. ${running ? "Running." : "Resume when ready."}`,
      );
    });
  for (const button of document.querySelectorAll("[data-panel]"))
    button.addEventListener("click", () => {
      for (const other of document.querySelectorAll("[data-panel]"))
        other.setAttribute("aria-pressed", String(other === button));
      for (const panel of document.querySelectorAll("[data-management-panel]"))
        panel.hidden = panel.dataset.managementPanel !== button.dataset.panel;
    });
  $("coordinate-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const x = Number($("tile-x").value),
      y = Number($("tile-y").value);
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      x >= city.width ||
      y < 0 ||
      y >= city.height
    ) {
      message("Choose a valid city column and row.", true);
      return;
    }
    chooseTool("inspect");
    selectTile({ x, y }, true);
    canvas.focus({ preventScroll: true });
  });
  $("upgrade-tile").addEventListener("click", () =>
    act({ type: "upgrade", ...selected }),
  );
  $("toggle-facility")?.addEventListener("click", () =>
    act({ type: "toggle", ...selected }),
  );
  for (const sector of ["residential", "commercial", "industrial"])
    $(`tax-${sector}`).addEventListener("change", () =>
      act({ type: "tax", sector, value: Number($(`tax-${sector}`).value) }),
    );
  for (const service of ["school", "clinic", "fire", "police"])
    $(`funding-${service}`).addEventListener("change", () =>
      act({
        type: "funding",
        service,
        value: Number($(`funding-${service}`).value),
      }),
    );
  for (const name of ["recycling", "disasters"])
    $(`policy-${name}`).addEventListener("change", () =>
      act({ type: "policy", name, value: $(`policy-${name}`).checked }),
    );
  $("issue-bond").addEventListener("click", () =>
    ask(
      "Issue a city bond?",
      `Receive ${money(2000000)} now and repay ${money(2200000)} over 24 game months. Regular monthly payments are approximately ${money(91667)}, with the final payment adjusted. At most three outstanding bonds; payments continue during a deficit.`,
      "Issue bond",
      () => act({ type: "bond" }),
    ),
  );
  $("inventory-controls").replaceChildren(
    ...RESOURCES.map((resource) => {
      const row = document.createElement("label");
      row.className = "inventory-line";
      const label = document.createElement("span");
      label.textContent = resource[0].toUpperCase() + resource.slice(1);
      const count = document.createElement("output");
      count.id = `inventory-${resource}`;
      const select = document.createElement("select");
      select.id = `trade-${resource}`;
      select.setAttribute("aria-label", `${label.textContent} trade`);
      for (const [value, text] of [
        ["off", "Hold"],
        ["import", "Import"],
        ["export", "Export"],
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
      }
      select.addEventListener("change", () =>
        act({ type: "trade", resource, mode: select.value }),
      );
      row.append(label, count, select);
      return row;
    }),
  );
  $("research-controls").replaceChildren(
    ...Object.entries(RESEARCH).map(([topic, definition]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "research-button";
      button.id = `research-${topic}`;
      button.title = definition.description;
      const name = document.createElement("strong");
      name.textContent = definition.label;
      const cost = document.createElement("span");
      cost.textContent = `${definition.cost} points`;
      button.append(name, cost);
      button.addEventListener("click", () => act({ type: "research", topic }));
      return button;
    }),
  );
  for (const button of document.querySelectorAll("[data-disaster]"))
    button.addEventListener("click", () =>
      ask(
        "Trigger a city emergency?",
        `This deliberately applies a ${button.dataset.disaster} scenario. Buildings and residents may be affected. Export your city first if you want a recovery point.`,
        "Trigger scenario",
        () => act({ type: "disaster", kind: button.dataset.disaster }),
      ),
    );
  $("rename-city").addEventListener("click", () =>
    act({ type: "rename", value: $("city-name").value }),
  );
  $("new-city").addEventListener("click", () => {
    $("new-city-name").value = "Riverbend";
    $("new-city-seed").value = city.seed;
    ask(
      "Start a new city?",
      "All three cities, in-flight shipments and the shared project in your current region will be replaced. Export the region first to preserve it. Local saves are replaced only when saving is enabled.",
      "Create city",
      () => {
        const seed = Number($("new-city-seed").value);
        if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
          message(
            "Map seed must be a whole number between 0 and 4,294,967,295.",
            true,
          );
          return;
        }
        replaceCity(
          createCity({
            seed,
            name: $("new-city-name").value.trim() || "Riverbend",
            starter:
              document.querySelector('input[name="city-start"]:checked')
                .value === "starter",
            sandbox: $("new-sandbox").checked,
          }),
          "New city created and paused. Start with a road connection to the regional entrance.",
        );
      },
      true,
    );
  });
  $("dialog-cancel").addEventListener("click", () => {
    pendingConfirm = null;
    $("city-dialog").close();
    message("Current city preserved. Resume when ready.");
  });
  $("city-dialog").addEventListener("cancel", () => {
    pendingConfirm = null;
    message("Current city preserved. Resume when ready.");
  });
  $("dialog-confirm").addEventListener("click", () => {
    const confirm = pendingConfirm;
    pendingConfirm = null;
    $("city-dialog").close();
    if (confirm) confirm();
  });
  $("dialog-form").addEventListener("submit", (event) =>
    event.preventDefault(),
  );
  $("save-city").addEventListener("change", () => {
    saving = $("save-city").checked;
    if (saving) storeCity();
    else {
      try {
        localStorage.removeItem(STORAGE);
        localStorage.removeItem(OPT_IN);
        storageNote(
          "Local saving is off. The saved copy was removed from this browser.",
        );
      } catch {
        storageNote(
          "Storage is unavailable; the browser could not confirm removal. In-memory play continues.",
        );
      }
    }
  });
  $("save-now").addEventListener("click", () => {
    if (!saving) {
      storageNote(
        "Enable “Save this city in this browser” to opt in before saving.",
      );
      return;
    }
    if (storeCity()) message("City saved in this browser.");
  });
  $("load-city").addEventListener("click", () => {
    try {
      const text = localStorage.getItem(STORAGE);
      if (!text) {
        storageNote("No saved city was found in this browser.");
        return;
      }
      const candidate = parsePlayable(text);
      ask(
        "Load saved city?",
        "Replace the current three-city region with the validated saved copy? The simulation will stay paused.",
        "Load city",
        () => replaceCity(candidate, "Saved city loaded. Resume when ready."),
      );
    } catch {
      storageNote(
        "The saved city is unavailable or invalid. Your current city is preserved; try importing an exported copy.",
      );
    }
  });
  $("export-city").addEventListener("click", () => {
    try {
      const url = URL.createObjectURL(
          new Blob([serializeRegion(region)], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `${city.name.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40) || "cmd-city"}-month-${city.month}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message(
        "Three-city region exported, including shipments and project progress.",
      );
    } catch {
      message(
        "Export failed. Your city is still open; try again before closing this page.",
        true,
      );
    }
  });
  $("import-city").addEventListener("change", async () => {
    const file = $("import-city").files?.[0];
    $("import-city").value = "";
    if (!file) return;
    pause();
    try {
      if (file.size > 3145728)
        throw new Error("Region file is larger than 3 MiB.");
      const candidate = parsePlayable(await file.text());
      ask(
        "Import this city?",
        `Replace the entire region, including all three cities, shipments and project progress, with ${candidate.cities[candidate.active].state.name} at region month ${candidate.month}? A single-city file initializes two fresh towns at the same calendar month without simulating their past. The file has passed validation.`,
        "Import city",
        () => replaceCity(candidate, "Imported city loaded and paused."),
      );
    } catch (error) {
      message(
        `Import rejected. ${error.message || "The file is invalid."} Your current city is preserved.`,
        true,
      );
    }
  });
  $("zoom-in").addEventListener("click", () => {
    view.zoom(1.25);
    dirty = true;
  });
  $("zoom-out").addEventListener("click", () => {
    view.zoom(0.8);
    dirty = true;
  });
  $("reset-view").addEventListener("click", () => {
    view.reset();
    dirty = true;
  });
}
function initializeMapInput() {
  canvas.addEventListener("keydown", (event) => {
    if ($("city-dialog").open) return;
    const shifts = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (shifts[event.key]) {
      event.preventDefault();
      const [dx, dy] = shifts[event.key];
      selectTile(
        {
          x: Math.max(0, Math.min(city.width - 1, selected.x + dx)),
          y: Math.max(0, Math.min(city.height - 1, selected.y + dy)),
        },
        true,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) performTool({ ...selected });
    } else if (event.key === " ") {
      event.preventDefault();
      if (!event.repeat) toggleRun();
    } else if (event.key.toLowerCase() === "i" || event.key === "Escape") {
      event.preventDefault();
      chooseTool("inspect");
    }
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointer) return;
    canvas.focus({ preventScroll: true });
    const tile = view.pointToTile(event.clientX, event.clientY);
    pointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      tile,
      moved: false,
      inspect: tool === "inspect",
    };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* A released pointer is harmless. */
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    hover = view.pointToTile(event.clientX, event.clientY);
    dirty = true;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (
      Math.hypot(
        event.clientX - pointer.startX,
        event.clientY - pointer.startY,
      ) > 6
    )
      pointer.moved = true;
    if (pointer.inspect && pointer.moved) {
      view.pan(event.clientX - pointer.x, event.clientY - pointer.y);
      canvas.classList.add("panning");
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const prior = pointer;
    pointer = null;
    canvas.classList.remove("panning");
    const tile = view.pointToTile(event.clientX, event.clientY);
    if (
      !prior.moved &&
      tile &&
      prior.tile?.x === tile.x &&
      prior.tile?.y === tile.y
    )
      performTool(tile);
  });
  const cancelPointer = () => {
    pointer = null;
    hover = null;
    canvas.classList.remove("panning");
    dirty = true;
  };
  canvas.addEventListener("pointercancel", cancelPointer);
  canvas.addEventListener("lostpointercapture", cancelPointer);
  canvas.addEventListener("pointerleave", () => {
    hover = null;
    dirty = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelPointer();
      pause("Paused because the page became hidden. Resume when ready.");
    }
  });
  window.addEventListener("blur", () => {
    cancelPointer();
    pause("Paused because the window lost focus. Resume when ready.");
  });
  window.addEventListener("resize", () => {
    cancelPointer();
    pause("Paused after the view changed size. Resume when ready.");
    view.resize();
    dirty = true;
  });
}
function frame(time) {
  if (previousFrame === null) previousFrame = time;
  const elapsed = Math.max(0, (time - previousFrame) / 1000);
  previousFrame = time;
  const count = advanceClock(clock, elapsed);
  if (running && count) {
    try {
      for (let i = 0; i < count; i++) metrics = advanceRegion(region);
      update();
      storeCity();
    } catch (error) {
      pause();
      metrics = measure(city);
      update();
      storeCity();
      message(
        `Simulation paused: ${error.message} Your region is preserved; export it or use New city.`,
        true,
      );
    }
  }
  if (dirty) {
    view.draw(city, metrics, selected, tool, overlay, hover);
    dirty = false;
  }
  requestAnimationFrame(frame);
}
try {
  view = createView(canvas);
  initializeControls();
  initializeProgression();
  initializeRegion();
  initializeMapInput();
  try {
    if (localStorage.getItem(OPT_IN) === "yes") {
      saving = true;
      $("save-city").checked = true;
      const text = localStorage.getItem(STORAGE);
      if (text) {
        region = parsePlayable(text);
        city = region.cities[region.active].state;
        metrics = measure(city);
        message("Saved city loaded from this browser. Resume when ready.");
        storageNote(
          "Local saving is enabled in this browser. Nothing is sent to a server.",
        );
      }
    }
  } catch {
    storageNote(
      "Local storage is unavailable or the saved copy is invalid. In-memory play remains available. Export a copy before closing.",
    );
  }
  renderPalette();
  chooseTool("inspect");
  update();
  requestAnimationFrame(frame);
} catch (error) {
  message(
    `The city could not start. ${error.message || "Please reload in a browser with Canvas support."}`,
    true,
  );
  $("run-state").textContent = "UNAVAILABLE";
  $("city-game").dataset.state = "unavailable";
}
