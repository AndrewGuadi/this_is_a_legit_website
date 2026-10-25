# CMD City — CMD-03 parity progress snapshot

## Result and scope

Confirmed comparison remains **SimCity (2013) plus Cities of Tomorrow**. This independent progress assessment examines the household economy, finite education and road-service integration against the existing 78-ID target. It is not a new TODD score, release approval, deployment report or reference-equivalence certification. The prior **85.6** score belongs to the older CMD-02 candidate and is not transferred to changed source.

Using `PARITY_STATUS_02.md`'s frozen baseline of 23 IMPLEMENTED / 40 PARTIAL / 15 MISSING, nine narrow authored scenarios advance: **32 IMPLEMENTED / 33 PARTIAL / 13 MISSING. EQUIVALENCE VERIFIED remains 0.** All unchanged statuses are retained. The counts are not a percentage of the requested reference game's functionality.

IMPLEMENTED means a working original implementation addresses the narrow authored scenario, supported by inspected source/tests. It does not mean every reference variant, exact algorithm, numerical rule or interdependency matches. PARTIAL identifies related functionality with material gaps. MISSING identifies absent essential capability. The exact reference inventory and side-by-side comparisons remain incomplete.

## Evidence and execution provenance

Inspected `HOUSEHOLDS_CONTRACT.md`, `SERVICES_CONTRACT.md`, current household/service modules, core/content/save/region integration, management/inspector/renderer changes, and the household/service/residents-integration/browser test definitions. Read the unchanged ten-criterion CMD-02 review; no replacement rubric or reduced acceptance scope is introduced.

The manager reported 241 city-model checks, twelve new resident/service UI flows and two focused road-recovery cases passing at task intake. Additional household route-cache tests were subsequently present in the inspected source. **Those supplied counts are attributed run reports, not a claim that the current complete suite has that count.** The manager's full regressions remain separate.

After the implementation owner completed CPU measurements and confirmed the household/service modules were frozen, this assessor independently executed:

```text
node --test tests/city/households.test.mjs tests/city/services.test.mjs
```

Actual result: **62 passed, 0 failed, 0 skipped/cancelled/todo; exit 0; approximately 0.79 seconds.** These are 32 household and 30 service checks. The core/save integration was undergoing a separate corrective TDD cycle, so no whole-model GREEN is inferred from this isolated run. This assessor did not run browser/device tests or performance benchmarks. Source/contract/test reads, SHA-256 inventory generation and document validation were also performed. Product files remain outside this assessor's write scope; a final formatting or corrective revision must be rebound before being treated as the same candidate.

### Open verification limits at this snapshot

- The manager reported a reproduced serialized-file-budget defect: an accepted name action could make a city exceed the 1 MiB save limit. Core correction was still in progress when this ledger was written. **It is not recorded as resolved**, and the frozen subsystem checks above do not establish its closure. The source hashes below identify the inspected snapshot, not a later corrected core.
- Supplied dense-workload timing after household optimization was median **14.72ms**, p95 **36.60ms**; the 20ms p95 target remained unmet. This assessor did not independently measure it.
- Supplied sustained workload ended at **4,018 of 4,800 residents (83.7%)**, below the chosen 90% retention condition. The successful constant-4,800 CMD-02 benchmark must not be reused as CMD-03 maintained-population evidence.
- Full regressions, final candidate identity and independent TODD assessment remain pending/separate. No new numerical score or release decision is awarded by this progress ledger.

## Nine narrow scenario changes

