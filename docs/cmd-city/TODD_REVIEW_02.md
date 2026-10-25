# Independent TODD review — CMD-02

**Disposition: REVISE. Arithmetic mean: 85.6/100, below the unchanged 95-point gate.** Government, tracked goals, persistent environmental consequences and save migration materially improve the original game. The confirmed **SimCity (2013) plus Cities of Tomorrow feature-equivalence request remains incomplete**. No unresolved high-severity implementation defect was reproduced in the final reviewed source; missing required scope and reference comparisons still block acceptance.

## Source identity and independence

- Review: `CMD-TODD-02`, separate Codex reviewer session `/root/todd_city`; no product fixes were implemented by this reviewer.
- Remote source candidate identified by the manager: `0eb19f8f89ba03459f3c41172e7c53fa7316746a`.
- Independently inspected local candidate: `374473208e3924702098b336b34bca1c0b9df994`.
- Exact source tree: `28c71bceb31e31a0bcec3332d54b1b73cdb89290`.
- Inventory: [`evidence/CMD-02/source-manifest.json`](evidence/CMD-02/source-manifest.json). All **37 listed file hashes independently matched** the frozen files. SHA-256 of its `files` mapping encoded with Python `json.dumps(files, sort_keys=True)` is `2cd0c51308dc19d1c8ca693bfeb7c9ead5ccf9684ff12d6200dd70aaa46efa64`.

The local commit/tree and file inventory were verified directly. The manager supplied the native GitHub commit and confirmed its identical tree. A later review-only commit may add this report without transferring acceptance to changed product code. No main merge, production deployment or completed CI run is established by this review.

The exact ten criteria remain those frozen before implementation and recorded in `BUILD_PLAN.md` and `TODD_REVIEW.md`. The old inaccessible Neon-specific rubric creates no new requirement for this game. Scores assess the expanded whole-equivalence scope, not a reduced alpha scope; they are review judgments, not percentages of reference features completed.

## Ten equal-weight scores

| # | Frozen criterion | Score | Evidence and limits |
|---|---|---:|---|
| 1 | Simulation and financial correctness | 62 | Independent regressions and probes verify original civic lifecycles, finite resources, environment accounting and transactional restrictions. The ledger still identifies 40 partial and 15 missing scenarios; no reference-equivalent system has been independently certified. Wealth/people, service dispatch, several movement modes, tower/corporate economies and online authority remain material gaps. |
| 2 | Player understanding, feedback and complete city-building loop | 82 | Actual tutorial objectives, department benefits, request states/rewards and contamination explanations improve the planning loop. Focused browser flows exercise real purchases, claims, filtering and repayment. The full reference progression, household/business lifecycle and expansion loops remain absent or approximate. |
| 3 | Mobile layout and touch controls | 85 | Independently rerun new progression flows at 390px and inspected the retained mobile government render. Prior touch evidence and the manager's full four-width run support usable controls. Long vertically stacked management panels and repeated map/tool scrolling remain ergonomic limits; real-phone behavior remains unverified. |
| 4 | Desktop/tablet controls and integration compatibility | 85 | New desktop flows at 1440px passed independently. Actual baseline schema-1 region migration preserved its fields and a pending delivery. Supplied four-width Chromium regressions passed. Other browser engines, actual tablets and deployed PythonAnywhere gameplay were not verified. |
| 5 | Original visual polish and information legibility | 84 | Inspected actual desktop government/environment and mobile government renders: coherent panels, state labels, eligibility reasons and readable environmental summaries. Presentation remains a compact original development game; full map, entity and scenario depth is incomplete. |
| 6 | Accessible controls and honest nonvisual limits | 90 | Semantic controls, textual state, focus/confirmation behavior and the retained automated checks support accessibility. The bond-container role fix preserved the failing checks instead of weakening them. Broad assistive-technology play and nonvisual equivalence of the Canvas map remain unverified. |
| 7 | Measured performance and bounded resources | 90 | Independently reproduced a sustained fully built 1,280-tile, 4,800-resident city for 120 months: median 5.99ms, p95 11.04ms, all utility ratios 1 and finite groundwater declining normally. This improves the prior depopulating workload evidence. CPU benchmarks do not establish renderer timing, every city configuration, physical-device behavior or future online performance. |
| 8 | Lifecycle, persistence and recovery reliability | 93 | Independent authored tests and an actual old-source migration probe preserve prior state, shipments and deterministic continuation. Once-only claims survive browser export/import and local saves; rejected actions and hazards retain transactional behavior. Future cloud/multiplayer lifecycle and broad multi-engine recovery remain unverified. |
| 9 | Privacy, security and preserved site regressions | 94 | No new gameplay telemetry, paid model service or third-party runtime dependency. Strict save validation and CSP remain. Independent application checks pass; supplied full regressions pass. This is not a production penetration test or proof of the substantial security work required for missing online services. |
| 10 | Genuine TDD evidence, maintainability and reproducibility | 91 | Independent findings led to specific behavioral RED/GREEN regressions; source/test inventories and separate contracts make the new modules reproducible. Real old-version migration and model suites were rerun independently. Some broader evidence is manager-supplied, and the exact reference inventory/comparison evidence remains incomplete. |

