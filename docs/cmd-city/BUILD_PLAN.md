# CMD City — product and implementation plan

Status: PLANNED; no city game has been implemented or deployed by this change.

Prepared for Andrew's request to add a detailed, original city simulator to `AndrewGuadi/this_is_a_legit_website`, currently served at `https://www.cmduniverse.com/` on PythonAnywhere. Baseline inspected: `3c86263472ded1d060dc9eeaa7c94c9fd0abc6c4`. This document records proposed behavior, not verified game features. No release date or implementation duration is promised.

## Product

**CMD City** is a browser city builder about the consequences of planning decisions. Build roads, designate neighborhoods and workplaces, connect utilities, fund public services, and balance growth against the monthly budget. It uses original art, names, interface and rules; SimCity is an inspiration, not a product name or source of copied assets.

The central loop is **build → connect → attract residents and employers → collect taxes → fund services → diagnose problems → expand**. The first playable release must support this entire loop. It must not be a decorative placement grid with counters increasing independently of the player's decisions.

Purpose: add a deeper, replayable strategy game to CMD Universe while preserving the quick-access arcade. No account, purchase, subscription or form submission is needed. Returning players can continue a city saved on their own device. Online multiplayer and cross-device saves are outside the first release.

Accuracy means deterministic, internally consistent, explainable rules with explicit units and limitations. This is a stylized simulation, not an urban-planning, financial, environmental or demographic prediction tool. Real-world calibration requires a separate research and validation project. Do not call it an accurate recreation of a specific city.

## First playable release

| System | Player capability | Required consequence |
|---|---|---|
| Terrain | Choose a seed; build on a 40 × 32 map with land and a river | Water restricts building; a bridge is needed for a road crossing |
| Roads | Place and demolish roads and bridges | Access depends on an actual path to the regional gateway |
| Zoning | Designate residential, commercial and industrial lots | Empty zones develop only when access, utilities and sector demand permit |
| Housing | Observe occupancy and later building upgrades | Residents require housing; population never exceeds capacity |
| Jobs | Create industrial and commercial employment | Workers and available jobs bound employment; isolated jobs do not support other neighborhoods |
| Power | Build wind generators | Finite, connected capacity; shortages constrain occupancy and businesses |
| Water | Build water towers | Finite, connected capacity; shortages constrain occupancy and businesses |
| Services | Place parks, schools, clinics, fire and police stations | Operating services affect local desirability; disconnected facilities provide no benefit |
| Environment | Inspect industrial pollution and neighborhood desirability | Pollution is local; a distant park cannot remove it |
| Budget | Set R/C/I tax rates and inspect a monthly ledger | Construction, upkeep, tax revenue, treasury and net operating balance remain distinct |
| Inspection | Select any tile and open overlays | Show concrete access, utility, employment and growth blockers |
| Time | Pause, resume and select 1×/2×/4× | The same sequence of simulation months produces the same result at every display speed |
| Persistence | Opt in to local saves; export/import a city | Versioned, validated state; unavailable storage never crashes the game |
| Progress | Track population milestones and 24 months of history | Growth is earned; revisiting milestones never repeatedly grants money |

A new session begins paused. The default is a small seeded starter town with a working road connection, basic utilities, homes and jobs; clearly label its prebuilt structures and starting treasury. Also offer an empty map for experienced players. Restart or replacement import requires confirmation; cancellation preserves the current city.

An optional tutorial uses visible tasks: inspect the gateway, extend a road, zone homes, zone workplaces, inspect capacity, run one month, and read the budget. It must be dismissible and replayable without resetting the city.

## Simulation contract

### State and time