| ID | Target | Previous → current | Actual original implementation | Remaining reference breadth |
|---|---|---|---|---|
| 006 | Wealth | MISSING → IMPLEMENTED | Occupied homes have low/middle/high classes. Sustained employment, actual purchases, education, utility service, land value and private cash affect promotion/demotion; a transition does not change residents or multiply wallets. Tests cover conditions and one-class transitions. | One economic cohort per occupied home, not named individuals/families or a full property/wealth market. Age groups do not age, have children or die chronologically. Thresholds are original. |
| 008 | Consumption | PARTIAL → IMPLEMENTED | Homes request finite purchases. Staffed/supplied shops, actual shared goods, private cash and an available road path jointly bound sales; unmet purchases affect home satisfaction and later development. Shared allocation avoids overselling. | No named shoppers, schedules, individual destinations over time, merchant cash accounts or full retail choice model. Wages are declared external private income and merchant spending is an explicit private-economy sink. |
| 016 | Taxes | PARTIAL → IMPLEMENTED | Nine sector/class rates exist. Finance plus an operating Town Hall gates class edits; actual private residential collections and aggregate business-class taxes are booked once. Collection retains the class before a subsequent wealth change. | Legacy bulk sector controls remain available and reset all three rates. This is not the reference's complete government tax-granularity progression. Firm class is a land-value approximation, not business demographic agents or actual firm budgets. |
| 029 | Garbage | PARTIAL → IMPLEMENTED | Per-tile bins persist. Finite staffed vehicles travel roads, pick up actual waste, retain cargo when blocked and return to finite landfill/recycling capacity. Demolition preserves stored material; conservation includes bins, cargo, storage and processing. | Original fleet caps, monthly tours, pickup rules and tuning; incomplete reference collection/processing/module catalog. No full street-vehicle traffic physics. |
| 034 | Fire | PARTIAL → IMPLEMENTED | A real dispatched road vehicle must arrive to extinguish a fire before core damage/decay. Radius overlap cannot teleport suppression. Blocked/closed/burning roads and finite fleets affect response. | Simplified tile fires and original monthly movement; no full reference fire categories, propagation, specialist apparatus or exact response timing. |
| 035 | Health | PARTIAL → IMPLEMENTED | Deliberate and bounded exposure-generated medical case units wait locally, transfer to vehicle cargo, occupy finite beds after return, then receive finite later treatment. Closed/removed facilities cannot swallow admitted cases. | Counts are service cases, not unique people, diagnoses, contagious histories or complete injuries/death simulation. Population health remains an aggregate indicator affected by case backlog and environmental exposure. |
| 036 | Crime | PARTIAL → IMPLEMENTED | Bounded deliberate/natural case queues, patrol cargo, finite custody and later processing are distinct. Unresolved cases affect crime pressure; staffing, access and custody capacity constrain resolution. | Case units are not persistent unique offenders, offense types, criminal motives or full prevention/patrol behavior. The reference's complete policing facilities and incident rules are unverified. |
| 037 | Education | PARTIAL → IMPLEMENTED | Schools/universities reserve finite accessible places, scaled by actual eight/twelve-worker staffing and funding. Children enroll; a retained adult training cohort needs twelve attended months to attain education. Interrupted capacity pauses progress. | Static child/adult/senior cohorts do not age. No complete reference school-tier catalog, school-bus journey simulation or exact educational attainment/industrial-skill model. |
| 040 | Service vehicles | MISSING → IMPLEMENTED | Saved vehicles have actual positions, adjacent road paths, tasks, payloads and return state. Congestion changes movement budget; road severing, closure, fire and reopening affect routing. Blocked cargo/cases persist or reroute instead of disappearing. | Discrete monthly movement with bounded fleets/tasks, not subsecond lane/intersection queues, every reference vehicle type, regional aid or a complete combined traffic engine. |

This assessment uses the same narrow-scenario convention as the previous ledger. It does not upgrade a feature merely because a panel, vehicle drawing or cohort counter was added.

## Material related changes that do not close their reference gaps

