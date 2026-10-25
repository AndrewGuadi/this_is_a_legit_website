# CMD-05 readiness gaps and dependency order

Independent assessment by `/root/cmd04_todd`, based on published baseline `3c33c764a7548d81aa84988688caabeabe47d545`, the frozen 78-ID ledger, CMD-TODD-04, current module interfaces and primary-reference checks. This is a work-order and evidence assessment, not a new score or claim that ongoing CMD-05 code passes. The user requested continued work until deployment-ready; useful implementation and verification should continue while the remaining gaps are resolved.

## Existing gates and current evidence

The confirmed target remains SimCity (2013) plus Cities of Tomorrow, with original source/assets/presentation and original numerical balancing permitted. The ten existing equal-weight criteria and 95-point gate remain unchanged. Required checks and absence of critical/high defects remain necessary. No additional hidden gate is introduced here.

CMD-04 independently passed 280 game checks, 33 application checks, eight focused browser checks and 91.35% retention in the unchanged sustained fixture. Manager full-browser coverage passed 176 checks and native source CI passed. These results belong to that source. Dense p95 independently measured 68.38 ms against the existing under-20 ms requirement; it remains a concrete failing requirement. No current benchmark pass is inferred for ongoing CMD-05 edits.

The latest scenario ledger remains 32 narrow IMPLEMENTED / 33 PARTIAL / 13 MISSING, with zero EQUIVALENCE VERIFIED. Corrective work did not promote IDs. IMPLEMENTED means an authored narrow scenario works; full reference breadth and comparison still require evidence.

## Avoid turning reference uncertainty into invented requirements

`PARITY_TARGET.md` explicitly targets comparable player capabilities and connected consequences, not undocumented engine internals, exact numeric tuning or original bugs. Apply that definition consistently:

- The manual documents selectable residents with visible status, financial information and destination/following. That supports a visible resident-inspection capability. It does **not**, by itself, establish chronological aging, births, persistent named life histories or a full demographic simulator as mandatory equivalence features.
- Work, shopping, production, taxation and business success need connected observable consequences. A fully closed firm-payroll macroeconomy is not established by the currently inspected sources as a reference requirement. Our declared money sources/sinks must remain honest and internally consistent; do not invent a stronger real-world accounting target merely because the existing model is simplified.
- Exact original thresholds, costs, vehicle speeds, probabilities and capacity numbers are not automatic acceptance gates. Document original values and compare capability/causality. Missing an entire mode, module function, stock stage or progression dependency is different from choosing a different constant.
- Every reference item does not inherently require a newly purchased game or live side-by-side play. Clear primary documentation can establish a capability and support a precise comparison. Use licensed observation, an attributable official developer demonstration or equivalent primary evidence where documentation does not resolve behavior. Record what was actually observed.

Earlier gap documents' broad lifecycle/economy wording must be interpreted through these boundaries. Do not label unverified modeling ideas proven reference omissions. Conversely, do not use uncertainty to erase explicit reference capabilities.

## Primary evidence resolved or strengthened in this audit