- Model state owns the seed, terrain, tile contents, occupancy, utility capacities, tax rates, treasury, month, history and milestone flags.
- Pure simulation logic has no DOM, Canvas, localStorage, wall-clock or network dependency. All randomness comes from the saved seeded generator.
- One model tick is one game month. At 1×, one month is two seconds of active, visible play; 2× and 4× change only scheduling. A frame never directly changes money, population or employment.
- Bound frame accumulation to one second and at most two monthly ticks per render callback. Discard excess elapsed time after a stall. Paused, background and hidden-tab time do not accrue catch-up months.
- Visibility loss, window blur and map resize pause the simulation and clear pending accumulation. Returning requires deliberate Resume. A speed change preserves the city and clears pending accumulation.
- Define and test exact update order: rebuild connectivity → compute local pollution and operating services → allocate utilities → compute accessible jobs and workers → compute demand → update occupancies → recompute served occupancy and employment → book monthly finance → append history → award milestone flags.
- Historical metrics describe the booked month. Inspectors clearly distinguish current infrastructure capacity from the last booked population/income. Never silently recompute financial history after a bulldoze.

### Connectivity and construction

- Orthogonal adjacency forms the road graph; diagonal contact alone is not access. The gateway is a protected map-edge road tile.
- Buildings use an adjacent road tile as frontage. Their frontage must reach the gateway by road or bridge. A disconnected road island is not a regional connection.
- Bridges occupy river tiles, join the same graph, and have separately displayed higher construction/upkeep costs. Diagonal bridges do not connect. Other structures cannot occupy water.
- A facility operates only if it has regional road access. V1 models utility distribution in road conduits; it does not claim to simulate physical pipes, transmission lines or hydraulic pressure. Show this simplification in Help.
- Construction is transactional: validate tool, tile, terrain, occupancy, unlock and treasury before mutation. Reject an action without changing map, funds, history or seed state. Display a specific reason.
- Never overwrite an existing structure through ordinary placement. Require explicit demolition before redevelopment. A completed placement costs exactly once; pointer jitter and duplicate events cannot charge twice for one unchanged tile.
- Demolition has a displayed fee and no construction refund in v1. Allow explicit decommissioning even during a deficit, booking its fee to treasury so the player can reduce future upkeep; confirm this consequence before demolition. Protect the gateway. Removing infrastructure immediately invalidates access/supply and explains affected lots; population changes occur on subsequent model ticks.
- Do not offer undo unless finance, milestone and simulation consequences are fully defined. V1 omits it.

### Utilities

- Define power in game capacity units/month and water in game capacity units/month. These are balancing units, not kWh or gallons. Show supply, demand, utilization and the connected status separately.
- Every occupied residential, commercial and industrial unit consumes defined amounts. Capacity must also cover the proposed next growth increment; empty zones cannot grow into unlimited demand merely because current consumption is zero.
- Eligible supply comes only from operating facilities connected to the gateway. Utility networks share the connected road graph in v1.
- Allocate scarcity proportionally with deterministic rounding and stable tile-order tie breaking. Never let iteration order give the first neighborhood all available supply. No negative consumption, capacity or occupancy.
- Allocate monthly growth proposals together against shared remaining capacity. Reserve both power and water for each accepted increment, using proportional allocation and stable tie breaking. Several zones must never each pass a check against the same unreserved spare capacity. Recompute consumption after growth and prove that accepted increments collectively fit the available supplies.
- An unserved zone cannot grow. Existing occupancy contracts gradually under sustained shortages instead of disappearing instantly. Show the same rule in the inspector and tests.
- New utilities may restore service immediately, but growth and taxes still wait for the next month.

### Housing, work and demand

- Residents, workers, residential capacity, job capacity and filled jobs are separate values. For v1, workers are a fixed documented share of residents; this is not a household/age-cohort model.
- Filled jobs cannot exceed reachable job capacity or workers. Only operating businesses with regional access and utilities provide eligible jobs. Road access is the transport approximation; there is no commute-time simulation in v1.
- Start newly placed zones empty. Bound growth per month and tile capacity. Starter-town occupancy is an explicit initial condition, not a recurring migration bonus.
- Residential demand responds to accessible vacancies in employment, tax rate, utilities and local desirability. Permit a small, bounded regional baseline of migration so a new empty city can bootstrap. Label it external migration demand.
- Commercial demand responds to served residents and existing commercial capacity. Industrial demand responds to the reachable labor pool and existing industrial capacity. Bound all demand indicators; vacant zones alone do not create tax revenue or jobs.
- Density upgrades require sustained occupancy, service coverage, demand and enough utility capacity for the upgrade. Do not award population for changing a visual building sprite.
- Excessively high taxes reduce growth and can cause gradual departures; 0% taxes generate no sector tax income. The inspector identifies the actual factors rather than showing generic random complaints.
- Freeze numeric balancing constants in one exported data table before implementation. Test relational outcomes and bounded behavior, rather than claiming those constants reflect measured real-world elasticities.

