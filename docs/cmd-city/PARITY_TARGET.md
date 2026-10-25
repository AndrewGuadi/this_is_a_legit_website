# CMD City — feature equivalence target

## Scope and meaning

Andrew approved direct Codex implementation with independent review, then explicitly required feature-to-feature equivalence. That instruction expands the small first-playable scope in `BUILD_PLAN.md`; its later-release exclusions must not be mistaken for exclusions from the final parity target.

**Working comparison:** SimCity (2013) plus Cities of Tomorrow. This edition is the implementer's stated assumption, not a user-confirmed edition. SimCity 4, SimCity 2000 and SimCity BuildIt have different systems. Reconfirm the comparison if the user names one of them. Separately catalog other add-ons rather than silently blending every franchise release into one baseline.

The project remains an original game: original source, art, names, interface and balancing. Equivalence means comparable player capabilities and connected consequences, not use of EA assets, exact numerical tuning, undocumented engine internals or reproduction of bugs. No current implementation is certified equivalent by this document.

**All rows below start PLANNED.** This is a baseline/backlog artifact produced before reviewing the implementation. A later verification report must reference these stable IDs and the exact candidate; changing a status requires code and evidence. A menu label or decorative animation is insufficient.

## Primary evidence

- **M — EA's SimCity PC manual:** [official PDF](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf). Printed pages 10–31 cover construction, infrastructure, civic services, transport and specializations; pages 32–35 cover finance, requests and regional activity. The manual establishes the feature families, not a complete executable specification.
- **C — EA's Cities of Tomorrow page:** [official expansion page](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-cities-of-tomorrow). Establishes vertical mixed-use development, clean technology versus corporate exploitation, research, drones, and a new robot disaster. Detailed tower internals and research catalogs need further primary observation before exact parity acceptance.
- **P — EA's base-game page:** [official product page](https://www.ea.com/games/simcity/simcity). Distinguishes editions and lists add-ons; its current disclosure says online features will be discontinued. This is not evidence that every online function is already unavailable, nor a reason to erase historical online gameplay from a parity ledger.
- **D — EA's Deluxe page:** [official upgrade pack](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-digital-deluxe-upgrade-pack). Identifies additional city sets and hero/villain content, outside the assumed base-plus-expansion comparison.
- **A — EA's park page:** [official Amusement Park Set](https://www.ea.com/games/simcity/simcity/buy/addon/amusement-park-set). Identifies a separately sold park-building system.

The target labels are a concise inventory of documented systems. The acceptance scenarios below are **our proposed original test specifications**, not quotations from EA, claims about exact original algorithms, or proof that these features already exist. Limits, route behavior and numeric matching still need reference playtests where documentation is incomplete.

## Construction, population and management

| ID | Target | CMD City acceptance scenario | Status |
|---|---|---|---|
| 001 | Road access | Delete a sole gateway link; dependent lots identify access loss. | PLANNED |
| 002 | Road classes | Upgrade a bottleneck; measured network capacity increases. | PLANNED |
| 003 | Road geometry | Draw straight, curved, circular and block layouts; previews cancel safely. | PLANNED |
| 004 | Zoning | Paint each R/C/I category; redevelopment changes permitted uses. | PLANNED |
| 005 | Density | Compare otherwise identical lots with different road/service eligibility. | PLANNED |
| 006 | Wealth | Raise local desirability; observe class transitions without inventing residents. | PLANNED |
| 007 | Employment | Close workplaces; expose vacancies, workers and unemployment separately. | PLANNED |
| 008 | Consumption | Remove reachable shops; household satisfaction reflects unmet consumption. | PLANNED |
| 009 | Goods | Interrupt commercial supply; inventory and sales respond. | PLANNED |
| 010 | Abandonment | Sustain unmet needs, then restore service and verify recovery. | PLANNED |
| 011 | Land value | Compare local amenities and externalities on equal terrain. | PLANNED |
| 012 | Demand | Overbuild one sector; demand reacts to the resulting imbalance. | PLANNED |
| 013 | Building modules | Expand an existing facility; capacity, footprint and upkeep change together. | PLANNED |
| 014 | Open/close | Suspend a facility, retain its structure, then reactivate consistently. | PLANNED |
| 015 | Government unlocks | Reach a milestone; inspect the actual newly available capability. | PLANNED |
| 016 | Taxes | Compare sector/class schedules and measure their booked effects. | PLANNED |
| 017 | Budget | Reconcile construction, operations, trade and financing with treasury changes. | PLANNED |
| 018 | Bonds | Borrow, service debt, reach borrowing limits and verify repayment arithmetic. | PLANNED |
| 019 | Approval | Diagnose low approval using reproducible household/business causes. | PLANNED |
| 020 | Requests | Accept, reject, cancel and complete a tracked objective exactly once. | PLANNED |
| 021 | Tutorial | Complete introductory actions through real controls, then replay safely. | PLANNED |
| 022 | Sandbox | Change enabled rules without contaminating normal achievements/saves. | PLANNED |