| ID(s) | Status retained | Current behavior and remaining boundary |
|---|---|---|
| 001, 007 | IMPLEMENTED | Physical access now excludes closed/burning roads; reopening a valid imported closed gateway restores connections. Employment is bounded by actual home adult cohorts, including composition changes without raw population changes. Individual work/life identity remains absent. |
| 009 — Goods | PARTIAL | Purchases now consume finite goods exactly, but stock remains citywide. No producer→freight vehicle→shop-local stock delivery chain or full business inventory/production graph. |
| 010 — Abandonment | PARTIAL | Poor household conditions constrain growth and can cause gradual occupancy loss; departing wallets and cohort counts reconcile. No distinct abandoned-building lifecycle, homelessness system or full restoration/redevelopment rules. |
| 013–014 — Modules/open-close | PARTIAL / IMPLEMENTED | Modules and staffing now affect real fleet/treatment/enrollment capacity. Busy vehicles/cargo survive home-facility closure/removal. Generic module multipliers still do not reproduce a complete physical module inventory. |
| 017 — Budget | IMPLEMENTED | Municipal receipts now use actual private residential payments, not unpaid theoretical liabilities. Wages/immigration are declared private sources; spending goes to a merchant sink, not treasury. This is not a conserved firm-payroll macroeconomy. |
| 019 — Approval | PARTIAL | Per-home employment, purchases, private balances, arrears and satisfaction are inspectable and influence the city result. Complete R/C/I business approval, class complaints and individual resident thoughts/following are absent. |
| 030 — Recycling | PARTIAL | Actual returned waste can enter bounded processing and recover ore without double-counting landfill storage. Full distinct metal/alloy/plastic recovery streams and reference processing choices remain absent. |
| 038 — Technology | PARTIAL | Actual attained adult education replaces a simple school-radius education indicator. Complete skilled-job matching, industrial technology tiers and the reference dependency graph were not added. |
| 039 — Parks | PARTIAL | Local park influence remains. No actual park visitor/consumption trip model was added. |
| 041 — Traffic | PARTIAL | Real commuter assignments, capacity-reserved shopping and monthly service vehicles now exist. The overlay distinguishes current commute load from historical last-booked shopping; these are not one synchronized lane/queue simulation. |
| 050–052 | PARTIAL | Private household purchases must not be mistaken for freight logistics, actual tourist travel/spending or a casino visitor economy. Those broader systems remain partial. |
| 055, 062 | IMPLEMENTED | Independent cities carry new schema-3 household/service state. Validated schema-1/2 migration preserves prior city state and adds explicit current-month baselines; no historical wages, attainment or service completions are invented. Pending trips/cases/cargo and accounting identities persist. This retains narrow save/resume functionality, not a reliability certification: the open serialized-file-budget defect above still needs closure. No cloud service is implied. |
| 056, 060 | PARTIAL | Closed gateway/access rules affect new regional commitments while accepted resources stay conserved. Added wealth, private-budget, class-tax and fleet/cargo UI improves diagnosis; utility/service exchange and the complete reference reporting inventory are still missing. |
| 063–070 | Prior partial/missing statuses | Household cohorts and road-service vehicles do not complete mixed-use tower floors, corporate production, routed future drones, future transport or the robot event. Proximity fields remain labeled influence, not actual arrival. |

Case/material preservation applies before destructive facility replacement as well as ordinary demolition. Repeated reports cannot progress attendance, wages, transactions or trips. Strict current saves validate household counts, ledgers, service IDs/references, saved path adjacency and conservation; malformed partially upgraded state is rejected rather than guessed into shape.

## Complete status index

All 78 IDs appear once here. Unchanged rows retain `PARITY_STATUS_02.md`'s prior classifications, subject to the explicit refinements above.

| Status | Count | IDs |
|---|---:|---|
| IMPLEMENTED | 32 | 001, 002, 004, 006, 007, 008, 012, 014, 015, 016, 017, 018, 020, 021, 023, 025, 027, 029, 031, 032, 033, 034, 035, 036, 037, 040, 047, 055, 058, 061, 062, 076 |
| PARTIAL | 33 | 003, 005, 009, 010, 011, 013, 019, 022, 024, 026, 028, 030, 038, 039, 041, 042, 044, 046, 048, 049, 050, 051, 052, 054, 056, 059, 060, 063, 065, 066, 067, 077, 078 |
| MISSING | 13 | 043, 045, 053, 057, 064, 068, 069, 070, 071, 072, 073, 074, 075 |
| EQUIVALENCE VERIFIED | 0 | None |

## Inspected source identity

Baseline HEAD during inspection: `5cebb47` (CMD-02 review). That commit does **not** identify the changed working-tree product. The following SHA-256 hashes were actually computed from inspected files. Manifest lines are `HASH`, two spaces, `PATH`, newline, sorted lexically by path; their digest is **`820eae56c6ffc6d6002c6e9b083f5f4a4158e415ccd21099fc0af9c49c12cb43`**. A later source-format/performance revision must receive its current hashes and affected checks; a commit SHA may be attached after the manager commits the complete candidate.

