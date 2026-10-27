# Independent TODD review — CMD-03

**Disposition: REVISE. Arithmetic mean: 85.1/100, below the unchanged 95-point gate.** Household budgets, finite education and actual service journeys materially improve the original game. The confirmed **SimCity (2013) plus Cities of Tomorrow feature-equivalence request remains incomplete**. The dense simulation performance target and sustained-population requirement also fail on this exact candidate. Passing functional regressions does not establish that all release requirements passed.

## Candidate and independence

- Review: `CMD-TODD-03`, separate Codex reviewer session `/root/todd_city`. This reviewer implemented no product fixes and wrote only this report in the repository.
- Independently verified local commit: `9d939625421b5fa4c47727d1b214943d676e58b0`.
- Independently verified source tree: `e92bf9c214b281373343cefa7ca3ed8e7aeb63aa`.
- Native GitHub source candidate supplied by the manager: `f13ea1b208c1747f9b64facd4094308d21006be7` on `october2026/cmd-city-plan`. The manager verified its exact tree equals the independently verified local tree above; the commit metadata differs.
- Inventory: [`evidence/CMD-03/source-manifest.json`](evidence/CMD-03/source-manifest.json). All **44 listed file hashes independently matched**. Its `files` mapping, encoded with Python `json.dumps(files, sort_keys=True)`, hashes to **`6e160d2c393a2da38cd6b49cbc159002746721319e9efefd668016f98cd68fc9`**.

The ten criteria, equal weights, scoring anchors, full comparison scope and 95-point threshold remain unchanged from the earlier city reviews. Scores are bounded review judgments, not feature-completion percentages. A later report-only commit can preserve this source identity; changed product code requires affected review again. This report establishes neither main merge, completed native CI nor PythonAnywhere production deployment.

## Ten equal-weight scores

| # | Frozen criterion | Score | Evidence and remaining limits |
|---|---|---:|---|
| 1 | Simulation and financial correctness | 68 | Actual private collections, conserved household cohorts, bounded shopping, finite education and material/case journeys pass independent checks. Wages and immigration are declared external private sources; merchant receipts are a sink. Significant reference systems remain partial/missing, and the unchanged sustained fixture retains only 83.7% of residents. |
| 2 | Player understanding, feedback and a complete city-building loop | 85 | Residents and dispatch panels expose actual wallets, booked taxes, enrollment, unmet purchases, cargo and waiting/admitted cases. Closed-road recovery is usable. The full reference business, transport, future-economy and regional progression remains incomplete. |
| 3 | Mobile layout and touch controls | 85 | Four new flows passed independently at 390px; the retained 360px Residents render is readable. Supplied four-width regressions support usability. Very long stacked panels and map/tool scrolling remain ergonomic limitations; physical-phone evidence is absent. |
| 4 | Desktop/tablet controls and integration compatibility | 86 | New flows passed at 1440px; independently generated real schema-1/2 saves preserve their old fields and deterministic continuation. Supplied Chromium coverage includes 768px. Other engines, actual tablets and live hosting remain unverified. |
| 5 | Original visual polish and information legibility | 85 | Actual retained Residents mobile and Dispatch desktop images were inspected: coherent cards, legible ledgers and distinctions between waiting, carried, admitted and treated cases. The map and scenario presentation remain a compact original development game. |
| 6 | Accessible controls and honest nonvisual limits | 90 | New browser flows include semantic controls, confirmation, accessibility and overflow checks. Text explains cohort, private-money and vehicle limitations. Broad assistive-technology play and full nonvisual equivalence of the Canvas map remain unverified. |
| 7 | Measured performance and bounded resources | 72 | Exact byte-budget journals, fleet/task caps and bounded route caches are verified. However independently measured dense p95 is 44.77ms against the under-20ms target; sustained p95 is 35.01ms and retention fails. These are unresolved required gates, not successful performance evidence. Renderer and phone timing remain unverified. |
| 8 | Lifecycle, persistence and recovery reliability | 94 | Strict schema-3 validation, real old-version migration, pending cargo/cases, idempotent hooks, route recovery and exact city/region byte rollback pass. The original near-limit rename failure is closed; normal controller roots retain identity. Missing cloud/online lifecycles and broader device recovery remain unverified. |
| 9 | Privacy, security and preserved site regressions | 94 | No new gameplay telemetry, paid service or third-party runtime dependency. Strict save validation and existing site protections remain; 33 application checks passed independently. This is not a penetration test or online-service security certification. |
| 10 | Genuine TDD evidence, maintainability and reproducibility | 92 | Separate contracts, source inventory, genuine scaffold/corrective RED/GREEN evidence and reproducible migrations support the work. Independent findings produced specific corrections rather than weakened tests. Exact reference comparison evidence is incomplete; some broader checks are manager-executed. |