### Pollution and public services

- Industrial occupancy produces pollution within a finite Manhattan-distance radius with documented falloff. Water quality, air movement and emissions chemistry are not modeled.
- Parks improve nearby desirability but do not cancel source emissions. Pollution overlay and desirability overlay show different quantities.
- Schools, clinics, fire and police stations provide finite-radius coverage only when operating. Count overlapping coverage with a documented cap so stacked buildings cannot produce unlimited benefits.
- Service maintenance is charged monthly for built facilities; disconnected placement does not create a maintenance-free asset. Its absence of benefit and ongoing upkeep must both be visible.
- V1 does not simulate individual students, patients, crimes, dispatch routes or fires. Label the metrics coverage, not response times or actual incident rates. Fires/disasters enter a later release with explicit event rules.

### Finance

- Use integer minor currency units for all state and arithmetic. Display the game's currency consistently; avoid floating-point drift in repeated taxes or maintenance.
- Show each tool's construction cost and monthly upkeep before placement. Zoning has its own fee, distinct from later occupancy-based tax receipts.
- Keep separate R/C/I rates, clamped to 0–20% in whole percentage points. Keep tax-base-per-occupied-unit constants separate from rates.
- Monthly sector income is `floor(occupied taxable units × tax base in minor units × sector rate / 100)`. Document whether the residential tax base is per resident or occupied dwelling; do not switch silently. V1 uses per resident.
- Monthly upkeep is the sum of all built roads, bridges and facility costs. Monthly net is total taxes minus upkeep. One tick books one net amount exactly once.
- Treasury may become negative from monthly operations or decommissioning. Negative treasury blocks construction, while tax changes, decommissioning and inspection remain available. Decommissioning can deepen the current deficit but lowers later upkeep; display both consequences. No automatic cash loan, interest, compound penalty or game reset in v1. Warn early and explain the policy. Recovery must be tested rather than ending a save unexpectedly.
- Milestones initially unlock information or award badges, not money. This removes repeated crossing/uncrossing cash exploits. Paid loans, grants and debt financing are later features with separate ledgers.

## Interface and visual direction

Use an original, crisp map with shallow isometric building art, readable zoning colors, a restrained dark command interface and clear daytime terrain. Canvas owns rendering, but tools, treasury, tax inputs, overlays, inspector and Help are semantic HTML. Do not make essential information available only through color or hover.

Desktop: a compact top status bar, left construction palette, central map and right inspector/budget panel. Mobile: compact status summary, full-width map, horizontally scrollable tool groups and collapsible detail sheets below it. Panels must not hide selected tools or overlap map controls at 360 CSS pixels. Use symbols plus text for R/C/I and every warning.

Controls:

- Pointer/touch: select a tool, tap a tile to place; Inspect is the default safe tool. One-finger drag pans in Inspect; a separate Paint mode can later support road dragging. No ambiguous pan/paint gesture in v1.
- Keyboard: focus map, move tile cursor with arrows, Enter performs the selected action, I selects Inspect, Escape cancels selection/returns to Inspect. Space toggles pause only while map is focused. Keys in tax/name inputs retain normal behavior.
- Provide visible zoom in/out and reset-view buttons. Clamp zoom and pan. Touch scrolling remains normal outside the map. Handle pointer cancellation without placing or continuing a stale drag.
- Provide a coordinate input/jump control and an HTML description of the selected tile so keyboard users can inspect without pointer precision. Canvas still has visual accessibility limits; do not claim full nonvisual equivalence without verified coverage.
- Respect reduced motion by disabling decorative vehicle/building animations. No flashing alerts or mandatory audio. Sound is outside the initial scope.

