# Independent TODD review — CMD-04

**REVISE — 85.5/100, below the unchanged 95-point release gate.** This continuation fixes permanent commuting priority and admission of newly staffed providers into a full idle fleet. The unchanged sustained-city fixture now passes its population-retention requirement. The dense performance requirement and the full SimCity (2013) plus Cities of Tomorrow equivalence target remain unmet.

## Identity and independence

This review was performed by separate Codex session `/root/cmd04_todd`. The reviewer implemented no product code and wrote only this report in the repository.

- Independently verified local source commit: `c32d29190aa45af42935f046ac57e14de2db88e5`.
- Independently verified tree: `880e3758c50e9481063f1fb2878ad8e83663646a`.
- Native source candidate supplied by manager: `93432d1bec84f40d6eb44f4fcbab5c8e10dcdca2`; manager verified its tree equals the local tree above.
- [Source inventory](evidence/CMD-04/source-manifest.json): **46/46 SHA256 hashes independently matched**. Python `json.dumps(files, sort_keys=True)` mapping digest: `0d04c9eb5e87412f4e60c23c2701dc7ad51d1417cfce986c5e17299ea4af1424`.
- Product hashes: core `ecc7fc43b895aeebf454d1003ab975510a257ef57c0f8b23352949275501dcce`; services `fa78a88537ddfa8b1968b5912d6ad2f61f685db746030c28b8ec67c5af4fc9d0`.

Later documentation-only publication preserves this product identity. Changed product code requires affected review again. The ten criteria and equal weights remain those of CMD-TODD-03. Scores are review judgments, not feature-completion percentages. This report does not certify native CI, main merge or PythonAnywhere deployment.

## Ten equal-weight scores

| # | Frozen criterion | Score | Evidence and limits |
|---|---|---:|---|
| 1 | Simulation and financial correctness | 70 | Exact job totals, home/job reconciliation, road limits, active cargo and task identities pass. Monthly priority corrects permanent index preference and the sustained fixture retains 91.35%. Full reference simulation/economy remains incomplete; long rotation cycles and scarce jobs still limit households. |
| 2 | Player understanding, feedback and a complete city-building loop | 85 | Current browser flows expose actual household finances and service journeys. New staffed facilities can receive vehicles; recurring commuting opportunity improves viability. No new full-reference business/transport/future progression was added. |
| 3 | Mobile layout and touch controls | 85 | Four current resident/service flows pass at 390px; manager reports complete four-width coverage. UI is unchanged from CMD-03, including long stacked panels. No physical-phone evidence. |
| 4 | Desktop/tablet controls and integration compatibility | 86 | Four current flows pass at 1440px; all deterministic games and application checks pass. Save schema and migration code remain unchanged. Other engines, actual tablets and live hosting remain unverified. |
| 5 | Original visual polish and information legibility | 85 | Presentation code/assets are unchanged; the CMD-03 visual assessment is retained as historical evidence. Current browser integration passes. No new visual-polish improvement or manual visual play is claimed. |
| 6 | Accessible controls and honest nonvisual limits | 90 | Existing semantics/accessibility checks remain in current browser flows and supplied full regressions. No broader assistive-technology or nonvisual Canvas-equivalence evidence was added. |
| 7 | Measured performance and bounded resources | 73 | Exact report caches and zero-capacity early exit preserve pure-refactor behavior. Fleet/task and save limits remain. Controlled tail timing improves, but median does not consistently improve; final independent dense p95 68.38ms fails the under-20ms requirement. |
| 8 | Lifecycle, persistence and recovery reliability | 94 | Existing byte-budget, migration, deterministic save, closure and recovery regressions pass. Fleet redistribution preserves blocked cargo journeys and task backlinks. No schema change or weakening of transactions. Online/device lifecycle breadth remains unverified. |
| 9 | Privacy, security and preserved site regressions | 94 | No new telemetry, paid service, external runtime or account functionality. Independently executed 33 application checks pass. This remains a bounded regression review, not a penetration test. |
| 10 | Genuine TDD evidence, maintainability and reproducibility | 93 | Actual baseline reproduces three new behavioral failures; final source passes. Pure refactor has independently reproduced 240-month exact state/report equivalence. Manifest, contracts and diagnostic limitations are explicit. Exact reference comparisons remain incomplete. |

**Mean: `(70 + 85 + 85 + 86 + 85 + 90 + 73 + 94 + 94 + 93) / 10 = 85.5`.** No target was relaxed and no score was adjusted to obtain acceptance.

## Independent checks

