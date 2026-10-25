# CMD City — implementation progress ledger

This ledger assesses the working-tree implementation against the 78 stable IDs in `PARITY_TARGET.md`. It is a source/test inspection snapshot, **not an independent release acceptance or a claim of SimCity feature equivalence**. The comparison remains the stated working assumption: SimCity (2013) plus Cities of Tomorrow; detailed edition and expansion-reference observations remain unresolved.

## How to read the statuses

- **IMPLEMENTED:** the narrow authored acceptance scenario in the target has a working original implementation. Any remaining reference-game breadth is still listed. This label does not mean the full original feature is replicated.
- **PARTIAL:** useful related behavior exists, but a material part of the authored scenario or reference capability is absent or approximated.
- **MISSING:** no working implementation of the essential target capability was found. A label, related building or generic counter is not sufficient.
- **EQUIVALENCE VERIFIED: 0.** No licensed reference-game side-by-side comparison, exhaustive original feature inventory or literal-equivalence acceptance was performed.

Totals at this snapshot: **15 IMPLEMENTED, 42 PARTIAL, 21 MISSING; 78 assessed.** These counts are not a parity percentage. Major systems have very different scope, and the partial rows must not be counted as completed equivalents.

## Evidence inspected

| Key | Actual source/evidence |
|---|---|
| C | `static/cmd-city/core.mjs`: seeded 40×32 map, construction, graph access, occupancy, employment, finance, aggregate services, extraction and monthly production |
| D | `static/cmd-city/content.mjs`: original tool definitions, units, costs, capacities and four research topics |
| T | `static/cmd-city/transit.mjs`: actual local rail paths and paired bus-exchange path reservations; shared edge capacities |
| R | `static/cmd-city/region.mjs`: three independently seeded cities, atomic shipments, next-month delivery, shared material project and bounded event history |
| S | `static/cmd-city/save.mjs`, `region.mjs`: versioned validated city/region serialization and bounded imports |
| U | `static/cmd-city/game.mjs`, `view.mjs`, `game.css`, `templates/cmd_city.html`: playable controls, original map, inspector, management, overlays, local saves/import/export and lifecycle |
| K | `static/cmd-city/clock.mjs`: explicit paused/running state and fixed-month scheduling at 1×/2×/4× |
| Tests | `tests/city/core.test.mjs`, `transit.test.mjs`, `region.test.mjs`, `save-clock.test.mjs` |
| Browser definitions | `tests/browser/cmd-city.spec.js`: five scenarios at the repository's four viewport widths |

This ledger's author independently executed `node --test tests/city/*.test.mjs`: **76 passed, 0 failed, 0 skipped, exit 0**, approximately 1.6 seconds. This verifies those authored model tests, not individual-reference behavior. The implementation manager separately reported 20 passing city browser checks; the ledger author inspected their definitions but did not rerun them. Full site regressions and candidate release review are managed separately; no result is invented here.

## Construction, population and management