**Mean: `(68 + 85 + 85 + 86 + 85 + 90 + 72 + 94 + 94 + 92) / 10 = 85.1`.** Verified functional improvements do not offset the newly reproduced performance/retention failures enough to raise the overall result above CMD-02. No gate was weakened to obtain a score.

## Independently executed verification

| Check | Actual result |
|---|---|
| Commit, tree and manifest | Exact identity above; 44/44 hashes and mapping digest matched |
| `npm run test:game` | **274 passed**, zero failed/skipped; 251 city and 23 retained Neon checks; 6.55s |
| `/tmp/cmd-city-venv/bin/python -m unittest -q` | **33 passed**, exit 0; 2.92s |
| `tests/browser/cmd-city-residents.spec.js`, Chromium 390px and 1440px | **8 passed**, exit 0; 34.5s. Real household ledgers/purchases and import, Finance class/bulk rates, actual vehicle/case persistence, closed-gateway reopening |
| Fresh actual legacy saves | Extracted committed modules from `61bbe2df9acf6a6ae3620038212f8bf4841fec50` (schema 1) and `5cebb4748ec1ad1c69c79aef924b46238f02fe6b` (schema 2). Generated separate three-city regions with pending shipment and project contribution. Migration preserved every previous city field except explicit version/additions, retained project/shipments and produced identical next states from separately restored copies |
| Original closed-road probe on final source | Accepted disabled gateway now gives no access, employment, wages, service fleet or shopping; new regional dispatch rejects. Burning gateway opening access also rejects; later resumption after actual fire clearance is intentional reopening |
| Original size probe on final source | Module-valid maximal combination measured **1,134,586 bytes**, correctly outside the whole-city import bound. A **1,048,506-byte** accepted state rejects the 80-character rename with every field unchanged and remains exportable. Its separate successful month exports **719,575 bytes** |
| Size-budget regression and controller identity | Seven targeted city/region cases passed independently before final formatting and again within the final complete suite. Checked 1 MiB city and 3 MiB region action/month rollback, ASCII/control/emoji names, shipments/contributions and preserved city roots. A separate ordinary rename/tax/funding/shipment/month probe preserved region, city-array, city-entry and state-root identities with exact round-trip equality |

Earlier standalone independent QA ran **1,200 varying months per module**: household population/cash/arrears/stock identities, late training entrants, zero-staff education, report purity and repeated hooks; service case/material conservation under incidents, closures, broken/repaired roads and demolition. Those executions preceded performance refactoring and final formatting. They are supporting history, not falsely described as 2,400 months on the final hashes. Final authored regressions were rerun on the complete frozen source.

Browser execution used the repository fixture, synthetic state, Playwright and the supplied official Chrome for Testing executable. It is emulation, not physical-phone or multi-engine evidence. Retained browser images were opened and inspected; this reviewer performed no manual CUA play for CMD-03.

## Independently reproduced failed workload gates

Both runs used Node **24.19.0**, Linux x64, AMD EPYC **9V74**. They ran sequentially after the focused browser suite finished. Timing variation from the manager's recorded run does not alter either conclusion.