Reference family: M. Road geometry, per-class taxation, bonds and modular expansion are scope requirements; a tile-placement approximation must remain marked PARTIAL until they exist.

## Infrastructure, environment and public services

| ID | Target | CMD City acceptance scenario | Status |
|---|---|---|---|
| 023 | Power | Overload supply; record a bounded, visible service deficit. | PLANNED |
| 024 | Fuel | Exhaust a stocked input; generation stops until a delivery arrives. | PLANNED |
| 025 | Clean generation | Compare clean and polluting investments with equivalent load. | PLANNED |
| 026 | Water table | Pump a deposit repeatedly; extraction and replenishment reconcile. | PLANNED |
| 027 | Contamination | Expose a source; filtering changes delivered quality and consequences. | PLANNED |
| 028 | Sewage | Disable treatment; waste accumulates instead of disappearing. | PLANNED |
| 029 | Garbage | Block collection; affected buildings retain a growing backlog. | PLANNED |
| 030 | Recycling | Recover materials; prevent double-counting waste and output inventory. | PLANNED |
| 031 | Air pollution | Observe spatial exposure under configured emissions and transport rules. | PLANNED |
| 032 | Ground pollution | Remove an emitter; persistent contamination decays under explicit rules. | PLANNED |
| 033 | Radiation | Trigger an eligible event; map affected land and persistent restrictions. | PLANNED |
| 034 | Fire | Ignite a controlled test incident; dispatch changes damage outcomes. | PLANNED |
| 035 | Health | Compare illness, treatment capacity, access and unmet patients. | PLANNED |
| 036 | Crime | Change prevention/custody capacity; incident and backlog metrics respond. | PLANNED |
| 037 | Education | Track eligible learners, attendance, capacity and attainment separately. | PLANNED |
| 038 | Technology | Satisfy education/research requirements; industry capability changes. | PLANNED |
| 039 | Parks | Verify local benefit, visitor demand and ongoing cost. | PLANNED |
| 040 | Service vehicles | Block a route; dispatch arrival and service completion are delayed. | PLANNED |

Reference family: M. A radius bonus alone does not satisfy incident handling, staffing, dispatch or vehicle routing. Power, water and sewage distribution must expose capacity and disruption; merely drawing lines is insufficient.

## Movement, commerce and regional play

| ID | Target | CMD City acceptance scenario | Status |
|---|---|---|---|
| 041 | Traffic | Assign actual trips; congestion responds to shared route capacity. | PLANNED |
| 042 | Buses | Run a served route; verify riders, waits and displaced car trips. | PLANNED |
| 043 | Streetcars | Connect eligible track/stops; disconnected service carries nobody. | PLANNED |
| 044 | Trains | Reconcile regional arrivals/departures with station throughput. | PLANNED |
| 045 | Ferries | Require connected navigable terminals; measure transported travelers. | PLANNED |
| 046 | Aircraft | Reconcile passenger/cargo throughput with a working air connection. | PLANNED |
| 047 | Mining | Extract finite deposits; stock changes equal actual production. | PLANNED |
| 048 | Petroleum | Trace extracted input through storage and processing. | PLANNED |
| 049 | Electronics | Halt a supply-chain stage; dependent production cannot continue freely. | PLANNED |
| 050 | Trade | Buy/sell bounded stock; reconcile inventory, deliveries and money. | PLANNED |
| 051 | Tourism | Connect attractions, arrivals, spending and demand for transport. | PLANNED |
| 052 | Gambling | Track profit alongside visitors and civic externalities. | PLANNED |
| 053 | Cultural events | Schedule an event; capacity and attendance bound its result. | PLANNED |
| 054 | Landmarks | Place original icons; inspect attraction and operating consequences. | PLANNED |
| 055 | Multiple cities | Switch among saved cities without overwriting another city's state. | PLANNED |
| 056 | Regional exchange | Transfer utilities, resources or services with conservation and delivery rules. | PLANNED |
| 057 | Commuting | Reconcile cross-city workers and jobs without duplicating travelers. | PLANNED |
| 058 | Shared projects | Contribute resources to a regional project; unlock shared benefits once. | PLANNED |
| 059 | Disaster systems | Exercise each reference event family and its recovery path. | PLANNED |
| 060 | Data views | Select a metric overlay; reported totals reconcile with underlying entities. | PLANNED |
| 061 | Time controls | Equal simulated duration yields equal state at every display speed. | PLANNED |
| 062 | Save/resume | Restore authoritative state and continue a deterministic future. | PLANNED |

