# Independent TODD review — CMD City

**Disposition: REVISE against the requested feature-to-feature equivalence scope.** The candidate is a functioning original city-building milestone. It does not satisfy literal SimCity feature equivalence and does not pass the 95-point release gate. No unresolved high-severity implementation defect was reproduced in the final reviewed source; missing required product scope remains a release blocker.

## Reviewed identity and independence

- Review ID: `CMD-TODD-01`.
- Reviewer: separate Codex agent session `/root/todd_city`, independent of the implementation sessions. The reviewer inspected, tested and reported defects; it did not implement product fixes.
- Remote candidate supplied by the implementation manager: `a80d994ec27309d50b490735fce52dac6f6c44f7`.
- Independently inspected local commit: `ec6320feb018365fdc9d13cbeb8028d6c67a9a0d`.
- Local tree: `04c3d4cf3afdb3ddd2d5332a9460d6a8bd69733c`, matching the manager's identified remote source tree.
- Source inventory: [`evidence/source-manifest.json`](evidence/source-manifest.json). All **27 file hashes independently matched** the working files at review. SHA-256 of the sorted `files` mapping using Python `json.dumps(files, sort_keys=True)` is `3d59f5e6ff1dd33687308673e075e867055982269894751ed9ab5f90a9705b57`.
- A later report-only commit may add this review without changing the reviewed source. Any product change invalidates the affected evidence and requires reassessment.

The scope is the owner's expanded feature-equivalence request, using the documented working assumption of SimCity (2013) plus Cities of Tomorrow. That edition is not yet user-confirmed. The initial small-playable exclusions do not reduce the final scope.

## Ten equal-weight scores

Scores are bounded review judgments, not statistical confidence or a percentage of franchise features completed.

| # | Frozen criterion | Score | Evidence and remaining limitation |
|---|---|---:|---|
| 1 | Simulation and financial correctness | 55 | Authored construction, employment, utility, budget, transit and regional conservation behaviors pass independent tests. Full population/wealth, logistics, services, environment and expansion behavior is materially incomplete; no reference equivalence was verified. |
| 2 | Player understanding, feedback and complete city-building loop | 75 | Actual browser play demonstrated growth, spending, inspection, regional reservation and delivery. The inspector and ledger explain many consequences. Guided objectives, government progression, household/business lifecycle and numerous requested systems remain absent. |
| 3 | Mobile layout and touch controls | 84 | Mobile render inspected; supplied browser evidence includes touch scenarios and four viewport widths. The responsive layout is usable, but map and construction controls require substantial repeated scrolling. Physical-phone behavior and sustained device performance remain unverified. |
| 4 | Desktop/tablet controls and integration compatibility | 84 | Independent desktop browser flows worked; the inspected regression evidence covers Chromium at 360/390/768/1440 widths. Other browser engines, real tablets and a deployed PythonAnywhere game were not independently verified. |
| 5 | Original visual polish and information legibility | 82 | Original map art, coherent panels, readable desktop HUD and clear overlays were visually inspected. This is a compact development presentation with limited visual/state depth; it is not evidence of the full requested city experience. |
| 6 | Accessible controls and honest nonvisual limits | 88 | Semantic HTML controls, keyboard routes, textual tile descriptions, focus behavior and supplied automated accessibility checks are present. Canvas nonvisual limitations are disclosed. Comprehensive assistive-technology play and all future systems are unverified. |
| 7 | Measured performance and bounded resources | 84 | Independent synthetic benchmark returned 18.47 ms p95 and 4.63 ms median over 120 months; caches/history are bounded. Population fell from 43,200 to 1,556, so this does not establish sustained dense-city performance, renderer/frame timing or physical-device behavior. |
| 8 | Lifecycle, persistence and recovery reliability | 90 | Independent model checks cover deterministic saves, rejected inputs, scheduling and boundary preservation; actual browser cancellation preserved state. The inspected browser report adds storage denial, export/import and limit recovery. Online/cloud lifecycle remains absent; broad cross-browser recovery is unverified. |
| 9 | Privacy, security and preserved site regressions | 94 | Gameplay remains local; no new gameplay telemetry, account service or third-party runtime dependency was introduced. Strict save validation and the existing CSP are retained. Independent Python regressions passed; supplied full browser regressions passed. Production/container deployment checks and future online-security requirements are not established by this candidate. |
| 10 | Genuine TDD evidence, maintainability and reproducibility | 88 | Pure model/modules, source inventory and actual behavioral RED/GREEN evidence are available. Independent defects produced additional regressions and fixes. Some evidence is manager-supplied, the future reference catalog is incomplete, and passing authored tests does not prove equivalence. |

