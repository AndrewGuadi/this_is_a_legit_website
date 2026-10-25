# CMD City future systems — integration contract, CMD-05

Standalone implementation: `static/cmd-city/future.mjs`. This module is tested independently and **is not integrated into the game or save format yet**. The existing city schema remains authoritative until a separate integrated migration/review changes it. The module never makes a full-reference equivalence claim.

Primary capability basis is the EA expansion material documented in `READINESS_GAPS_05.md`: mixed-use towers with balanced internal services, wealthy/educated staffed research, and finite resource-consuming corporate industry with revenue and pollution. Original numerical balancing is explicit. No named-life-history or closed-payroll requirement is inferred.

## State and canonical ownership

`city.future` has exact keys:

- `version: 1`
- `lastMonth`: current `city.month`, or `city.month + 1` only during the monthly transaction
- `towers`: sorted unique records `{ tile, floors }`; each existing tower tile has exactly one record
- `composite`: integer corporate product stock, 0–1,000,000
- `ledger`: `{ month, openingComposite, produced, sold, closingComposite, oilUsed, oreUsed, revenue, pollution, sites }`; `sites` is a sorted unique list of `{ tile, produced }` for actual production sites in the last booked month

Tower floors are ordered bottom to top, each exactly `{ use, enabled }`. Uses: `homes`, `shops`, `offices`, `power`, `water`, `school`, `park`, `crown`. One to twelve floors, at most one crown, and the crown must remain last. Adding another use inserts it immediately below an existing crown. Corporate ledger site records describe historical production and remain valid after the original facility is demolished; they must not be relabeled current production.

`tile.occupancy` remains the sole population count. Households continue to own demographics, private wallets, shopping and taxes. This module never adds/removes residents, books wages or consumes retail goods. Enabled home floors each provide 90 resident capacity. Closing/removing home floors rejects if remaining enabled capacity would fall below current occupancy. Physical home capacity remains while power/access is unavailable; the core's gradual contraction rules handle unmet needs.

Existing towers migrate with enough home floors to preserve both current occupancy and legacy level capacity: 2/5/12 floors for levels 1/2/3, corresponding to 180/450/1,080. New towers start with two home floors; the remaining ten slots support mixed uses. A completely occupied legacy level-3 tower needs genuine vacancies before housing can be replaced. The module never evicts residents merely to allow a floor action.

## APIs

- `createFuture(city)` returns complete version-1 state for the city's current month. Used for new cities and strict old-city migration after old state has been validated. No historical income, product or production is invented.
- `validateFuture(state, city)` validates exact shape, canonical capacity, tower coverage/order, floor/crown rules, month alignment, bounded values and corporate ledger identities. Returns true or throws. No mutation.
- `syncFuture(city)` reconciles newly placed and demolished towers inside the caller's guarded transaction. Call after **each** structural mutation, before save validation; do not demolish and rebuild the same index without reconciling. It preserves existing valid floors and corporate product/history, initializes new tower floors and removes demolished floor records. It does not mutate tile population.
- `futureTowerCapacity(city, tileIndex)` returns current enabled home-floor capacity, or zero if there is no future tower record. The core must use it wherever it currently assumes `capacity(tile)` for towers, including growth, upgrades, validation and UI. Once floors exist, a generic tower level upgrade must not silently multiply housing capacity.
- `futureReport(city, metrics)` validates state and returns fresh derived reports and a deep copied ledger. It never mutates state or advances time. Inputs are actual `operationAccess` (or `access`), `jobFill`, and power/water utility ratios. Optional `futureWaterAvailable[tile]` supplies the core's actual finite shared-water allocation; when present, zero/missing reservations yield zero internal output. Without that allocation the report caps potential water output by finite `city.groundwater`; this is not permission to allocate the same reserve repeatedly across towers. Each tower report contains floors/status/resident distribution, housing capacity, physical job capacity, currently utility-eligible jobs, actual staffed jobs, shopping bundles, education places, internal power/water supply/ratios, park/crown benefits, enabled-floor upkeep and explicit dependency blockers. `physicalJobs` lets the core establish available work without reading a circular already-staffed count.
- `futureAction(city, action, metrics)` supports `addFloor` (`index`, `use`), `removeFloor` (`index`, `floor`), and `setFloorEnabled` (`index`, `floor`, boolean `enabled`). Returns `{ ok, message }`. Validated rejected actions preserve all fields. Additions require vertical research and a connected, active tower; additions/removals charge real treasury funds. Zero-cost shutdown/reopening works with a negative treasury. Actions are rejected inside a partially booked month. The caller still enforces whole city/region byte-budget rollback.
- `canResearchFuture(city, metrics)` verifies a connected active institute with at least twelve actual filled jobs, working utilities, and at least twelve educated employed middle/high-wealth adults in active connected homes. It uses **current `metrics.homeEmployment`**, not last month's household wages/employment. This is a citywide workforce prerequisite, not a claim to track which specific educated adult works in the institute. The content/core integration defines which future research topics require this gate, their points and prerequisite edges.
- `advanceFuture(city, metrics)` must run once after current regular production and before municipal finance; it marks `lastMonth = city.month + 1`, as the household hook does. It consumes real oil and ore, updates corporate product and the exact current ledger, then returns `futureReport`. It does **not** mutate treasury: the core books `ledger.revenue` once in the monthly finance transaction, subtracting enabled-floor upkeep once. Repeated calls before the city's month increment return the same ledger without consuming material or earning again. After `city.month++`, state markers are stable. Terminal month and malformed inventory reject before writes.