| File | SHA-256 |
|---|---|
| `static/cmd-city/civic.mjs` | `81f6c9e2f43b5e9b2cf9e4c2b1711095ab2e5d0757f262ef11c8b5407f0e23cb` |
| `static/cmd-city/clock.mjs` | `753fa07ceb01228eb63fe7d8f0727db79801df99663bf990aa4a7300f09fbedb` |
| `static/cmd-city/content.mjs` | `465a867ba28ee560dd1b609d23c269b009f6face58dcb8ab4165c172d5bd19de` |
| `static/cmd-city/core.mjs` | `5856f059248d420383dcb7e78b6aec7bffc857116073e2173faa6688336a1fb7` |
| `static/cmd-city/environment.mjs` | `a07db7c66e37cfea86500b9ea5d0574ea86593ced61f03e9f614b4639eddb602` |
| `static/cmd-city/game.css` | `d6b6b34f6d0ffb728e2f7b343ffe1fda0470c48d98a9f2d8066141e8f0246239` |
| `static/cmd-city/game.mjs` | `327e588fd5c7f0c288fb996262cd9399688a3022d81ebf185eb898778eb18d43` |
| `static/cmd-city/households.mjs` | `1674f7f5f9b1f25ee9d6f98fead3d806a701926956bef460159f06dda2487599` |
| `static/cmd-city/region.mjs` | `df16b55fa3225e5d66006c015470abb7de3b5555eddbfbbd86c92ae3e777c446` |
| `static/cmd-city/save.mjs` | `eeba5165a57c043098621b4194363b550453a614168ffd993e2883b65f1f41e6` |
| `static/cmd-city/services.mjs` | `c665c6620ab033e37fb5c1ead3659536b5e04dbaa2da6183d0e081d064fb9b55` |
| `static/cmd-city/transit.mjs` | `2eb3ed830385c6adfbcad04b10b7ddb071fb691cee16dc3ffaf8346b069e2bf9` |
| `static/cmd-city/view.mjs` | `5b7dfbb69dcc93814b78d93bfabae88a5b91bfe901d2cbc4d7bc6d6ca63b3df4` |
| `templates/cmd_city.html` | `a76c4f20e1f6a95c2a0ec7b2e11622056ae19bf16c09fdad00d9ca5ea0f3bd0b` |
| `tests/browser/cmd-city-residents.spec.js` | `c52bcfbad534b57126a5633142d001d3486607e7d14c88689d827eab795cb8b3` |
| `tests/city/civic.test.mjs` | `aecbe98cbc77add34013c6ee1ebd4320392c8a7a4a1082119ddc33d32ac088e2` |
| `tests/city/core.test.mjs` | `e99fbe8f0fbc37e83cbbf59f5fcad9e50a117cb9119befce82d20b8c4ba58f7d` |
| `tests/city/environment.test.mjs` | `ac74ea295294e5b46dfa7ca49b4526a0deaf508c5c936de8e97602810cdaa9a1` |
| `tests/city/households.test.mjs` | `fafe4929f54e82a9b400405c3698ebef1234720002bed83153fbed18d23a72d9` |
| `tests/city/progression.test.mjs` | `11c49f1a2d297d2db2d87bd049335de7a5fe142c5afcdb247e0cc35afce1ba70` |
| `tests/city/region.test.mjs` | `acc4f0400eeaa5ff7287f8c56141803e40564639d7ea1217555ed4efe16e9577` |
| `tests/city/residents-integration.test.mjs` | `15a0ce586dc83c19a7397b82b93903012de51c5cea7c8fda6b6ebdb6225c65ac` |
| `tests/city/save-clock.test.mjs` | `7fef577ad5d10114838e8ab0b66b96837f4fb3cc662c51b07d56e004d184f5ef` |
| `tests/city/services.test.mjs` | `3adce10c519f09b51dce06fd63bd62177dd5388baced24dc46d4f84e2ea1e3cd` |
| `tests/city/transit.test.mjs` | `45999422c286ecb9262dba147e9079b04073bc479cad08550a636e5941295fa7` |

## Next missing foundations

1. Finish exact reference inventories and reproducible comparisons; no authored test alone proves literal equivalence.
2. Add firm-local stock/cash, freight lifecycle, deeper household identity/aging and automatic development where required. Current declared external flows are not a full closed economy.
3. Extend movement from monthly assignments into the missing reference geometry, intersection/lane/queue behavior, streetcars/ferries/aircraft and cross-city travelers.
4. Complete education/skill matching, incident variants/prevention/mortality and physical service modules without weakening conservation or migration guarantees.
5. Build actual tower-floor interdependence, corporate/future networks and remaining expansion events.
6. Design original authoritative online identity, permissions, synchronization and market systems; none was introduced in CMD-03.

This batch materially improves the original game's people-facing consequences and real service operations. It remains a development milestone toward the unchanged feature-equivalence target.

## Manager verification after the independent progress snapshot

The accepted-save size finding has since been corrected: city and region transactions now journal their source and validate encoded budgets before committing; the original oversized rename rejects unchanged and exports the same 1,048,506 bytes. Seven size-budget checks passed. Exact source hashes below remain the earlier independent inspection snapshot; the subsequent full manager inventory and candidate-bound TODD review identify the final guard/formatting source.

The final full manager suites passed 274 game / 176 browser / 33 application checks. Final current-source measurements remain failing targets: dense p95 47.01 ms vs 20 ms; sustained population minimum 4,018/4,800 (83.7%) vs 90%, p95 40.17 ms. Those results supersede intermediate timing figures for current-candidate reporting, without changing which tests the independent assessor executed. No reference equivalence or release is claimed.