**Mean: `(62 + 82 + 85 + 85 + 84 + 90 + 90 + 93 + 94 + 91) / 10 = 85.6`.** The higher score reflects verified work, not a weakened scope or a passed release gate.

## Independently executed checks

| Check | Result |
|---|---|
| All manifest file hashes and local commit/tree | 37/37 hashes matched; local commit/tree matched the identity above |
| `npm run test:game` on frozen source | **180 passed**, zero failed/skipped; exit 0. Includes 157 city and 23 retained Neon cases |
| `/tmp/cmd-city-venv/bin/python -m unittest -q` | **33 passed**, exit 0; 1.352s |
| `tests/browser/cmd-city-progression.spec.js`, Chromium 390px and 1440px | **8 passed**, exit 0; 19.7s. Covered department/tutorial behavior, once-only request claim with persistence, contamination/wind/reactor confirmation, and Finance repayment confirmation |
| `node tests/city/sustained-benchmark.mjs` | Population min=max **4,800** for 120 months; 2,800 workers, 2,880 jobs, 2,136 employed; utility ratios stayed 1; groundwater 1,000,000→59,800; valid initial/final saves; no model override or mid-run replenishment |
| Independent sustained timing | Node 24.19.0/Linux x64, AMD EPYC 9V74: median **5.99ms**, p95 **11.04ms**, maximum **31.77ms**. Timing differs from the manager's run, as expected |
| Actual baseline migration | Extracted modules from Git commit `61bbe2df9acf6a6ae3620038212f8bf4841fec50`, created a real schema-1 three-city region at month 3 with pending goods, then parsed it using the new source. All prior state fields were preserved except the explicit version migration; cargo arrived once and independently restored copies continued identically |
| Corrective probes | Coercible department/badge IDs rejected; shared forecast inputs/headroom reserved once; radioactive new regional dispatch and project contributions rejected with the entire region unchanged |
| Additional environment accounting | 40 deterministic source-free random-field probes preserved reported air accounting and derived ground/radiation balances; post-states remained valid |

The dedicated benchmark uses disclosed synthetic initial assets, capital and stocks; it is not proof that normal progression reaches the layout. The older 43,200-resident stress case still depopulates and is not sustained-population evidence. Neither benchmark measures browser rendering or physical hardware.

The focused browser execution used the repository's Playwright fixture, official Chrome for Testing supplied through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, and synthetic local state. Retained desktop/mobile screenshots were visually inspected. The manager's separate CUA department purchase was not this reviewer's manual execution and is not represented as such.

## Supplied evidence inspected separately

`VERIFICATION_02.md` and the committed `evidence/CMD-02/` logs report 160 final browser checks, 27 orchestration, five runtime transport, 33 operations, and nine matched research tasks. Their logs and relevant test definitions were inspected; this reviewer did not independently rerun those complete suites. The initial full-browser run's four accessibility failures, semantic-role correction, focused GREEN and complete 160-case GREEN are recorded rather than concealed. No test removal or relaxation was needed for that correction.

## Findings and remaining acceptance blockers

**Corrected during independent review:** non-string civic identifiers that paid for unrecognized departments; forecast emitters claiming the same shared stock/storage; radiation-restricted trade endpoints bypassing operation eligibility. The frozen source's regressions and independent probes close those findings. The earlier possible education-range concern was withdrawn after actual reproduction showed existing coverage clamping; it is not a defect or a claimed fix.

**No unresolved high-severity implementation defect was reproduced in this candidate.** This is bounded evidence, not a guarantee that no undiscovered defect exists.

1. **Blocking scope gap:** [`PARITY_STATUS_02.md`](PARITY_STATUS_02.md) records **23 narrowly implemented, 40 partial and 15 missing** scenarios; **EQUIVALENCE VERIFIED remains zero**. Counts are not a completion percentage. Core missing/partial areas include wealth/household/skill cohorts, actual consumption/freight/service-vehicle lifecycle, freeform road behavior and remaining transport modes, cross-city commuting, mixed-use tower floors, corporate/future networks and authenticated online region functionality.
2. **Blocking comparison gap:** the user confirmed the edition, closing the prior edition ambiguity. Exact reference inventories and observed, independently compared acceptance scenarios remain incomplete. Passing original authored tests is not proof of literal feature equivalence.
3. **Explicit model limits:** environmental emissions are **opening-month activity forecasts**, not exact later post-growth production or calibrated physical measurements. Water quantity remains citywide; filtration is weighted delivery rather than pipe hydraulics. These limitations remain relevant to parity even though the new stateful systems work.
4. **Nonblocking verification/quality limits:** real-device and multi-engine checks, comprehensive assistive-technology play, renderer/frame performance and deeper mobile ergonomics remain unverified or incomplete. A published source branch is not a verified production deployment.

**Release decision:** retain the reviewed development branch and continue against the full parity target. Do not merge or deploy this candidate as the completed feature-equivalent release under the unchanged gate. This is material, tested progress toward the requested result, not completion of that result.