| ID | Target | Status | Implemented behavior and precise gap | Evidence |
|---|---|---|---|---|
| 001 | Road access | IMPLEMENTED | Orthogonal road graph reaches protected gateway; severing the connection changes dependent access. Reference freeform geometry remains outside this narrow scenario. | C, core access/removal tests |
| 002 | Road classes | IMPLEMENTED | Local roads upgrade to higher-capacity avenues; commute assignment observes capacity. Reference road inventory and intersection behavior are incomplete. | C/D, employment and upgrade tests |
| 003 | Road geometry | PARTIAL | Fixed square-tile roads/bridges exist. Curves, circles, arcs and reference drawing previews do not. | C/U |
| 004 | Zoning | IMPLEMENTED | Three original R/C/I types can be placed and redeveloped by demolition/rebuild; development needs access and supplies. Reference frontage painting/unzoning workflow is not fully reproduced. | C/D/U, placement/growth tests |
| 005 | Density | PARTIAL | Paid manual capacity levels exist. Sustained occupancy, road-class eligibility, wealth and service-driven automatic redevelopment are absent. | C `upgrade`, D `capacity` |
| 006 | Wealth | MISSING | Land-value index exists, but households/businesses have no wealth classes or class transitions. | C state and measure |
| 007 | Employment | IMPLEMENTED | Workers, operating jobs and actual commute assignments are distinct; closure/access/supply constrain work. No individual household or labor-skill cohorts. | C, core employment/removal tests |
| 008 | Consumption | PARTIAL | Shops consume citywide goods and contract during shortages. No household money, shopping trips or individual unmet-consumption satisfaction. | C monthly goods/growth |
| 009 | Goods | PARTIAL | Staffed industry adds goods; shops reduce finite stock. No factory-to-shop freight routing or per-business inventory. | C, staffed-production test |
| 010 | Abandonment | PARTIAL | Occupancy declines under shortages and can regrow. No distinct abandoned-building lifecycle, reason history or homelessness simulation. | C growth/shortage |
| 011 | Land value | PARTIAL | Local amenities and industrial emissions change a land-value index. No property market or wealth transitions; effects are radius approximations. | C `measure` |
| 012 | Demand | IMPLEMENTED | Sector demand reacts to workers, jobs, capacity, taxes and satisfaction; empty lots generate no tax receipts. Numeric dynamics are original aggregate rules. | C, growth/employment tests |
| 013 | Building modules | PARTIAL | Paid modules increase utility capacity, service radius or some output/upkeep. Modules have no separate footprint or selectable specialist functions. | C `upgrade`, D |
| 014 | Open/close | IMPLEMENTED | Facilities suspend/reopen without demolition; closed facilities keep 10% standby upkeep. Reference staffing/startup delays differ. | C `toggle`, U |
| 015 | Government unlocks | MISSING | No Town Hall, departments or population-based civic permission progression. | C/D tool/action inventory |
| 016 | Taxes | PARTIAL | Separate R/C/I rates affect monthly receipts/development. No wealth-class rates or governmental finance unlocks. | C `tax`/finance, U |
| 017 | Budget | IMPLEMENTED | Monthly tax/visitor income, upkeep, debt service and trade reconcile with treasury and 24-month history. Construction has immediate cost. | C, ledger/trade tests |
| 018 | Bonds | IMPLEMENTED | At most three fixed bonds create principal once and repay a bounded obligation over scheduled months. No broader financing product inventory. | C `bond`, bond test |
| 019 | Approval | PARTIAL | One explainable aggregate satisfaction index responds to city metrics. No individual household/business opinion records or full sector/class approval breakdown. | C `measure`, U |
| 020 | Requests | MISSING | No accept/reject/cancel/complete mission state machine or tracked objectives. Advisor warnings are not requests. | C/U |
| 021 | Tutorial | PARTIAL | Static instructions, starter town and inspector help exist. No tracked guided scenario with completion/replay state. | U guide/starter controls |
| 022 | Sandbox | PARTIAL | Explicit higher starting funds are separate from ordinary funds. No full rule toggles, universal unlocks or achievement-eligibility enforcement. | C `createCity`, sandbox test |

## Infrastructure, environment and public services