## Floor mechanics and integration consequences

| Use | Physical capacity | Staffing requirement | Connected consequence |
|---|---:|---:|---|
| Homes | 90 residents | 0 | Actual canonical housing; explicit population is distributed among enabled floors in reports |
| Shops | 48 purchase bundles | 12 jobs | Actual household shopping integration must reserve this finite capacity and consume existing goods/cash exactly once |
| Offices | 40 jobs | 40 positions | Adds real reachable employment capacity; no independent free revenue is emitted by this module |
| Power | 400 power units | 8 jobs | Actual staffed internal production can support other uses when external power is absent |
| Water | 300 water units | 8 jobs | Requires power and staffing; internal output can support other uses when external water is absent |
| School | 80 places | 8 jobs | Household education integration must allocate finite places once, not duplicate existing enrollment |
| Park | 8 benefit units | 2 jobs | Finite staffed local benefit; no invented visitor trips |
| Crown | 12 benefit units | 4 jobs | One top-floor benefit, subject to staffing and utilities; distinct reference crown variants are not implemented here |

Staffed internal quantities use actual per-role staff. Without an explicit reservation the standalone report assigns the existing actual filled count in critical-first order: power, water, school, shops, offices, park, crown. It exposes `criticalJobs`, `jobsByUse` and `staffByUse`. Empty office positions cannot dilute or create utility staff. When `metrics.futureStaffByUse[tile]` is present, it must have all eight use keys with exact counts, each within its enabled physical capacity and summing to the actual `jobFill`; the report honors those reservations without reallocating them. Removing internal power while external power is unavailable shuts down dependent shopping and schooling, while residents remain canonical until core growth responds. Reported physical jobs and actual staffed jobs remain distinct. These are role allocations, not skill-specific individual job identities.

The core integration must cap internal water floors against the same finite groundwater reserve as existing pumps, pass actual per-tower `futureWaterAvailable` reservations, and subtract consumed water once through its existing pumping ledger. Exhausted groundwater cannot be bypassed by internal utility ratios.

The core integration must avoid circular double-counting: use physical enabled jobs for employment eligibility under actual utilities; use actual staff for produced internal supplies and service outputs; do not add internal generation twice to both a local ratio and the same global demand calculation. The integration order below makes critical reservations explicit and must be tested. The standalone tests establish local dependency arithmetic, not the final integrated core schedule.

### Proposed exact integration order

Run the extra phases only when active future utility floors exist; ordinary cities retain the existing path.