Reference family: M. Decorative cars, fixed external-demand numbers or a stock “neighbor” button are partial stand-ins, not equivalent traffic or regional exchange.

## Future-city expansion

Use **Sky Districts**, **Civic Research Institute**, **Consortium Industry**, **Aerial Services** and **Sentinel Failure** as working original names. They describe proposed equivalents, not exact reproductions of expansion lore or assets.

| ID | Target | CMD City acceptance scenario | Status |
|---|---|---|---|
| 063 | Vertical mixed use | Add distinct tower uses; reconcile internal demand and external connections. | PLANNED |
| 064 | Tower interdependence | Remove one essential use; dependent occupied sections report consequences. | PLANNED |
| 065 | Clean-tech research | Fund and complete research before unlocking the resulting infrastructure. | PLANNED |
| 066 | Reduced extraction | Substitute a researched system; measured resource consumption decreases. | PLANNED |
| 067 | Service drones | Replace eligible service trips; reconcile payloads, range and throughput. | PLANNED |
| 068 | Corporate production | Link resource demand, production, revenue and pollution without free output. | PLANNED |
| 069 | Future movement | Verify a researched transport alternative moves demand over a real network. | PLANNED |
| 070 | Robot disaster | Trigger a bounded original failure scenario and validate damage/recovery. | PLANNED |

Reference family: C. These are authored acceptance decompositions of the official expansion's broad capabilities. Exact tower level inventories, internal transport, research prerequisites, franchising and future transit variants remain **REFERENCE DETAIL UNVERIFIED** until supported by additional primary material or licensed-game observation. That uncertainty prevents a literal-equivalence claim; it does not remove them from the target.

## Online services and add-on boundaries

The launch manual documents network features. An offline-first release may be useful while they are missing, but must not be advertised as literal full feature equivalence. Do not connect to EA accounts/services; any online equivalent requires our own identity, authorization and authoritative backend design.

| ID | Target | CMD City acceptance scenario | Status |
|---|---|---|---|
| 071 | Shared-region multiplayer | Two authorized players change distinct cities and observe consistent shared effects. | PLANNED |
| 072 | Invitations/access | Test allowed entry, denied entry, revocation and private-region discovery. | PLANNED |
| 073 | Region communication | Authorized participants exchange moderated region messages with bounded storage. | PLANNED |
| 074 | Global market | Reconcile market orders and delivered resources across participating cities. | PLANNED |
| 075 | Challenges/rankings | Verify authoritative scoring, eligibility and duplicate submission protection. | PLANNED |
| 076 | Achievements | Award an eligible result once; exclude sandbox manipulation. | PLANNED |
| 077 | Cross-device saves | Resume the same authorized save after conflict-safe synchronization. | PLANNED |
| 078 | Activity feed | Show permitted regional events without leaking private-city activity. | PLANNED |

Reference families: M and P. Online-service availability is time-sensitive; the current store disclosure is not a complete retirement schedule. These targets are historical capability equivalents, not a promise to integrate with an existing EA network.

Other content remains a **separate unresolved edition checklist**, not part of the current assumed comparison: city-themed sets, airships, hero/villain content, amusement parks, branded/promotional items and any limited/preorder bonuses. P, D and A establish that separately distributed content exists. Before claiming “Complete Edition equivalence,” enumerate their actual playable effects and give them stable IDs. Do not copy brands or substitute an image for a functional equivalent. Digital storefront, DRM and paid licensing are distribution mechanisms rather than gameplay objectives.

## Verification and reporting

Keep implementation progress in a separate candidate-bound ledger with four statuses:

- **MISSING:** no working equivalent.
- **PARTIAL:** a subset/approximation exists; explicitly name what remains.
- **IMPLEMENTED:** the authored acceptance behavior runs, with test and UI evidence.
- **EQUIVALENCE VERIFIED:** the applicable reference behavior has been compared under a documented scenario and independent review accepts the match.

PLANNED in this baseline means no implementation assessment was performed. Never infer that later code is absent from this pre-implementation artifact; use the current ledger.

The following are not valid shortcuts: counting buttons as features; counting multiple visual variants as new simulated systems; declaring a radius-based proxy equal to a routing simulation; averaging dozens of small completions to hide a missing major system; or treating successful unit tests as a reference-game comparison.

Full parity requires every in-scope row and its discovered subfeatures to be verified, with unresolved reference detail and edition decisions closed. The 78 rows are a researched starting inventory, not proof of an exhaustive feature catalog. Maintain per-system evidence and test interdependencies, save compatibility, performance and operational feasibility. A milestone can be playable and independently reviewed while remaining far from parity; report both facts plainly.
