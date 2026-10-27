# CMD City — reference inventory and observation backlog

## Confirmed comparison and evidence boundary

Andrew has now confirmed **SimCity (2013) plus Cities of Tomorrow** as the target. This updates the version assumption stated in the earlier target/status snapshots; it does not by itself close any implementation gap. This document expands reference work only. It does not edit the 78-ID ledger, score a candidate or certify equivalence.

Read: the complete official 18-page base-game PDF, including its paired printed pages 2–35, and the official expansion product description. These sources establish named systems and some relationships, but neither provides a complete item/module/research tree. **Equivalence verified remains zero.** Any detail absent from these sources needs additional primary material or a documented run of the licensed reference game.

Sources:

- **M:** [EA's complete PC manual](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf). Links below use the PDF's physical page numbers; printed page numbers are supplied separately because they differ.
- **C:** [EA's Cities of Tomorrow product page](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-cities-of-tomorrow), About the game section. Product requirements and promotional images are not a complete simulation specification.

Evidence labels in this document:

- **Named:** a particular object/control is explicitly named in source text.
- **Family:** a capability is described, but the variants, exact module inventory or prerequisites are not enumerated.
- **Observe:** do not fill the detail from memory or treat a plausible original implementation as a reference match.

## Compact source inventory

This is a compact factual index rather than copied manual prose. The later test recipes are authored engineering proposals, not source quotations or claims about undocumented reference algorithms.

| Category | Named or described reference objects | Anchor |
|---|---|---|
| Roads/zoning | Straight, curved, arc, circle, rectangle; upgrades, guides, unzoning, R/C/I, density/value | [M: printed 10–13](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=6) |
| Buildings | Open/close; editable productivity modules | [M: 14](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=8) |
| Power | Plant family; fuel trade; powered/off/unpowered; radiation | [M: 15](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=8) |
| Water/sewage | Water tower; pumping station; filter pumps; output pipe | [M: 16–17](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=9) |
| Waste | Dump; trucks; recycling; metal/alloy/plastic | [M: 18–19](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=10) |
| Civic | Town/City Hall; six departments; Finance, Safety, Education named | [M: 19–20](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=10) |
| Emergency | Fire stations/garages; clinic/ambulances/waiting room; police/patrol lots | [M: 21–23](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=11) |
| Education | School/capacity modules/bus stops; community college | [M: 23–24](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=12) |
| Transport | Bus/stops; streetcar/railed avenue/stops; train; ferry/cruise; aircraft/runways | [M: 24–26](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=13) |
| Specialization | Parks; expo/stadium/landmarks; mining; petroleum; depot; gambling; electronics | [M: 26–30](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=14) |
| Expansion | Mixed-use towers; clean technology; corporate exploitation; research; drones; robot attack | [C: product description](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-cities-of-tomorrow) |

The base manual also covers loans, requests, population reports and regional exchange in its closing sections. Its launch-era network descriptions must be separated from later service availability.

## Exact details still needed before closing the catalog

The following table identifies what must be captured rather than inventing a supposedly exhaustive building list. Page anchors establish where the capability is discussed; **Observe** marks details the supplied sources do not resolve.

| Backlog | Existing parity IDs | Missing reference capture | Original acceptance recipe to prepare |
|---|---|---|---|
| R01 — road inventory | 001–003, 005, 041 | Observe every road class, permitted geometry, crossing/elevation options, intersections, upgrade/downgrade constraints and associated density eligibility. The manual lists drawing families, not every class. | Save a reproducible network; change one segment; assert topology, funds, capacity, lot eligibility and cancel behavior independently. |
| R02 — growth catalog | 004–012 | Observe wealth versus density, lot-size/spacing requirements, upgrade conditions, business failure and abandoned-building states. | Hold demand constant while changing one eligibility factor; track capacity separately from occupants and property class. |
| R03 — modular assets | 013–014 | Observe each facility's editor, physical module footprints, attachment rules, staffing and optional special functions. A single generic multiplier is insufficient evidence. | Place two different module types; verify that each changes its own capability and cannot overlap or manufacture workers. |
| R04 — generators | 023–025, 033 | Observe the actual generation catalog, fuel choices, staffing, storage/delivery rules, output variability and failure/radiation conditions. The text does not enumerate all plant variants. | Interrupt one required input while holding others fixed; compare predicted output, consumed stock and actual service on the next tick. |
| R05 — hydrology | 026–028 | Observe source-local water availability, recharge, pollution transfer, filtering and treatment alternatives/unlocks. | Run a contaminated source with and without treatment, then stop the source; reconcile delivered quality and residual contamination. |
| R06 — sanitation | 029–030 | Observe every collection vehicle/module, storage, processing/burning choice, recyclable stream and recovered output. | Route a bounded load from an origin through collection and processing; no material may be counted twice. |
| R07 — incident response | 034–036, 040 | Observe incident types, dispatch eligibility, vehicle fleets, queues, handling times, recovery and intercity aid. | Compare identical incidents with a clear route, blocked route and saturated responder pool; report unmet cases explicitly. |
| R08 — learning | 037–038 | Observe age/learner eligibility, enrollment, transport, distinct school tiers and the actual effects on industry/unlocks. The manual's named college must not be replaced silently by a generic university counter. | Preserve one learner cohort through enrollment/attendance/completion; interrupt access and verify no free attainment. |
| R09 — passenger modes | 042–046 | Observe stop/station/terminal variants, track/road/water eligibility, vehicles, schedules, wait metrics and wealth access. | Every reported rider must have a valid origin, destination, capacity reservation and completed or explicitly failed journey. |
| R10 — extract/process | 047–049 | Observe extraction/processing building menus, headquarters/upgrades and complete material/product graphs. A generic final electronics output does not establish a complete chain. | Disable one intermediate plant; downstream outputs must stop when its buffered input is exhausted. |
| R11 — commerce | 050 | Observe depot/port storage types, market order quantities, supply delays, prices, cargo vehicles and movement through the region. | Simulate order→reservation→departure→arrival→settlement; reconcile every resource and financial leg. |
| R12 — visitors | 039, 051–054 | Observe attractions, event variants, wealth profiles, visitor decisions, admission/operating settlement and transport pressure. | Reconcile arrivals, visits, departures and spending; capacity must cap outcomes rather than grant flat income. |
| R13 — disasters | 059, 070 | Observe the full base/expansion inventory, profile unlocks, triggers, damage, persistent effects and recovery. The manual does not give an exhaustive named list. | Record one deterministic scenario per event family; require stateful impact, limits and a recoverable or explicitly terminal outcome. |
| R14 — reports | 019, 060, 078 | Observe report categories, per-sector feedback and source-of-truth totals; map menu completeness rather than one generic overlay. | Recompute a displayed total from independent authoritative entities and explain any aggregation or rounding. |

These are backlog tasks, not additional hidden release gates for an unrelated milestone. They make the final parity target reviewable and prevent unknown details from becoming unacknowledged omissions.

## Government: avoid silently substituting a different progression

Relevant source: [M printed 19–20](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=10), plus [budget on printed 31](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=16).

The manual supports a sequence of initial civic permission, upgraded sector control and a finance specialization with finer class control. It also describes regional department benefits and population-related upgrade opportunities. It does **not** supply the complete thresholds, prices, department reward table or every prerequisite edge.

For this project, retain the six supplied reference department labels: **Education, Finance, Safety, Tourism, Transportation, Utilities**. Evidence precision matters: the manual text explicitly names the first three and states there are six choices; the remaining three exact labels are a project-provided reference inventory awaiting additional primary capture. The screenshot on printed page 20 is not a legible complete department catalog. Do not cite that image as proof of all six labels.

Recommended authored tests for the civic worker:

1. An ineligible application must preserve cash, upgrade entitlements and region state.
2. Initial permission, sector-level controls and class-level controls should be distinct state transitions, with visible reasons when unavailable.
3. Population milestones should grant a bounded entitlement once; shrinking and regrowing must not duplicate it.
4. Department choices must activate distinct capabilities; renaming the same multiplier six times is insufficient.
5. A regional entitlement should be represented once and consumed/queried consistently across saved cities. Closing a structure, losing its owner or reloading must have a defined effect.
6. Existing/starter-city compatibility needs an explicit migration rule so older saves cannot gain free unlocks or become permanently unplayable.
7. Observe the original class schedule before calling a single R/C/I slider equivalent. Preserve the difference between taxes, funding, debt and milestone permissions.

Do not claim exact reference prerequisites from our first implementation's chosen thresholds. Numeric balancing can remain original while the capability graph is progressively compared and documented.

## Research and expansion dependencies

Source links: [M education, printed 23–24](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=12), [M industry, printed 28–30](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=15), and [C product description](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-cities-of-tomorrow).

The sources support education as an input to advanced capability and the expansion's research-dependent transformation. They do not provide a complete research technology graph. In particular, the product page does not enumerate the exact institutional levels, ControlNet budgets, future generator variants, tower floors/crowns, Maglev variants, drone modules or corporate franchise prerequisites. Those remain reference capture work, not details to infer from a menu name or fan report.

Working original names remain **Civic Research Institute**, **Sky Districts**, **Consortium Industry**, **Aerial Services** and **Sentinel Failure**. Preserve the capability relationships when choosing original presentation. Reference proper names may appear in engineering comparison records, but imported art/lore/branding is not required.

| Expansion backlog | What needs reference observation | Authored acceptance proposal |
|---|---|---|
| C01 — institutional progression | Every institution level, staffing/wealth requirement, research order and completion condition | Removing a prerequisite must block only its dependent work; retained progress and spent resources need defined persistence. |
| C02 — technology inputs | Capacity, reach, allocation and failure behavior of any required technology-control resource | Allocate shared capacity across all consumers; never let each building claim the same unreserved supply. |
| C03 — vertical districts | Actual residential/commercial/office/service floor catalog, supported stacking rules and inter-tower connections | A saved floor graph must conserve population, jobs and utility demand; loss of one essential node must identify dependants. |
| C04 — tower amenities | Per-floor/crown limits, upgrade/demolition rules and specialized outcomes | Editing a floor cannot duplicate occupants, evade upkeep or leave impossible references. |
| C05 — clean infrastructure | Future generation, water, waste and transportation variants plus their unlocks | Compare input/output ledgers before and after substitution; a researched label alone must not create an effect. |
| C06 — corporate economy | Extraction/manufacture, distribution, franchising, consumer conversion and intercity effects | Track each conversion and delivery through an explicit state transition with reversible failure/recovery rules. |
| C07 — drones | Fleet production, service roles, range, payload, routing and replacement of existing trips | A dispatched vehicle must consume capacity and complete a real task; a larger service radius is a proxy only. |
| C08 — robot event | Trigger, path/target choices, resource drain, damage and countermeasures | Cap destructive action per tick and prove that event state/save/recovery remain internally valid. |

These eight categories elaborate IDs 063–070 without pretending that one research purchase proves the full expansion. A detailed reference comparison may split them further; retain stable parent IDs.

## Regional and lifecycle details often missed

Read [M printed 6–9](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=4), [32–33](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=17), and [34–35](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=18). The launch manual distinguishes a historical online profile/region model from local simulation state. Later offline behavior and current service retirement are separate evidence tasks.

Authored observation/test checklist:

- Record public/private joining, invitations, abandoned-city claiming, region maps/sites and independent city identity without assuming our fixed three-city list covers them all.
- Distinguish resource gifts, market trade, utility contracts and volunteered service fleets; they have different conservation, payment and eligibility rules.
- Inspect the source behavior of borrowed/volunteered capacity before modeling it as removal from the source fleet; the manual's aid description warns against that assumption.
- Separate intercity education/work/visitor movement from the mere ability to switch the camera between cities.
- Track individual people only if there is actual identity/status/destination state; an aggregate worker counter cannot satisfy person inspection/following.
- Distinguish requests from thought/advisor messages; accept, reject, cancel, progress and completion need independent state.
- Keep profile-scoped unlocks, sandbox eligibility, city saves and region saves separate; do not grant profile rewards repeatedly when importing a city.
- Record graphics/audio/gameplay options, camera movement/rotation/tilt, capture tools and control alternatives as interface reference tasks. These do not establish simulation equivalence by themselves.

## Recording format for the next reference session

For each missing catalog item, store: parent parity ID; edition/build; menu path; visible item name; observed function; source URL or recording/screenshot timestamp; prerequisite evidence; footprint/attachments; capacities and units; input/output resources; staffing; upkeep/construction distinction; service/route effects; transitions when disabled, demolished or imported; current original equivalent; remaining gap; and the exact reproducible comparison scenario.

Mark a field **NOT OBSERVED** when evidence is absent. Do not fill costs, throughput, thresholds or simulation internals from memory, assume a fan wiki is primary evidence, or mark the inventory exhaustive because every visible button in our implementation is represented. No paid source access, paid inference or production change was used for this research artifact.