1. Determine enabled physical jobs per floor and the actual road graph. Reserve real commuters for power-floor jobs, then water-floor jobs. Critical utility positions require reachable willing workers but do not require their own not-yet-produced utility output. Do not create a synthetic worker to start them.
2. Carry forward every home-to-job assignment, worker remainder, road load and transit/terminal reservation. The later regular-job pass starts from these balances, not fresh arrays. Record critical staff counts by tower/use.
3. Produce potential internal power from the reserved power staff. Establish the finite shared water budget across regular pumps and staffed internal water floors, including their real power requirement. Allocate water deterministically without assigning the same groundwater twice. Pass actual `futureWaterAvailable` reservations.
4. Either offset each tower's demand with local generation then distribute global supply to the remainder, or add all generation to the global allocation once. Do not both add gross output globally and override that tower's local ratio with the same output. A coherent per-home utility result is required if local self-sufficiency is retained.
5. With those utilities fixed, allocate only regular job slots using remaining actual workers/routes. Unfilled critical slots are excluded from this later pass; newly available transit cannot retroactively invent staff used in step 3. Produce explicit `futureStaffByUse` for every tower, including zero roles, whose totals equal final tower `jobFill`. This prevents a report from greedily moving regular-job workers into a critical role after utility production was decided.
6. Use finite actual shop/school capacity once in household allocation. Apply core growth against floor housing capacity and actual utility/needs results. Run finite corporate production once after ordinary production, inject its recorded per-site emissions once, and book corporate revenue plus enabled-floor operating upkeep once before committing the month.
7. When cloning, serializing, advancing, closing infrastructure or changing floor uses, rederive the same schedule deterministically. Reject any transaction that breaks canonical population, role counts, resource identities or encoded budgets. Report functions remain pure. If stage 1 or stage 5 needs transit, they must share the same reservation object/counters.

This is a proposed integration contract, not a claim these phases already exist in core. Integration tests must cover a powerless tower with actual critical workers, no-workers/no-output, mixed utility failure, competing tower/pump water scarcity, simultaneous office capacity, full road/transit conservation and exact replay.

Minimum integrated hooks: (1) future capacity in core growth/save/inspector, (2) reachable office/service jobs, (3) internal shop and school capacity in the existing household allocator, (4) internal utility effects and unmet-needs consequences, (5) once-only floor upkeep, corporate revenue and per-site pollution, (6) guarded floor controls, clear report/inspector UI and saved schema migration. Merely displaying the report without these hooks does not complete mixed use.

## Corporate economy

The expected content tool ID is `consortium`; the content integration must define build cost, upkeep, jobs, unlocks and rendering. Operational facilities have twelve staff positions, 8 base production batches, and module multiplier `1 + modules * 0.5` (0–3 modules). Each composite consumes two oil and one ore, bounded by real stock, actual staffing, utilities and the product-stock limit. The ledger records exact produced units per site; pollution is four units per produced composite and must be injected at those sites exactly once by environmental integration.

Sales require current staffed, connected, utility-operating corporate capacity, actual stored product and finite local demand. Eligible active connected commercial/industrial lots request one composite per four actual filled positions, capped by their occupancy. Sales are further bounded by the same finite corporate distribution capacity. A closed/unstaffed/disconnected/unpowered network retains product rather than selling through unavailable infrastructure. Sales remove composite exactly once and return 5,000 minor currency units each as explicitly external commercial-sale income. This is not a private-firm payroll conservation claim. Detailed franchise conversion, delivery vehicles, distribution destinations and regional franchising remain later scope.

Identities validated every month:

`openingComposite + produced - sold = closingComposite = state.composite`

`oilUsed = 2 * produced`, `oreUsed = produced`, `revenue = 5000 * sold`, `pollution = 4 * produced`, `sum(sites.produced) = produced`.

Global product persists through facility demolition. The module does not discard stock on closure, removal or loss of access. Input resources are the existing inventory's oil/ore; outputs must not also be invented in `inventory.goods` or `inventory.electronics`.

## Remaining scope and evidence

Fusion/tidal facility types, a complete research catalog, multiple crown variants, rich franchise delivery/region effects, actual drone journeys, robot disaster and final core/UI/save integration are not implemented by this standalone module. These are explicit subsequent work, not unverified completed features.

Actual scaffold RED and corrective RED/GREEN evidence are under `evidence/CMD-05/future/`. Corrective cases cover closed-network sales, strict ledger bounds, current employed research workforce, negative-cash shutdown and crown ordering. The synthetic standalone fixtures do not prove a playable UI or production deployment. Independent integrated review is still required after the module is wired into core and persistence.

## Next future feature phases

After tower/corporate integration is verified, add explicit research/content and tested effects for fusion and tidal generation, using finite staffing/utility/resource rules and real shore suitability. Then implement corporate franchise destinations/delivery and actual drone tasks with bounded payload/range/conservation; add the documented robot-event damage/recovery family. Existing generic radius benefits must not be relabeled routed drones. Detailed crown variants/research dependencies still require the primary inventory identified in the readiness audit. These phases do not authorize copying reference assets or weakening deployment gates.