| ID | Target | Status | Implemented behavior and precise gap | Evidence |
|---|---|---|---|---|
| 023 | Power | IMPLEMENTED | Connected finite generation is compared with occupied/facility demand; shortages constrain operation and growth. Distribution is aggregate through roads. | C utilities, supply/reservation tests |
| 024 | Fuel | PARTIAL | Thermal generation consumes finite shared coal stock. Imports enter aggregate inventory; there are no actual fuel-truck delivery trips or plant-local storage. | C utilities/trade, fuel test |
| 025 | Clean generation | IMPLEMENTED | Wind and thermal choices differ in fuel, output, upkeep and emissions; clean-energy research increases renewable output. This is original balancing. | C/D, pollution/fuel tests |
| 026 | Water table | PARTIAL | Finite citywide groundwater limits pumping and depletes. No spatial aquifer, recharge or local water-table map. | C utilities/month, aquifer test |
| 027 | Contamination | MISSING | No groundwater contamination, source-quality transfer, filtering or delivered-water illness chain. | C state/health |
| 028 | Sewage | PARTIAL | Finite treatment and persistent citywide backlog affect health. No actual flow network, local discharge or treatment-quality model. | C utilities/backlogs |
| 029 | Garbage | PARTIAL | Waste persists, harms health and fills bounded landfill storage. No per-building collection backlog, garbage-truck routes or delivery queues. | C monthly waste, backlog test |
| 030 | Recycling | PARTIAL | Enabled facilities consume waste and recover bounded ore. No separate recyclable stream, multiple recovered material types or collection routing. | C, recycling test |
| 031 | Air pollution | PARTIAL | Active sources produce finite-radius local exposure. No wind/advection, persistent atmospheric state or dynamic emissions transport. | C field/measure, pollution test |
| 032 | Ground pollution | MISSING | No persistent spatial ground-contamination state/decay. The general pollution overlay is not this feature. | C state/measure |
| 033 | Radiation | MISSING | No radiation-producing incident, persistence or affected-land restrictions. | C/D |
| 034 | Fire | PARTIAL | Real tile fire state reduces occupancy; service radius can suppress it; uncontrolled fire leaves ruins. No dispatch vehicles, spread network or response-time simulation. | C disaster/month, disaster test |
| 035 | Health | PARTIAL | Clinics/hospitals influence an aggregate health indicator through funded radius coverage. No patients, beds, treatment queues or ambulance trips. | C field/health, funding test |
| 036 | Crime | PARTIAL | Police coverage and unemployment/entertainment affect a crime-pressure index. No offenders, crimes, arrests, custody or patrol trips. | C crime/coverage |
| 037 | Education | PARTIAL | Schools/university produce funded radius coverage and an education index. No age cohorts, student eligibility, enrollment, attendance or attainment lifecycle. | C field/education |
| 038 | Technology | PARTIAL | Research points/prerequisites unlock selected original effects. No education-driven industrial technology tiers or skilled-labor progression. | C/D, research test |
| 039 | Parks | PARTIAL | Local desirability/satisfaction effects and upkeep are present. No actual park visits, visitor demand or reference wealth-specific park behavior. | C field/landValue |
| 040 | Service vehicles | MISSING | No emergency/waste vehicles or routed dispatch/completion. Commuter path assignment is a separate system. | C/T |

## Movement, commerce and regional play