| Fixture and command | Independent result | Required conclusion |
|---|---|---|
| `node tests/city/benchmark.mjs`, original fully built 1,280-tile dense fixture, 120 months | Median **15.93ms**, p95 **44.77ms**, max **74.54ms**; population **43,200→0**; `targetMet:false` | Under-20ms p95 target **FAIL**. The reporting script exits 0 despite its explicit failed target. Depopulation prevents treating it as maintained-population evidence |
| `node tests/city/sustained-benchmark.mjs`, unchanged disclosed geometry/assets/stocks, 120 months | Median **19.77ms**, p95 **35.01ms**, max **69.17ms**; minimum/final **4,018 of 4,800**, **83.7%**; `sustained:false`; **exit 1** | At-least-90% population retention **FAIL**. Initial/final saves validate at **273,059 / 300,752 bytes** |

The sustained run used no model override or mid-run resource/population refresh. It also accumulated substantial uncollected waste despite nominal processing capacity, illustrating the new requirement for actual collection/return. This fixture failure does not prove every normal city is unstable, but the successful constant-4,800 CMD-02 run cannot be reused as current evidence. Synthetic initial capital and assets are not normal-progression proof; Node model timing is not browser-render or device timing.

## Supplied evidence and findings

Inspected [`VERIFICATION_03.md`](VERIFICATION_03.md), [`PARITY_STATUS_03.md`](PARITY_STATUS_03.md), contracts, source/tests and committed evidence. The manager's separate complete **176-browser**, **27 orchestration**, **5 runtime**, **33 operations** and nine matched research-task runs are attributed evidence, not this reviewer's independent executions. Genuine initial behavioral failures, corrective road/byte-budget failures and GREEN runs are retained; setup/formatter errors are not counted as behavioral TDD. The parity snapshot predates the final byte correction; this report and final source supersede its explicitly open size-defect note without changing its scope accounting.

**Corrected findings:** actual staffing was added to finite education; disabled/burning road flags now agree across graphs and cache invalidation; protected-gateway recovery remains saveable; exact encoded budgets prevent an accepted action from making city/region state unexportable. The service contract correctly withdrew its claim that entity caps alone guarantee a sub-1-MiB save. No new unresolved high-severity implementation defect was reproduced in the frozen source. That bounded statement does not erase the following acceptance blockers:

1. **Full scope remains incomplete.** The unchanged 78-scenario ledger records **32 narrow IMPLEMENTED, 33 PARTIAL and 13 MISSING; EQUIVALENCE VERIFIED: 0**. These counts are not a reference-completion percentage. Missing/partial breadth includes full individual/business lifecycles and skill matching, producer-to-shop freight, freeform roads/remaining transport, combined traffic physics, regional commuters/aid, mixed-use tower floors, corporate/future networks and authenticated online functionality.
2. **Literal comparison is unverified.** Confirming the edition and consulting documentation does not replace a complete reference inventory and observed side-by-side acceptance scenarios. Original authored tests establish original behavior, not feature-for-feature identity.
3. **Performance gate fails.** Reproduction above exceeds the frozen dense p95 limit. Continue optimization with exact behavior and source binding; do not substitute a lighter fixture or relabel this pass.
4. **Sustained workload gate fails.** The existing no-refresh fixture falls below 90% retention. Diagnose the actual transport/service/economy result and preserve the failing evidence; do not replay the prior candidate's successful result.

Households remain static age cohorts with external wage funding and merchant sinks, goods remain citywide, service counts are cases rather than unique identities, and vehicles advance in monthly steps. Mobile ergonomics, assistive-technology play, multi-engine/device behavior and renderer performance retain their stated limits.

**Release decision:** keep the development candidate and evidence available; continue against the full confirmed target. Do not merge or deploy this candidate as the completed feature-equivalent release under the unchanged gate.