**Arithmetic mean: 82.4 / 100** (`824 / 10`), below the required 95. Missing product scope independently blocks acceptance regardless of arithmetic.

## Independently executed verification

| Check | Actual result |
|---|---|
| `node --test tests/city/*.test.mjs` on the frozen source | 83 passed, 0 failed, 0 skipped; exit 0 |
| `npm run test:game` on the frozen source | 106 passed, 0 failed, 0 skipped; exit 0 |
| `/tmp/cmd-city-venv/bin/python -m unittest -q` on the frozen source | 33 passed; exit 0. Static-response tests emitted test-only unclosed-response `ResourceWarning`s. |
| SHA-256 verification of every manifest entry | All 27 matched |
| Independent targeted model probes during review | Reproduced then verified correction of inherited-key state corruption, fuel/water overcommit, unsupplied production, waste gating, overflow, ghost production, rejected-action RNG mutation, omitted visitor income and deposit loss at storage capacity |
| Near-treasury-boundary probes after correction | Rejected positive overflow preserved the entire region and exportability; valid negative-boundary advancement preserved city object identity and saveability |
| `node tests/city/benchmark.mjs` | AMD EPYC 9V74, Node 24.19.0/Linux x64; 120 months, median 4.63 ms, p95 18.47 ms, max 36.51 ms; population 43,200 to 1,556 |
| Actual CUA desktop interaction | Started/paused simulation, observed growth, opened/canceled replacement without losing the city; inspected original rendering and management panels |
| Actual CUA regional flow | Confirmed 10-goods shipment, exact $20 freight deduction, in-transit reservation, arrival event in region month 1, and synchronized growth in all three cities; no duplicate freight observed |

The independent benchmark and interactive flows preceded the final inspector-only/boundary refinements; their relevant unchanged implementations were inspected again. Final model/application reruns and the manifest check bind the current source. No physical-device or original-reference-game playtest was performed.

## Supplied evidence inspected, not independently re-executed

The committed evidence reports 144 passing browser regressions, including 32 city checks, plus 33 operations, 27 orchestration and five runtime-unit checks. Their logs and test definitions were inspected. These numbers must not be represented as independent reviewer browser-suite executions. Browser viewport/touch emulation is not physical hardware evidence. Docker production-image execution and an actual PythonAnywhere city deployment were not verified here.

## Outstanding findings and release implications

1. **Blocking scope gap — equivalence incomplete.** [`PARITY_STATUS.md`](PARITY_STATUS.md) records 15 narrowly implemented targets, 42 partial and 21 missing, with **zero EQUIVALENCE VERIFIED**. This is not a completion percentage. Missing or partial areas include freeform road geometry, wealth/demographic cohorts, individual shopping/freight/service dispatch, contamination/radiation, government/objective progression, several transport modes, cross-city commuters, mixed-use tower systems, corporate/future networks and online region functionality.
2. **Blocking evidence gap — reference comparison.** No exhaustive reference-building/system inventory or side-by-side acceptance scenarios establish literal equivalence. The assumed edition and detailed expansion scope remain unresolved. The 78-row inventory is a starting backlog, not proof of exhaustiveness.
3. **Nonblocking quality limits.** Real-phone and multi-engine coverage, sustained dense-city/renderer performance and deeper accessibility play remain unverified. Mobile construction ergonomics can improve. The Python static-asset integration tests should close response handles to eliminate their warnings.

Earlier reproducible high-severity implementation findings were corrected and covered by behavioral regressions. The final inspector now applies standby upkeep and explains utility/funding operation blockers. This review did not reproduce an unresolved high-severity defect in the authored milestone; it also does not certify that no undiscovered defect exists.

**Release decision:** retain the feature branch/draft review and continue implementation against the parity ledger. Do not merge or deploy this as the requested feature-equivalent release under the existing gate. The source is useful, testable progress; it is not the completed user request.