| ID | Target | Status | Implemented behavior and precise gap | Evidence |
|---|---|---|---|---|
| 041 | Traffic | PARTIAL | Worker trips reserve real connected road paths with bounded load; rail/buses displace cars. No individual vehicle queues, lane/intersection controls, travel-time evolution or nonwork trip network. | C/T, employment/transit tests |
| 042 | Buses | PARTIAL | Two accessible exchanges move assigned commuters along a valid road path with shared edge/stop capacity. No authored route planner, vehicle schedules, stop queues or measured wait times. | T, 15 transit tests plus core integration |
| 043 | Streetcars | MISSING | Rail stations are conventional local rail; there is no streetcar-on-avenue network. | D/T |
| 044 | Trains | PARTIAL | Actual track paths between distinct accessible stations carry bounded commuters; disconnected/overloaded tracks fail. No intercity passenger arrivals, timetables, train vehicles or regional rail freight. | T, rail path/capacity/alternate-route tests |
| 045 | Ferries | MISSING | A waterfront freight building exists; it does not transport passengers over navigable water. | D/C |
| 046 | Aircraft | PARTIAL | Air terminal construction contributes fixed supplied visitor income. No flights, routes, passengers, runway or cargo throughput. | D/C |
| 047 | Mining | IMPLEMENTED | Resource-constrained mines extract bounded stock with workers; deposit decreases exactly and full inventories stop extraction. Reference specialist headquarters/processing breadth is absent. | C, extraction/full-stock tests |
| 048 | Petroleum | PARTIAL | Finite oil extraction and inventory consumption exist. No separate fuel/plastic refining chain or local freight operations. | C/D |
| 049 | Electronics | PARTIAL | Staffed factories consume bounded ore/oil and produce alloy/electronics. No complete processor/computer/television chain or individual processing stages. | C, staffed-production/capacity tests |
| 050 | Trade | PARTIAL | Depot orders execute real inventory/cash transactions; regional shipments reserve stock, charge freight and arrive once. Market prices are fixed; no market dynamics or freight-vehicle routes. | C/R, trade/shipment tests |
| 051 | Tourism | PARTIAL | Attractions and air terminal add fixed operational income/commercial demand. No actual visitor agents, arrivals, accommodation or reconciled tourist spending. | C `measure`, visitor-revenue test |
| 052 | Gambling | PARTIAL | Entertainment district adds income and crime pressure. No casino customers, wealth mix, occupancy, losses or staffing accounting. | C/D |
| 053 | Cultural events | MISSING | No event scheduling, attendance/capacity or per-event settlement. | C/U |
| 054 | Landmarks | PARTIAL | Original landmark is constructible and has operational cost/revenue. Attraction is not connected to actual visitor movement/spending. | D/C/U |
| 055 | Multiple cities | IMPLEMENTED | Three fixed seeded cities preserve separate state; switching and synchronized region months work. No arbitrary region layout/claiming system. | R, 17 region tests, browser definition |
| 056 | Regional exchange | PARTIAL | Conserved resources depart one city and arrive next month in another with reserved destination space; both endpoints require trade access/supply. Utility/service contracts are absent; solar support comes from a shared project. | R, shipment conservation/reservation tests |
| 057 | Commuting | MISSING | No cross-city travelers or employment assignment. Each city routes only its own workers/jobs. | R/T module boundaries |
| 058 | Shared projects | IMPLEMENTED | Cities contribute actual goods/alloy to one Solar Commons; completion grants fixed renewable support once. Multiple reference project families/complex construction logistics remain absent. | R, project conservation/completion tests |
| 059 | Disaster systems | PARTIAL | Fire, flood, meteor and tornado alter real map state. The full reference event inventory, event-specific simulations and response/recovery behavior remain incomplete. | C disaster, disaster/transaction test |
| 060 | Data views | PARTIAL | Access, utilities, pollution, land value, road traffic and aggregate services have overlays/HTML reports. No full original data-view inventory or individual agent drilldown. | U/view, C measure |
| 061 | Time controls | IMPLEMENTED | Deliberate pause/resume and equal fixed-month progression at 1×/2×/4×; visibility/resize pauses. All three cities advance once per region month. | K/R, clock/region tests, browser definitions |
| 062 | Save/resume | IMPLEMENTED | Strict city/region validation preserves RNG, independent cities, shipments and project progress; optional local storage and export/import exist. No cloud service implied. | S/R/U, save determinism/rejection tests |

## Future-city expansion