- `npm run test:game`: **280 passed**, zero failed/skipped, exit 0. Includes the two fleet regressions, two commuting regressions, two report-cache checks, and all previous city/Neon tests.
- `/tmp/cmd04-venv/bin/python -m unittest -q`: **33 passed**, exit 0.
- Focused `tests/browser/cmd-city-residents.spec.js`, Chromium 390px and 1440px: **8 passed**, exit 0. Exercises household budgets/import, class/bulk rates and receipts, saved vehicle/case conservation, and reopening a closed gateway.
- **72 independent cache probes passed** across eight seeds. Mutated funding, utilities, road closure/fire, research, facility modules/types and previous returned arrays; complete cached measurements matched fresh cloned-city measurements. This directly checks cache invalidation and defensive copies.
- Extracted original modules from baseline `c935bc91988f4882dfce8b858d265dbb6d7a2f5c`, applied only the retained pure-refactor patch to a separate copy, and independently reran the retained differential probe: **240/240 full saved-state and report hashes exactly matched**. This equality does not cover the later intentional commuting/fleet behavior changes.
- Ran new fairness/fleet regressions against the extracted original source: **three behavioral failures, 31 passes, exit 1**. The same tests pass on the final source. This independently corroborates the preserved original RED evidence; it is not a claim that the reviewer authored tests before implementation.

The manager also reports native GitHub Production readiness **run 25 completed successfully** on source `93432d1bec84f40d6eb44f4fcbab5c8e10dcdca2`; that result is manager-verified and does not override the failed performance gate.

Manager's separate **176-browser** run passed at 360/390/768/1440 widths. It is attributed evidence, not this reviewer's independent full-browser execution. Browser testing used pinned Playwright and supplied official Chrome for Testing; it is emulation, not physical-device or multi-engine proof. Prior legacy-save and visual results remain historical; the relevant unchanged source and current regression suites support continuity, but this reviewer did not repeat manual visual play or regenerate old-source migration fixtures for CMD-04.

## Independent workload results

Runs were sequential, after manager browser activity finished and before this reviewer's browser run. Environment: Node **24.22.1**, Linux x64, **Intel Xeon Platinum 8573C**. This differs from CMD-03's EPYC host; those absolute timings are not directly comparable.

| Fixture | Current independent result | Decision |
|---|---|---|
| Original fully built dense fixture, 1,280 tiles, 120 months | Median **25.50ms**, p95 **68.38ms**, max **151.37ms**; population **43,200→0** | Under-20ms p95 **FAIL**; `targetMet:false`. Reporting script exit 0 does not imply acceptance or maintained population. |
| Unchanged sustained fixture, 120 months | Median **27.49ms**, p95 **42.18ms**, max **109.83ms**; minimum/final **4,385/4,800 (91.35%)** | At-least-90% retention **PASS**, exit 0. Initial/final saves valid at **273,059 / 300,869 bytes**. |

There were no fixture changes, model overrides, in-run population/resource refreshes or weakened assertions. Passing retention applies to this disclosed synthetic city, not every layout or normal-progression proof. The separate fleet correction alone retained only 83.7%; the final integrated result includes the intentional commuting rotation. Supplied controlled pure-refactor timings show p95 79.66→59.42ms but median 29.98→32.39ms; the final gameplay change has separate timings. No blanket speedup or current performance-gate pass is claimed.

## Findings and release decision

No new unresolved high-severity implementation defect was reproduced. The two corrected behaviors have concrete baseline failures and final evidence:

1. Eligible households now rotate priority by `month % eligibleHomes.length`; disabled, disconnected and workerless homes do not consume turns. Existing nearest-job, utility, road and transit limits still constrain actual work. This is eventual priority, not guaranteed equal employment or household survival; a large eligible list can have a long cycle.
2. Fleet allocation reserves active journeys, then apportions remaining capacity before keeping idle vehicles. New providers can receive a slot previously monopolized by idle fleets. Blocked cargo, IDs and task references survive. Allocation remains bounded by 64 vehicles and ordered by service kind then map index; more than 64 providers cannot all receive a vehicle, and active journeys are not deleted to make room.

**Still blocking acceptance:** dense performance exceeds the frozen target, and the confirmed full feature-equivalence scope/reference comparison remains incomplete. No scenario was newly promoted by these corrective changes: the latest ledger remains **32 narrowly implemented / 33 partial / 13 missing; zero equivalence verified**. Full individual/business lifecycles, freight, freeform roads and remaining transport, future-city systems and online authority remain partial or absent.

Keep this as a development candidate. Continue performance and full-scope work under the unchanged **95-point** gate; do not represent this review as approval to merge or deploy a completed feature-equivalent release.