Feedback must answer: **Why did this lot not grow? What is using my budget? What changes if I build here?** The inspector lists actual blockers, operating status, occupancy/capacity, tax contribution and local pollution/service metrics. Advisories must be derived from city state, not canned random text or external AI calls.

## Saves and data boundaries

- No gameplay events, maps, names or saves are sent to the research backend. Preserve the existing form-research disclosure and admin protections.
- Local saving is opt-in, explicitly described as stored in this browser. Use a game-specific versioned key; never overwrite Neon Breaker's preferences or score.
- Saving a city must preserve exact simulation and seeded generator state, rates, month, funds and bounded history. Validate and recompute derived metrics on load; never trust imported cached totals.
- Use schema version 1, fixed map dimensions and enum allowlists. Validate every scalar for finite integer/range constraints; reject malformed tiles, invalid seed state, unreasonable funds/months, unknown versions and excessive history.
- Limit imported JSON to 1 MiB before parsing. Validate into a separate candidate before offering replacement confirmation. A failed or canceled import leaves the current city untouched.
- Use plain text insertion for city names/messages; never interpret imported strings as HTML. Do not evaluate scripts or accept URLs/assets from save files.
- Handle denied storage, exhausted quota and corrupted data with a visible warning and continued in-memory play. Export remains available. Downloads are explicit player actions.
- No background progression when the page is closed. No cloud synchronization, leaderboard or accounts in v1.

## Architecture and integration

| Planned path | Responsibility |
|---|---|
| `static/cmd-city/core.mjs` | Deterministic state, construction, graph, ticks, finance, demand and invariants |
| `static/cmd-city/content.mjs` | Tile/tool definitions, costs, capacities, balancing constants and help labels |
| `static/cmd-city/save.mjs` | Bounded serialization, validation and version handling without DOM dependencies |
| `static/cmd-city/view.mjs` | Canvas rendering, camera, overlays and original vector-drawn buildings |
| `static/cmd-city/game.mjs` | Scoped input, scheduling, lifecycle, semantic HTML and local-save adapter |
| `static/cmd-city/game.css` | Responsive layouts, focus states, readable contrast and reduced motion |
| `templates/cmd_city.html` | Main game interface, instructions and no-JavaScript explanation |
| `static/arcade-art/cmd-city.svg` | Original collection illustration |
| `tests/city/*.test.mjs` | Model, persistence, construction and scheduling tests |
| `tests/browser/cmd-city.spec.js` | Full input, lifecycle, integration and accessibility checks |

Planned model interface: `createCity({seed, starter})`, `inspectTile(state,x,y)`, `applyAction(state,action)`, `advanceMonth(state)`, `serializeCity(state)` and `parseCity(text)`. Return structured placement errors without mutation. Renderer reads state; only model actions and ticks mutate it. Freeze concrete types and return shapes before two workers share an interface.

Integration is narrow: add one explicit template branch under the existing `/games/<slug>` handler, append the catalog entry, add its artwork, and update homepage text to distinguish two playable titles from seven planned concepts. Preserve the existing title/branding unless separately requested. Catalog already supplies sitemap entries. Verify the route, assets and sitemap under the existing strict CSP; no CDN, inline scripts, inline event handlers or relaxed CSP.

Existing `test_app.py` hard-codes eight titles and assumes only Neon Breaker is playable. Replace that obsolete assumption with catalog-driven status/route assertions, while continuing to check that concepts are not presented as playable and game visits create no observation records. Do not remove privacy/admin/form regression checks.

No production database migration, additional Python package, WebSocket service, continuously running game worker or paid model call is needed for gameplay. Existing Flask/PythonAnywhere serves static modules and HTML. Optional Web Workers can be considered only after measurements justify them; the present CSP does not declare worker permissions, so do not introduce one implicitly.

## Delivery sequence