Sources actually retrieved: EA's 18-page PC manual (downloaded and text-extracted after browser retrieval timed out), current expansion description, and EA's two 2013 expansion press releases. The old EA streetcar article search hit currently returned 404; its snippet is not treated as a complete specification. SimCity BuildIt search results were excluded from the 2013 comparison.

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| [PC manual, printed 24–26](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=13) | Streetcar rails/stops; incoming regional ferry travel and traveler classes; rider and waiting reports; aircraft passenger/cargo roles. | Complete track/terminal/depot catalog, routing/dispatch details, operational capacity and every wealth rule. |
| [PC manual, printed 30–33](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=16) | Sector feedback, finance/population reports, selectable resident status and destination. | Persistent personal histories, chronological aging, exact economic algorithms. |
| [EA announcement, September 19, 2013](https://news.ea.com/press-releases/press-releases-details/2013/SimCity-Cities-of-Tomorrow-Expansion-Pack-Coming-November-12/default.aspx) | Explicitly names MagLev, fusion reactors and tidal generation, alongside research, drones and mixed-use towers. | Complete research prerequisites, module menus, operating budgets, tower floor/crown variants. |
| [EA launch release, November 12, 2013](https://news.ea.com/press-releases/press-releases-details/2013/SimCity-Cities-of-Tomorrow-Expansion-Pack-Available-Now/default.aspx) | Academy dependence on wealthy workers, resource-consuming/polluting corporate industry, balanced self-sufficient towers and regional futurization benefits. | Exact worker shares, production recipe, franchise conversion/delivery mechanism or complete intercity effects. |
| [Current expansion description](https://www.ea.com/games/simcity/simcity/buy/addon/simcity-cities-of-tomorrow) | Broad clean/corporate alternatives, vertical mixed use, research, service drones and robot disaster. | An exhaustive feature inventory or proof of current online-service availability. |

Newly named reference items should be added as children of existing IDs 065–069, not counted as unrelated bonus features. They are documentation findings, not implementation promotions.

## Dependency order across all 78 IDs

This grouping covers every existing ID. It is an implementation sequence within the existing target, not a replacement scope or a prediction of development time. Maintain stable IDs and add child inventory entries when an existing family needs detail.

| IDs | Next concrete work | Depends on / proof required |
|---|---|---|
| 001–014: construction, household use and development | Extend road geometry and actual network editing; separate road eligibility, density, wealth and abandoned/recovering state; enumerate functional module types and footprints. Complete local goods consequences and visible resident/business diagnosis. | A consistent network/topology model used by every consumer; transactional previews, cancellation and demolition. Compare each documented drawing/module capability separately. Do not attach closed-economy or aging requirements without reference evidence. |
| 015–022: civic management | Compare the implemented permission/sector/class progression with the documented stages; close per-sector feedback and sandbox/rule breadth. Retain working requests, tutorial, budget and debt. | Exact capability graph and once-only entitlements, clear migration behavior. Each distinct control must produce a distinct tested consequence; chosen constants can remain original. |
| 023–040: utilities/environment/services | Complete source-local water and remaining generation/fuel choices, sanitation output streams, physical service modules, education/skill effects, park use and incident variants. | Shared resource/staffing and trip contracts; all material/case reservations survive closures. Complete reference catalogs using additional primary evidence. Existing routed services are a foundation, not every reference variant. |
| 041–046: movement | Finish coordinated traffic/trip accounting and missing modes; current CMD-05 streetcar/ferry work should establish real connected paths, finite shared capacities, operability and useful controls/reports. Then complete waits, passengers/vehicles, regional arrivals and aircraft throughput as documented. | Freeze the common transit reservation result before core integration. No rider may be assigned twice to car and transit; invalid/disconnected routes must not consume capacity. A local reservation counter does not establish regional ferry or timetable equivalence. |
| 047–054: industry and visitors | Extend explicit intermediate production/storage and freight delivery; then arrivals, visits, spending and cultural events. Gambling/landmarks must consume real visitor demand and incur their stated externalities. | Goods/trip lifecycle and ledger settlement first. Test input exhaustion, in-flight cancellation/closure, finite venue capacity and exactly-once event settlement. Primary menus/demonstrations can resolve missing catalogs; original rates do not require numeric imitation. |
| 055–062: region, hazards and reports | Add real regional worker/service/utility transfers, remaining hazard families and the complete metric inventory. Preserve independent city state, project reservations, clocks and deterministic recovery. | Accepted transfer records with ownership, origin/destination, capacity and settlement. Transfers cannot duplicate commuters/material or erase reserved cargo when a city pauses/closes. |
| 063–070: expansion | Implement actual tower-floor uses and dependencies, staffed research/control infrastructure, corporate resource/production/distribution, routed drones, future transport and robot failure/recovery. | Existing household/jobs/goods/service/transport contracts should be reused; floors cannot be decorative multipliers. Catalog research edges, floor/crown functions, control-resource consumers and franchise behavior before claiming family completion. |
| 071–078: online/profile | Build original identity/region authorization, synchronized authoritative city state, permissioned communication/activity, market settlement and challenge eligibility. Preserve already working local awards while distinguishing profile state. | Authoritative transactions, conflict/idempotency rules and explicit access boundaries precede cross-device and shared-market features. Two browser contexts must demonstrate allowed/denied/revoked access, simultaneous updates and recovery. This is our backend, not an EA integration. |

Performance work is cross-cutting and should proceed alongside these dependencies. Measure the exact final source sequentially on the existing unchanged fixtures. Profile repeated validation, copying, route construction and shared report work; optimization cannot remove save-budget atomicity, finite resources or determinism. Re-run behavioral differentials for pure refactors and genuine RED/GREEN for intentional rule changes.

## How an equivalence decision can become finite

A documentation-based capability comparison is a valid evidence path. The reviewer can mark an identified capability verified when (a) a primary source describes its user-visible inputs, prerequisites and consequence sufficiently, (b) the CMD scenario actually exercises those same capabilities, (c) accepted original differences are explicit, and (d) no known material subfeature is omitted. Label the evidence **documentation-based comparison** and explicitly state that the original game was not played. A licensed session is one way to resolve ambiguity, not a blanket prerequisite for the entire ledger.

Do not confuse a verified child capability with an exhaustive parent-family match. For broad rows, first freeze a bounded child inventory from the named sources and captured menus; record genuinely unresolved detail as specific questions. Avoid an indefinitely expanding requirement to reproduce unknown internals. When every required child is supported and exercised, the parent can be reviewed for EQUIVALENCE VERIFIED. A later discovery is a documented scope correction, not a reason to pretend the earlier evidence existed.

| Comparison candidates | Documentation-based closure path | Remaining condition |
|---|---|---|
| 004 zoning; 014 open/close; 017 budget; 018 loans; 061 time controls | Map the named controls and connected results in the manual to current exercised CMD controls/accounting scenarios. | Record actual UI/test evidence on the frozen candidate, including rejected/disabled cases. Do not merely cite an existing test count. |
| 001 road access; 023 power; 029 garbage; 034 fire; 040 service routes | Compare documented infrastructure/disruption/response capabilities to explicit connected/disconnected, capacity and arrival scenarios. | State which relationships are directly documented and which are engineering inference; exclude unresolved fleet/module catalog claims from a narrow verified comparison. |
| 015 civic unlocks; 016 taxation; 037–038 education/technology | Verify documented progression stages and dependency edges separately. | Current broad controls may differ: sector/class permissions, school tiers and industrial technology prerequisites need a named child inventory. Do not certify the whole family while a known edge remains absent. |
| 042–046 modes; 047–054 industry/visitors; 063–070 expansion | Use manual plus EA announcement/launch details to define each known mode, product stage, event and future capability. | Missing detailed variants and dependency semantics require further primary material or observation. Original rates can be chosen; missing functional stages cannot. |
| 055–058 and 071–078 regional/profile/online behavior | Compare primary documented user capabilities against our own exercised two-context authorization, transfer and sync scenarios. | Documentation may define the visible capability while our backend design remains original. Do not claim server internals or current EA availability, and do not grant local-only counters online equivalence. |

This table identifies assessment work to perform, not completed promotions. CMD-05 code is still changing; no new EQUIVALENCE VERIFIED status is awarded by this document.

## Current transit interface review checklist

The existing `planTransit`/`routeTransit` interface returns derived reservations; it does not save individual transit journeys. Expansion should make that distinction explicit.

1. Freeze tool identifiers, eligible infrastructure, result modes and added metric arrays before changing `content`, `transit`, `core`, `view` and browser controls. Confirm strict save readers accept the new tools without accidentally accepting malformed older state.
2. A streetcar must require its actual connected track corridor and functioning stops. A ferry must require navigable water connecting functioning terminals. Road adjacency alone cannot stand in for either path.
3. Enforce shared segment and terminal capacities, invalid-request inertness, closure/fire/demolition invalidation and deterministic tie-breaking. A failed mode must not leave consumed reservations before fallback.
4. Core must try relevant modes even when its old rail/bus shortcuts would skip them. New modes' road displacement must be included exactly once; unmet riders remain unmet or use bounded car capacity.
5. Distinguish current assigned passengers from completed journeys and waiting queues. Do not display a fabricated wait-time estimate or moving vehicle when only a static reservation exists.
6. Verify zero demand, isolated stops, saturated shared edges, reversed journeys, multiple competing homes, save/reload and real controls at mobile/desktop widths. Measure performance after integrating the new paths.
7. Promote only the exact authored scenario demonstrated. Streetcar/ferry functionality may close part of 043/045 while terminal variants, waiting, wealth eligibility and regional behavior remain explicitly partial. No literal-equivalence promotion follows from adding a menu item.

## Reference work that can proceed without blocking implementation

Create compact per-ID comparison records: source/build/menu or timestamp, visible capability, prerequisites, accepted original differences, repeatable scenario, CMD code/UI evidence and remaining uncertainty. Documentation comparison is sufficient where it resolves the claimed capability; use observation only for unresolved behavior. Do not demand blanket licensed observation of every row.

Remaining observation targets are concrete: complete facility/module menus and attachment functions; density/lot eligibility; industrial product graphs and freight steps; service incident variants; station/depot/terminal and wait behavior; region commuting/aid settlement; tower floor/crown inventory; Academy/control-resource dependencies; corporate distribution/franchising; future movement and robot recovery. These are refinements of existing inventory R01–R14/C01 onward, not new unbounded gates.

For deployment readiness, continue implementation, integration and independent review of each frozen candidate while preserving these gaps. A useful next step remains available: finish the current performance/transit work, validate it, then start the highest remaining dependency. Successful CI alone does not establish feature equivalence, and an honest intermediate REVISE result is feedback for the next correction rather than a reason to terminate authorized work.
