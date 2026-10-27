# Independent bounded readiness review — READINESS-01

**REVISE — 78.0/100. Stable first release is not approved for publication.** The retained source fails the existing dense p95 performance requirement, and current browser/render/accessibility evidence is incomplete. Full SimCity/Cities of Tomorrow equivalence is explicitly deferred this round; its absence is not an additional gate on this narrowed release assessment. No equivalence certification is given.

## Identity and review limits

Independent reviewer: `/root/bounded_readiness_review`. No product edits, recursive delegation, browser installation or duplicated full suite. Reviewed HEAD `925b5776751153a033cbb41bb7afb821f9aeebef`, tree `ed27e66212a780b0c7ce3d187246a0dcf7a12fc5`. The working changes at initial inspection were READINESS-01 evidence only. Independently matched all eight source/fixture SHA256 entries in `baseline-sustained.json` against local files. This verifies that bounded inventory, not a complete product manifest. Source inspection confirms the retained 512-root route-cache bound; the larger-cache experiment is not the candidate.

Read BUILD_PLAN's frozen ten criteria, CMD-04's prior independent review, current workload records and final test logs. CMD-04 reviewed a different source identity; its scores and browser passes are historical context, not current certification. Recovered source includes subsequent functionality, so unchanged behavior cannot be presumed throughout. Scores below are fresh judgments against available evidence, with the required-evidence cap of 84 applied. They are not completion percentages.

## Ten equal-weight scores

| # | Criterion | Score | Current evidence and missing checks |
|---|---|---:|---|
| 1 | Simulation and financial correctness | 84 | Current 385-game-test log and independent 41-test subset cover deterministic behavior, employment, service conservation and save/clock handling. Sustained minimum retention passes. No current complete progression/invariant audit; dense city collapses and sustained waste backlog grows. |
| 2 | Player understanding, feedback and complete building loop | 80 | Source provides costs, inspection, guide, controls and model feedback. Tests support underlying actions. No current rendered end-to-end progression/play review establishes that players can complete and understand the loop. |
| 3 | Mobile layout and touch controls | 75 | Responsive/input implementation and historical mobile evidence exist. Current source has no new four-width touch/browser evidence or physical-device review. |
| 4 | Desktop/tablet controls and integration compatibility | 80 | All 33 application checks pass in corrected environment; source exposes semantic controls and module integration. Current browser interaction, supported engines, tablet and live-host asset/CSP execution remain unverified. |
| 5 | Original visual polish and legibility | 75 | Original presentation source and historical renders support partial assessment. No current rendered-state inspection was performed; old screenshots do not establish current crowded overlays/panels or responsive legibility. |
| 6 | Accessible controls and honest nonvisual limits | 75 | Current HTML has labeled controls, skip navigation and keyboard map instructions. No current axe, contrast, manual keyboard or assistive-technology verification; Canvas nonvisual parity is unproven. |
| 7 | Measured performance and bounded resources | 65 | Node workloads and explicit cache/save limits are useful evidence. Dense p95 38.71ms fails the under-20ms requirement. Browser frame responsiveness, current memory behavior and device timing are absent. |
| 8 | Lifecycle, persistence and recovery reliability | 84 | Independent save/clock/service checks pass; sustained initial/final states serialize validly. Current browser storage denial, import cancellation, visibility/resize and recovery flows were not repeated. |
| 9 | Privacy, security and preserved site regressions | 84 | Corrected 33-test application log passes; static module integration remains visible. No current browser network/CSP audit or production verification. Initial missing-Flask failure was setup failure, not a product regression or a passing check. |
| 10 | Genuine TDD, maintainability and reproducibility | 78 | Current source identity, matched workload hashes and reproducible focused checks are retained. Prior TDD records are historical; this round makes no retained production correction and does not independently reestablish RED/GREEN provenance for all recovered additions. Full candidate inventory and current UI verification remain incomplete. |

**Mean: `(84 + 80 + 75 + 80 + 75 + 75 + 65 + 84 + 84 + 78) / 10 = 78.0`.** Gate remains 95 with mandatory evidence and no unresolved critical/high defect. No new critical/high code defect was reproduced in this bounded review; that is not proof of their absence.

## Checks and findings

Independent command: `node --test tests/city/employment-fairness.test.mjs tests/city/services.test.mjs tests/city/save-clock.test.mjs` — **41 passed, zero failed/skipped**, exit 0; full output in `independent-model-tests.txt`. Manager-executed logs show **385/385 game tests** and corrected **33 application tests** passing. I inspected those outputs but did not rerun either full suite.

Retained baseline: Node v24.22.1, Linux x64, AMD EPYC 9V74. Fully built 1,280-tile dense workload over 120 months has median **11.88ms**, p95 **38.71ms**, maximum **96.97ms**, and population **43,200 → 0**. Reporting success is not performance acceptance or evidence of a viable city.

The unchanged synthetic sustained fixture retains a minimum **4,385/4,800 = 91.35%**, passing its 90% requirement; final population is **4,508**. Median **11.66ms**, p95 **19.97ms**; valid saves **273,291/301,105 bytes**. This financed, prebuilt city begins with large finite stocks and is not ordinary progression proof. At month 120 its waste backlog is **76,510**, waste service ratio **0**, and health about **53.6**; retention alone does not demonstrate a healthy equilibrium.

The rejected 1,280-root-cache experiment produces dense p95 **34.38ms** (still fails) and sustained p95 **26.74ms** (worse than 19.97ms). Reverting it is supported; these single runs do not establish statistical superiority or a browser speedup. Absolute timings cannot be compared as a controlled improvement against CMD-04's different CPU environment.

## Release decision

Keep the exact source as a development candidate. Acceptance needs a measured dense-performance correction under the unchanged requirement and current rendered/browser evidence for the stable-release flows and required dimensions, accessibility, lifecycle and integration. Unfinished freight integration and lost unpublished changes are not credited as delivered. Current full-reference parity comparisons, complete candidate manifest, native CI identity and deployed-host smoke evidence are missing; parity work is deferred, and neither merge nor deployment is certified here.
