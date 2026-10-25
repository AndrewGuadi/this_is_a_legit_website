# CMD-05 bounded reference-capability inventory

Assessment owner: independent `/root/cmd04_todd`. Stable baseline examined: `3c33c764a7548d81aa84988688caabeabe47d545`. Ongoing CMD-05 changes are not certified here. This expands the existing 78 families into bounded, reviewable child scenarios; it does not introduce a different game edition, new scoring rubric or undocumented engine requirements.

**Evidence method:** documentation-based capability comparison is valid where a primary source resolves the visible behavior. A reviewer must link that source to an actually exercised CMD scenario and identify accepted original differences. No licensed reference game was played for this document. Unknown behavior may be resolved by further primary documentation, attributable developer demonstrations or licensed observation; observation is not mandatory for already documented capabilities.

## Source keys and claim boundaries

- **M:** [EA PC manual](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf), freshly downloaded and text-extracted during this audit. Page numbers below are printed pages; PDF pages contain pairs.
- **A:** [EA expansion announcement, September 19, 2013](https://news.ea.com/press-releases/press-releases-details/2013/SimCity-Cities-of-Tomorrow-Expansion-Pack-Coming-November-12/default.aspx).
- **L:** [EA expansion launch release, November 12, 2013](https://news.ea.com/press-releases/press-releases-details/2013/SimCity-Cities-of-Tomorrow-Expansion-Pack-Available-Now/default.aspx).
- **C:** [EA expansion description](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-cities-of-tomorrow).

The direct factual anchors are compact: M describes drawing/zoning/building controls, utility and service families, passenger modes, production/visitor specializations, finance, requests and region/profile capabilities. A explicitly names MagLev, fusion and tidal generation. L identifies wealthy staffing for the Academy, polluting resource consumption by corporate industry, tower self-sufficiency and regional expansion benefits. C establishes mixed-use towers, research, drones and a robot disaster. These sources do not provide every menu option or algorithm.

In the table, **D** means the capability family/control is directly described in the listed source; **I** marks an authored engineering consequence inferred from that family; **U** marks a specific unresolved reference question. The child scenarios are **our original executable comparison design**, not quotations, extracted original algorithms, complete implementation claims or mandatory numeric imitations. Every row has a finite initial child set. If evidence reveals a missing functional variant, add a named child with its source and explain the scope correction.

## Child scenarios for all 78 existing families

| ID | Bounded child scenarios to exercise | Evidence / specific unresolved question |
|---|---|---|
| 001 | a connected access; b severed-link consequence; c restored access | D M10–11; I deterministic disruption/recovery comparison. |
| 002 | a road-class choice; b upgrade; c changed capacity/density eligibility | D M10–13; U exact class/upgrade inventory. |
| 003 | a straight; b curved/arc; c circle; d rectangle; e cancel preview | D M10; I atomic cancel; U crossings/elevation variants. |
| 004 | a R/C/I designation; b clear designation; c replace permitted use | D M11–12; U clearing occupied versus empty zones. |
| 005 | a capacity distinct from occupancy; b road eligibility; c eligible redevelopment | D M13; U lot-size/spacing and density transitions. |
| 006 | a wealth distinct from density; b amenities affect class; c class consequences | D M11–13; U complete transition dependencies, not exact constants. |
| 007 | a reachable work; b vacancy/unemployment reporting; c workplace closure | D M11–12,32; I bounded assignment and recovery. |
| 008 | a income enables purchases; b unmet purchases; c shop reachability | D M12; I explicit finite transaction checks; U destination choice breadth. |
| 009 | a producer output; b delivery to retailer; c stock-limited sales | D M12,28–30; U freight/local-stock stages and delivery variants. |
| 010 | a persistently unmet needs; b abandoned state; c clear/redevelop recovery | D M13,15; U exact abandonment/recovery alternatives. |
| 011 | a local amenity effect; b negative externality; c land-value report | D M12–13,26; I equal-site controlled comparison. |
| 012 | a sector imbalance; b demand feedback; c corresponding growth response | D M11–13; U complete demand inputs; no numeric matching requirement. |
| 013 | a module placement; b distinct capability expansion; c footprint/attachment rejection | D M14; U named module inventories by facility. |
| 014 | a close; b retained structure/reduced operation; c reopen | D M14; I resource/accounting consistency. |
| 015 | a initial civic permission; b upgraded capability; c department/regional benefit | D M19–20; U complete department labels and prerequisite graph. |
| 016 | a sector rates; b finance-dependent class rates; c booked consequence | D M20,31; U exact permission stages; original tax constants permitted. |
| 017 | a categorized income; b categorized expense; c treasury reconciliation | D M31; I exact original-ledger arithmetic. |
| 018 | a borrow; b interest obligation; c periodic repayment/limits | D M31; U selectable lender/loan capability differences. |
| 019 | a separate R/C/I feedback; b inspect cause; c act and observe consequence | D M30; U full complaint/report catalog. |
| 020 | a offered objective; b accept/reject; c complete once; d state on cancellation | D M30,33; I idempotence; U cancellation behavior where undocumented. |
| 021 | a real introductory actions; b progress tracking; c replay | D M32; I safe replay state. |
| 022 | a select sandbox rules; b distinguish eligibility; c save/resume rules | D M initial setup; U complete option and reward-exclusion inventory. |
| 023 | a connected finite output; b operating/staffing condition; c deficit/status display | D M15; U plant-specific staffing and distribution variants. |
| 024 | a fuel storage; b delivery/import; c depletion stops dependent output | D M15; I finite stock accounting; U fuel-specific stages. |
| 025 | a clean option; b polluting option; c load/impact comparison | D M15; U complete base generator catalog. |
| 026 | a source-local extraction; b depletion; c replenishment/source reporting | D M16; U recharge and placement eligibility. |
| 027 | a contaminated source; b treatment; c delivered-quality consequence | D M16; U source-to-consumer exposure details. |
| 028 | a sewage production; b removal/treatment; c outage backlog | D M17; I no-disappearance accounting; U treatment variants. |
| 029 | a collection; b route interruption; c disposal/storage capacity | D M18; I material lifecycle; U vehicle and disposal-module catalog. |
| 030 | a collected recyclable input; b separate outputs; c bounded recovery | D M18–19; U processing choices and input/output graph. |
| 031 | a emissions; b spatial exposure; c report and mitigation | D M15,18; I chosen spatial transport law; U documented wind dependencies. |
| 032 | a deposited contamination; b residual state; c remediation/reuse consequence | D M environmental maps; U persistence/remediation behavior and affected uses. |
| 033 | a eligible radiation event; b affected land; c persistent consequence/recovery | D M15; U trigger and recovery alternatives. |
| 034 | a incident; b dispatched response; c arrival changes damage | D M21; I route/arrival causality; U incident/apparatus variants. |
| 035 | a illness/injury demand; b treatment access/capacity; c unmet outcomes | D M22; U medical incident/facility catalog. |
| 036 | a crime demand; b patrol/arrest; c custody/processing consequence | D M23; U offense/prevention and policing variants. |
| 037 | a eligible enrollment; b attendance/transport; c attainment/capacity report | D M23–24; U school tiers and learner eligibility. |
| 038 | a education dependency; b skilled/advanced industry; c unlock/report | D M24,28–30; U technology tiers and prerequisite graph. |
| 039 | a local amenity; b actual park use; c visitor/cost reporting | D M26; U park variants with distinct function. |
| 040 | a dispatch; b constrained path; c arrival/completion; d blocked recovery | D M21–25; I saved journeys/conservation; U remaining vehicle families. |
| 041 | a assigned trips; b shared congestion; c multimodal consequences | D M24–26; I coherent combined-trip accounting; U intersection/lane capabilities. |
| 042 | a working bus/stops; b riders; c waiting; d car displacement | D M24–25; U depot/route/wealth and regional variants. |
| 043 | a eligible rails/stops; b connected service; c riders/waits | D M25; U depot, track and operational variants. |
| 044 | a connected station; b incoming/outgoing regional demand; c throughput/waits | D M25; U train/cargo terminal variants. |
| 045 | a water-connected terminals; b regional ferry travelers; c waits; d cruise distinction | D M25; U terminal and traveler-eligibility variants. |
| 046 | a working air connection/runway; b passengers; c export cargo; d throughput | D M26; U terminal/runway upgrades and regional limits. |
| 047 | a site eligibility; b finite extraction; c stock/report | D M28; U mining/refining and headquarters variants. |
| 048 | a oil extraction; b storage; c processing outputs | D M29; U complete petroleum product graph. |
| 049 | a intermediate materials; b dependent electronics stages; c export output | D M30; U facility/upgrades for each product stage. |
| 050 | a order; b stock/delivery; c financial settlement; d report | D M28–30,34–35; I exactly-once transactions; U depot/port/market variants. |
| 051 | a arrivals; b visits/spending; c departures and transport pressure | D M25–27; I conserved visitor journeys; U wealth/venue choices. |
| 052 | a casino visitors; b revenue/expense; c civic consequence | D M27; U venue/module variants and externalities. |
| 053 | a choose/schedule event; b attendance/capacity; c settlement | D M26–27; U event catalog and cancellation/refund behavior. |
| 054 | a original landmark placement; b attraction effect; c upkeep/visitors | D M26–27; U base-versus-separately-sold functional variants. |
| 055 | a select/claim city; b switch context; c preserve independent state | D M initial setup,34; I safe local persistence. |
| 056 | a regional utility/resource exchange; b service aid; c delivery/payment consequences | D M34–35; U capacity sharing versus actual transfer by service. |
| 057 | a cross-city worker demand; b transport; c origin/destination reconciliation | D M24–25,34–35; I no duplicate employment; U commuting settlement details. |
| 058 | a joint project choice; b contributions; c once-only completion/shared effect | D M region play; U project catalog and contribution requirements. |
| 059 | a each named base hazard; b eligibility; c damage/recovery | D M13; U bounded base hazard inventory and profile unlock graph. |
| 060 | a each documented map/report family; b authoritative totals; c useful inspection | D M10–32; I explicit aggregation; U remaining named report children. |
| 061 | a pause; b resume; c speed controls; d equal simulated duration | D M30; I deterministic equal-duration comparison. |
| 062 | a restore city; b restore region; c continue coherent future | D M setup/region continuity; I deterministic recovery; U original save-control variants. |
| 063 | a residential floor; b commercial/work floor; c service/utility floor; d connections | D A/L/C mixed-use family; U actual floor/crown function inventory. |
| 064 | a one floor supplies another; b remove dependency; c recover function | D L tower balance; I isolated dependency test; U elevator/bridge and internal-routing functions. |
| 065 | a staffed institute; b prerequisites/research; c unlocked operating capability | D A/L/C; U full institutional/control-resource graph. |
| 066 | a researched alternative; b finite operating input; c reduced extraction/pollution | D A/C; U fusion/tidal and other technology dependencies. |
| 067 | a eligible drone service; b operating constraints; c actual fulfilled demand | D A/C; I finite service accounting; U drone roles, production and range/network rules. |
| 068 | a resource inputs; b corporate production; c distribution/franchise; d effects | D L corporate family; U production recipe and franchise transition graph. |
| 069 | a future track/stations; b actual demand moved; c operating dependency | D A MagLev; U control-resource and network variants. |
| 070 | a eligible robot event; b resource/damage consequences; c response/recovery | D C; U trigger, event phases and recovery options. |
| 071 | a two players/cities; b consistent shared effects; c concurrent recovery | D M region play; I original authoritative protocol. |
| 072 | a invite/join; b private/public visibility; c denied/revoked access | D M setup/region play; I authorization checks; U role/lifecycle variants. |
| 073 | a permitted regional messages; b visibility; c bounded persistence | D M Region Wall; I original storage/moderation design. |
| 074 | a participating-city market order; b settlement; c shared market effect | D M world/market; I original transaction design; U market rules and scope. |
| 075 | a challenge eligibility; b authoritative outcome; c rankings | D M world/leaderboards; I anti-duplication; U category/scoring inventory. |
| 076 | a eligibility; b once-only award; c profile persistence | D M profile/achievements; I import/sandbox boundary; U award inventory. |
| 077 | a authorized second-device resume; b concurrent save conflict; c recovery | D A cross-platform continuity; I original synchronization design. |
| 078 | a regional event generation; b permitted audience; c useful history | D M Wire/region activity; I privacy filtering; U exact activity categories. |

Children marked I are engineering realizations of the existing authored acceptance requirements. They must not be misrepresented as original-engine facts. Their implementation may use original bounded algorithms. U items are questions about capability breadth, not permission to demand exact internal mechanics or arbitrary numeric matches.

## Independently exercised documentation comparisons

These checks were run against an isolated git extraction of baseline `3c33c764a7548d81aa84988688caabeabe47d545`, not the changing CMD-05 working tree. Node 24.22.1; all commands exited 0. The original game was not executed. This evidence supports **DOC-COMPARED, MODEL LEVEL** child capabilities; it does not silently promote a whole broad family or certify the final UI/source.

| Children | Primary comparison anchor | Actual CMD exercise and result | Boundary |
|---|---|---|---|
| 004a | M11–12, R/C/I designation | Independently placed all three category tools beside an existing road; each accepted action produced the selected use. Existing zone-growth regression also passed. | Clearing/replacing designation (004b/c) is separate; bulldozing is not proof of an unzone tool. |
| 014a–c | M14, close/reopen alternatives to demolition | Independently closed a working wind facility, retained its type, observed power 800→0, reopened, observed 800. Existing closed-standby/inspector regression passed. | 800 is original balancing. Current final UI and every specialist facility remain separate checks. |
| 017a–c | M31, itemized municipal finance | Existing exact monthly treasury/ledger reconciliation regression passed. | No claim that chosen categories/rates reproduce undocumented original financial internals. |
| 018a–b and periodic repayment in 018c | M31, borrowing with interest repayment | Existing principal-once/bounded-obligation regression and early-redemption boundary regression passed. | Lender choices/loan variants and final browser controls require their own comparison; early redemption is verified CMD behavior, not inferred from the cited paragraph. |
| 061a–d | M30, pause and speed controls | Paused-clock and equal-duration regressions passed: 1×/2×/4× each produced 12 months for equivalent simulated duration. | Equal-duration determinism is our engineering check; original speeds and subframe internals were not measured. |

Selected baseline suite output: **7 tests, 7 passed, 0 failed/skipped**, approximately 1.81 seconds. Additional R/C/I and close/reopen model probe passed. Test command:

```sh
node --test --test-name-pattern='new zones remain|monthly ledger exactly|bonds give principal|paused clock never|equal simulated duration|inspector reconciles closed|bond redemption pays' tests/city/core.test.mjs tests/city/save-clock.test.mjs tests/city/progression.test.mjs
```

The independent supplemental probe used `createCity({starter:false,seed:5})`, explicit flat synthetic terrain/funds and connected roads; placed residential/commercial/industrial at (2,15)/(3,15)/(4,15), then wind at (7,15); called real `applyAction` build/toggle controls and `measure` for assertions. It created no production state and made no product changes. Raw review scripts/logs are temporary diagnostic inputs; the command, scenario, commit and concrete results above preserve the reviewable evidence in this document.

## Promotion procedure for the final frozen candidate

For each child, record primary anchor, D/I/U classification, exact scenario/source hash, actual result, accepted original differences and remaining known functional variants. A sufficiently documented capability plus exercised CMD behavior can receive documentation-based equivalence verification without claiming reference gameplay. To promote an entire parent, close its bounded required child set and any specifically identified U question that could change the functional match; explicitly retain unrelated unresolved parents.

For current transit work, local capacity reservations can establish disconnected-route, finite-demand and car-displacement children. They do not prove regional arrivals, actual vehicle timing, waiting queues, wealth eligibility or the remaining terminal/depot functions. For expansion work, the newly sourced named generators and movement mode can guide implementation immediately, while research/control-network and tower-floor dependencies remain explicit catalog tasks. Neither menus nor screenshots alone establish the connected consequences.

No new numeric score, whole-family promotion or completed parity certification is awarded here. The document supplies a finite implementation/comparison worklist for continued delivery under the existing gate.

## Tower catalog research boundary

The freshly retrieved EA announcement, launch release and product page do not state a floor maximum or complete floor/crown catalog. The old developer article at `https://www.simcity.com/en_US/blog/article/simcity-cities-of-tomorrow-megatowers` now redirects to a generic franchise page. Its [attributed Ross Treyz excerpt](https://simscommunity.info/2013/09/24/simcity-cities-of-tomorrow-megatowers/) supports mixed use and self-contained towers, but contains no floor limit.

An [IGDB press-kit page](https://www.igdb.com/games/simcity-cities-of-tomorrow/presskit) reproduces marketing language describing eight levels followed by a tourism crown. A [translated purported developer article](https://scitynews.blogspot.com/2013/09/blog-oficial-simcity-mega-torres.html) provides catalog leads: normal/elite towers; residential, shopping, work, education, power, waste reduction, bridge, park and emergency-service floors; several crown functions. These are **research leads with unresolved original-source provenance**, not primary-source certification or a complete authenticated catalog. No original game or developer video was played in this audit.

Accordingly, an authored twelve-floor rule cannot currently be called a documented match. Choosing an eight-floor implementation would likewise not establish reference verification by itself. Preserve existing inhabitants through explicit original capacities/migration, and retain the narrow unresolved question: original floor cap, crown eligibility and functionally distinct floor/crown choices. Numeric capacity balancing may differ; do not confuse that permission with silently changing a documented functional construction limit if later evidence resolves it.

## Interim CMD-05 independent interface checks

These are changing-working-tree checks, not a frozen-candidate approval. The reviewer independently reproduced a rail capacity bug: two module-expanded stations adjacent to one shared rail tile accepted 350 plus 350 passengers while the segment budget was 400 and the overlay reported only 350. The implementation worker captured a failing regression and corrected cumulative single-cell reservations. The reviewer then independently ran `node --test tests/city/transit.test.mjs tests/city/transit-integration.test.mjs`: **35 passed, zero failed/skipped**, exit 0. This includes the corrected rail case and streetcar/ferry/MagLev integration. Local assignments still do not prove regional arrivals, completed trips or waiting times.

The reviewer also independently exercised `createServiceReportSnapshot`: equality with a fresh report at capture; recalculated health penalties for current population; isolation from mutated returned counters/vehicle arrays; isolation from later live-city medical demand; and rejection of malformed service conservation by exported fresh `measure`. All assertions passed. Static inspection found snapshot invalidation after fire/demolition and before final disaster reporting. Occupancy/finance-only phases do not alter captured service stocks. Any subsequent integration that changes service materials, case state or providers must invalidate the phase snapshot. This is a dependency review, not a performance result.

Source SHA-256 at these interim checks:

| File | SHA-256 |
|---|---|
| `static/cmd-city/core.mjs` | `4f8b9cb176a0eafb9d6d1c6b8771e06d9d1627b23fe5b80dbff5e86f159de4ca` |
| `static/cmd-city/services.mjs` | `135ac9469e928b071dfd066cda6fc6a2cf1b55732f06925edde5bd5b46b1a6fd` |
| `static/cmd-city/transit.mjs` | `cc2300b736af89b1f4d3e67b7bcc561f6798bfa8950c6dbf2e3035a93b41e724` |