| ID | Target | Status | Implemented behavior and precise gap | Evidence |
|---|---|---|---|---|
| 063 | Vertical mixed use | PARTIAL | Research-gated high-capacity tower housing exists. No selectable mixed-use floors, internal commercial/jobs/services or floor interdependence. | D/C tower |
| 064 | Tower interdependence | MISSING | A tower is one housing tile, not linked floor uses. No internal transport/demand network. | C/D |
| 065 | Clean-tech research | PARTIAL | Funded institute generates points and four topics enforce prerequisites/unlocks. Exact reference research/infrastructure catalog is not implemented or compared. | C/D, research test |
| 066 | Reduced extraction | PARTIAL | Improved renewable output can support substitution away from thermal generation. No advanced closed-loop water/material systems or verified extraction-reduction chain. | C/D cleanEnergy |
| 067 | Service drones | PARTIAL | Research currently extends radius coverage. No drone entities, payload/range/throughput, routed dispatch or displaced service trips. A radius bonus is not drone equivalence. | C `extra`, D serviceDrones |
| 068 | Corporate production | MISSING | General factories do not implement corporate franchising, consumer conversion, proprietary resource demand or its linked regional economy. | C/D/R |
| 069 | Future movement | MISSING | Conventional rail/bus assignments exist; no researched new future transport network. | T/D |
| 070 | Robot disaster | MISSING | No original giant-robot equivalent, resource drain or specialized recovery mechanics. | C disaster inventory |

## Online services

| ID | Target | Status | Implemented behavior and precise gap | Evidence |
|---|---|---|---|---|
| 071 | Shared-region multiplayer | MISSING | Three cities run locally for one player; no authoritative shared server or multiple-player consistency. | R/U |
| 072 | Invitations/access | MISSING | No region identity, roles, invitations, revocation or private-region discovery. Existing research admin login is unrelated. | R/U |
| 073 | Region communication | MISSING | Local event strings are not participant chat or moderated messaging. | R/U |
| 074 | Global market | MISSING | Fixed-price local orders do not create a market across independent players or regions. | C/R |
| 075 | Challenges/rankings | MISSING | No authoritative scores, eligibility or duplicate-submission prevention. | C/R/U |
| 076 | Achievements | MISSING | No persistent achievement conditions/award ledger or sandbox exclusion. | C state/U |
| 077 | Cross-device saves | PARTIAL | Manual validated file export/import can move a region. No authenticated account sync, cloud conflict handling or server storage. | S/R/U |
| 078 | Activity feed | PARTIAL | Bounded local city/region event history exists. No shared-region visibility permissions or cross-player feed. | C/R/U |

## Most important remaining dependencies

1. **Settle the reference and observe it.** The announced edition is still an assumption. An exhaustive per-building, per-transport, per-disaster and expansion catalog plus documented reference playtests is needed before any equivalence label.
2. **Add people and logistics lifecycle.** Household/wealth/age/skill cohorts, individual consumption and money, business-local stock, freight routes and service dispatch underpin many current approximations. Updating a citywide counter alone will not close those gaps.
3. **Extend network behavior.** Freeform roads, intersection capacity/travel time, full bus routes/timetables, regional commuting and passenger transport require shared agent/network contracts before adding more visual vehicles.
4. **Replace service/environment proxies where required.** Patient/student/crime/fire response, contamination, persistent ground pollution, radiation and spatial aquifers need authoritative state, conservation and recovery behavior.
5. **Complete government/progression and future systems.** Wealth taxation, departments, missions, achievement eligibility, functional mixed-use towers, research inventory, corporate expansion, drones and future transport are substantial missing work.
6. **Design original online authority separately.** Authentication, region permissions, conflict-safe synchronization, market conservation and abuse controls are prerequisites for multiplayer/feed/cloud features. Current PythonAnywhere static gameplay is not proof of that backend capability.

The current city/rail/bus/region milestone is usable implementation progress. It is not literal feature-to-feature equivalence, and neither 76 model tests nor 20 reported browser checks establish that claim.


Manager verification update after this independent ledger snapshot: current checks passed 83 city model cases,106 combined game cases and144 full browser cases (including32city cases). This does not change the ledger author’s original independently executed76-case result or its zero-equivalence conclusion. Transit-coordination research now changes actual bus road use from20 to30passengers per vehicle equivalent and has a regression test; it still does not implement the reference future transport mode. See VERIFICATION.md for current candidate evidence.