| Stage | Deliverable | Exit behavior |
|---|---|---|
| 0 — Contract | This plan, source/runtime checks and review criteria | Implementation platform and test environment established |
| 1 — Model | Seeded terrain, placement, roads/bridges, R/C/I, utilities, jobs and budget | Headless starter town can grow and go into deficit for explainable reasons |
| 2 — Playable city | Original renderer, tools, inspector, overlays, taxes and scheduling | Player can create a functioning city through the real UI |
| 3 — Services and continuity | Services/pollution, history, milestone badges, tutorial, local saves/import/export | Long sessions survive pause, save/load and recovery cases |
| 4 — Integration and review | Catalog, route/artwork, regressions, rendered QA and independent TODD review | Exact candidate passes agreed release gate |
| 5 — PythonAnywhere release | Source deployment, reload, HTTPS route/assets and smoke test | Deployed artifact identified and a real playable flow verified |

These stages comprise the first release; they are not permission to describe an unfinished stage as fully playable. Start with at most two OpenCode implementation workers: simulation/save owner and presentation/input owner, each using separate writable copies and immutable shared interface inputs. Manager integrates verified changes. An independent reviewer must not implement the candidate they assess.

## Acceptance matrix

Each behavioral implementation/correction gets a genuine failing test first, implementation, passing result and affected regressions. Missing imports or broken harnesses are setup failures, not behavioral RED proof. Retain actual commands, exits and source identities. Visual evaluation requires actual renders.

| Test | Required observation |
|---|---|
| Deterministic replay | Same seed and actions across the same months produce identical serialized model state |
| Render independence | Repeated draw calls cannot change model state, money or month |
| Gateway access | Isolated road/zone stays inactive; joining the road activates access |
| Bridge topology | Opposite river banks connect only after a continuous orthogonal bridge path |
| Placement failures | Invalid terrain, occupied tile, insufficient funds and duplicate placement leave state unchanged |
| Utility bootstrap | Empty zones require spare capacity for their first occupied unit |
| Scarcity | Demand above capacity is bounded, shortages distribute consistently, and unserved zones cannot grow |
| Infrastructure removal | Bulldozing a connecting road or utility changes dependent service status; next tick follows shortage rules |
| Workers and jobs | Filled jobs never exceed workers or operating job capacity; disconnected business capacity is excluded |
| Demand | Excess housing, high taxes and a utility shortage reduce growth relative to an otherwise identical healthy city |
| Pollution/services | Nearby industry affects residences; distant parks/services do not confer unlimited benefits |
| Finance | Known occupancy/rates/assets produce exact monthly minor-unit income and maintenance, once per month |
| Deficit | City remains inspectable/saveable at negative treasury; forbidden construction cannot mutate it; decommissioning reduces later upkeep and enables a tested recovery scenario |
| Pause and speed | Paused/hidden/resized state advances zero months; equal month counts at every speed produce equal state |
| Milestones | Population recrossing does not duplicate rewards |
| Save round trip | Export/load preserves all authoritative model state and recomputes matching derived values |
| Save rejection | Oversize, invalid enums, extreme numbers, nonfinite inputs, wrong shape/version and malformed JSON preserve live city |
| Storage failure | Denied/quota/corrupt storage warns without stopping the game or destroying an in-memory city |
| Input | Keyboard and pointer/touch-emulated placement work; tax/name inputs keep their keys; canceled gestures place nothing |
| New-city/import cancel | Confirmation cancellation preserves the same map, finances, month and occupancy |
| Responsive UI | Controls and inspector usable at 360, 390, 768 and 1440px; no accidental horizontal page overflow |
| Accessibility | Visible focus, accessible names, clear labels, contrast checks, reduced motion, automated axe and manual keyboard review |
| Privacy | No new gameplay observation records and no third-party gameplay network requests |
| Site regression | Existing Neon game, concepts, forms, authentication/CSRF, exports, retention and deletion still pass |

Record median/p95 simulation tick time and frame timing against named browser/CPU/device context, with a populated full 1,280-tile map over at least 120 game months. Target p95 tick under 20ms on the recorded desktop environment and responsive interaction; this is a target until measured. Cap history at 24 months and avoid unbounded logs/entities. Browser emulation proves neither actual phone performance nor power consumption; record available physical-device coverage honestly without reusing Neon's missing hardware rubric as a new hidden gate.

Run the existing Python/application, orchestration, runtime/operations and game/browser CI suites as applicable. Add a city test command to CI before release; do not leave model tests in an undiscovered folder. Isolation and production-container jobs still require their supported runtime; do not label an unavailable Docker test passing.

## Independent release review

Freeze ten equal-weight criteria before implementation. Each receives an integer 1–100 plus evidence and missing checks:

1. Simulation and financial correctness.
2. Player understanding, feedback and a complete city-building loop.
3. Mobile layout and touch controls.
4. Desktop/tablet controls and integration compatibility.
5. Original visual polish and information legibility.
6. Accessible controls and honest nonvisual limits.
7. Measured performance and bounded resources.
8. Lifecycle, persistence and recovery reliability.
9. Privacy, security and preserved site regressions.
10. Genuine TDD evidence, maintainability and reproducibility.

Independent TODD reviews the exact candidate commit and content inventory, reruns relevant checks, inspects actual rendered states, and records findings. Acceptance requires all ten scores, arithmetic mean at least 95, agreed mandatory evidence and no unresolved critical/high defect. A wholly unverified category gets 1; a category missing required evidence cannot exceed 84. No score has been awarded to this unimplemented plan, and no numerical score certifies real-world simulation accuracy.

## Later releases — explicitly not first-release features

1. Road-trip assignment and congestion: route workers to jobs, enforce road throughput, measure travel times; decorative moving cars are never called a traffic model.
2. Explicit power/water distribution, wastewater and waste collection with capacity/budget tradeoffs.
3. Buses and transit routes, density policies, land value and redevelopment.
4. Fire/flood/disaster events with deterministic seeds, warnings, service response and recovery finance.
5. Household cohorts, education/labor specialization, more detailed industry/supply chains and policy effects.
6. Larger maps/chunked rendering, replayable scenarios and optional real-world geographic data with attribution and licensing checks.
7. Cloud saves or multiplayer only after a separate authoritative backend, abuse model and hosting review.

## Current execution state and exact blocker

Verified during preparation:

- Repository cloned at the baseline above; existing source is Flask plus self-hosted Canvas/ES modules.
- An HTTPS GET to `https://cmduniverse.com/` redirected to `https://www.cmduniverse.com/`; the latter returned the existing Legit Arcade HTML.
- Independent planning review inspected architecture, integration hazards and the simulation proposal. This was a plan review, not an implemented-game TODD acceptance.
- The review identified two plan ambiguities, corrected here: deficit decommissioning must remain possible, and monthly growth must share/reserve utility capacity. Concrete action/state schemas and numeric balancing constants remain Stage 0 work; worker interfaces are not yet frozen.
- OpenCode CLI 1.3.1 was installed in a temporary tooling directory and executed `--version` and `models opencode`. Listing models does not prove provider inference, coding workers or an isolated runner.
- Bubblewrap isolation probes were denied by this environment: creating a network namespace failed with `NETLINK_ROUTE socket: Operation not permitted`; a user-namespace probe failed with `setting up uid map: Operation not permitted`. Docker is not available on PATH. No replacement online worker runner was enabled.
- No model inference, paid provider usage, product implementation, production changes, city tests or city deployment occurred.

`AGENTS.md` grants the direct-Codex implementation exception specifically to Neon Breaker. It otherwise retains OpenCode implementation and independently reviewed release gates. The city request authorizes the new game but does not explicitly extend that implementation-platform exception. The applied OpenCode delivery skill also requires user direction before substituting direct Codex for OpenCode.

Smallest next decision: extend the direct-Codex exception to CMD City, retaining tests-first development and independent TODD review. Alternatively, provide an available isolated OpenCode runtime that meets the existing execution rules. After either path is established, proceed through the stages above. Keep this source branch separate from main until an implementation is reviewed; do not deploy a plan as though it were a game.

PythonAnywhere publication also requires the deployed account, project path, virtualenv/static mappings and authorized deployment access to be verified at release time. No working PythonAnywhere deployment credential or current game deployment path was established in this preparation. Never infer access from the public site being reachable, and never commit credentials or production configuration secrets.
