# Independent bounded readiness review — READINESS-02

**REVISE; formal release certification BLOCKED. Provisional mean 81.7/100.** Dense-month p95 remains above the unchanged 20 ms target. This is one independent assessment of a development candidate, not merge, publication or feature-equivalence approval. Full-reference feature parity is deferred for the narrowed first release and is not charged as an additional blocker here.

## Identity and scope

Reviewer session: `/root/readiness02_review`, independent of implementation. No product changes, subagents, browser installation or broad browser rerun. Reviewed exact candidate `2a50622116df1a546fd02f38544927acfd297f4e`, tree `df748fdc1cb0bfe3be91c4f835491392baf383c3`, against baseline `f418e76`. The accompanying `independent-source-sha256.txt` records locally computed SHA256 hashes for the CMD City source/tests, imported game assets and relevant integration files. It is a bounded source inventory, not a whole-repository security attestation. Review artifacts and the manager's integration log are subsequent evidence-only additions.

The 65-file manifest itself has SHA256 `5c5a88fe401f1dbfeb8e1b4d670ac1bb004d4dc1e0e8d40a9e747527fc7c3907`; all entries were independently verified with `sha256sum -c` after the review was written.

Read AGENTS.md, SKILLS.md, relevant local TODD/visual/evidence skills, ROUND.md and READINESS-01's independent review. The exact frozen rubric required by AGENTS.md, `dev_docs/handoff/Legit_Arcade_Codespaces_Kit/overlay/ops/arcade/reference/NEON_BREAKER_TODD_RUBRIC.md`, is absent. Consequently the ten dimensions below are borrowed from READINESS-01 **for provisional assessment only**; their scores cannot authenticate compliance with the missing frozen rubric. No release approval follows from this document.

Separated focused model edits (`fcd5a9e`), main integration (`ab9d368`, parents `fcd5a9e` and `1f43187`), and focused UI edits (`2a50622`). The imported Circuit Match, Blockbound and Infinite Tic-Tac-Toe static assets and templates are unchanged versus integration's main parent. Integration adds CMD City routing/catalog/landing content and includes city tests while retaining the other game test globs. No unresolved conflict markers or substantive conflict defect was found in inspected integration files. `git diff --check` reports trailing whitespace in captured failure logs; this is not a runtime defect.

## Findings, in priority order

1. **High / existing release gate: dense performance still fails.** `after-dense.json` reports p95 **33.673944 ms**, target **20 ms**, `targetMet: false`, versus 42.038 ms before. The improvement is useful but not acceptance. Dense population falls from 43,200 to zero; that workload is not viable-city evidence. Sustained p95 is 20.745 ms and the single same-host before/after runs do not prove device responsiveness. Next action: retain the exact target and obtain a justified correction plus repeatable workload/browser timing before release.
2. **Blocking certification prerequisite: frozen rubric unavailable.** Recover the authoritative frozen rubric and apply its required evidence and caps before any formal acceptance. Do not present these provisional scores as a passed TODD gate.
3. **Medium / evidence gap: targeted UI passes do not cover full stable-release operation.** Current evidence exercises focused tower/inspector behavior at 360, 390, 768 and 1440 pixels, all with 1000-pixel viewport height in Chromium. This does not establish short-height/landscape CMD City operation, physical touch hardware, other browser engines, assistive-technology operation, full progression, exhaustive lifecycle/recovery behavior or deployed-host CSP/network behavior. The integration run does cover specific CMD City lifecycle, denied-storage, recovery and whole-page automated accessibility cases at 360 and 1440 pixels, detailed below. Prior-round limitations remain where this round did not test them. The inspector height assertion uses a fixed 802-pixel bound; use a viewport-relative assertion when adding short-height coverage.

No new critical/high code regression was reproduced in the two focused optimizations or UI edits during this bounded review. This is not proof of absence elsewhere.

## Source reasoning and independent checks

The revised `nearest` first chooses the lowest discovery rank among already discovered destinations, then scans only newly appended BFS queue entries. Existing adjacency order, predecessor assignment and discovery rank establish the same tie selection as the former repeated goal scan. Starting the cursor at the previous tail is safe because existing discoveries have already been checked. The 512-root bound and topology invalidation for road closure/fire are retained. The goal array contract remains unchanged.

Moving JSON journaling below `monthNeedsDraft` leaves private simulation and budget validation ahead of `Object.assign`. Draft failure does not mutate the source. The in-place path still records its journal before setting the mutation flag and retains rollback. The new performance test's JSON interception measures removal of the redundant source serialization; existing size-budget and service tests independently exercise atomic rejection boundaries.

UI inspection confirms replacement toggle IDs preserve focused controls through refresh, with summary fallback when no enabled replacement survives. Household disclosure changes only on a coordinate change, respecting a manually closed same-home inspector. The inspector has an explicit tab stop, focus-visible outline and bounded vertical overflow. These changes match their stated scope; no claim of complete nonvisual canvas parity is made.

Independent command, exit **0**:

```text
node --test tests/city/readiness-performance.test.mjs tests/city/road-network.test.mjs tests/city/size-budget.test.mjs tests/city/services.test.mjs
```

Result: **47 passed, zero failed/skipped**, retained in `independent-focused-tests.txt`. This includes single-pass destinations, cached discovery ties, shared road invalidation/cache behavior, save-budget atomicity and near-bound service drafting.

Inspected manager logs, not independently rerun: **412 game tests**, **33 application tests**, **480 complete monthly state/report comparisons**, **16 focused CMD City browser passes**, and **40 integration browser passes**, plus **2 catalog/forms browser passes**. The integration log completed during review. Its 40 passes include all eight `tests/browser/cmd-city.spec.js` cases at 360 and 1440 pixels: deliberate advance and canceled replacement; keyboard placement/inspection and text input; resize pause/resume and denied storage; responsive controls/overlays, reduced motion and whole-page axe; regional identities and shipments; emulated touch and canceled pointers; full-region export/import and corrupt-file rejection; terminal-month pause and recovery controls. These are current manager-executed checks, not merely historical evidence. Catalog evidence is in `catalog-browser.txt`. The differential covers four initial seeds over 120 months; it does not exhaust player-generated networks or actions. RED logs show the two intended performance assertions and the three UI behavioral failures; the initial missing-browser UI setup failure is correctly distinguished from a behavioral RED. Existing logs alone do not reconstruct complete historical TDD provenance.

Independently viewed actual image files with the image viewer: `browser/future-inspector-chromium-360.png`, `browser/inspector-chromium-360.png`, and `browser/inspector-chromium-1440.png`. The narrow floor crop shows readable wrapping and reachable floor controls. Full-page mobile and desktop renders show the bounded scrolled inspector and visible focus outline without apparent horizontal page overflow. The 360px full-page image is tall and scaled in the viewer; the separate floor crop supplies useful legibility detail. This is rendered evidence inspection, not an independent interactive play session. The future-inspector test includes scoped axe checking, and the integration suite additionally includes whole-page axe in its responsive/reduced-motion case. Neither automated check establishes assistive-technology usability or exhaustive accessibility across every state.

## Ten provisional equal-weight scores

Scores remain conservative (at most 84 where required evidence is incomplete), following the prior review's convention without claiming it substitutes for the unavailable rubric.

| # | Dimension borrowed from READINESS-01 | Score | Evidence and limit |
|---|---|---:|---|
| 1 | Simulation and financial correctness | 84 | 47 independent checks, 412 manager tests and seeded differential; full progression/invariant audit unverified. |
| 2 | Player understanding, feedback and complete building loop | 82 | Rendered inspector and action feedback improved; full ordinary player progression unverified. |
| 3 | Mobile layout and touch controls | 84 | Four-width focused browser evidence and inspected 360px render; short-height CMD City and physical hardware unverified. |
| 4 | Desktop/tablet controls and integration compatibility | 84 | Focus behavior, 33 application checks and 40 integration passes; other engines/live host unverified. |
| 5 | Original visual polish and legibility | 84 | Actual mobile/desktop renders and readable floor crop; not every overlay/state rendered. |
| 6 | Accessible controls and honest nonvisual limits | 82 | Focus restoration, disclosure respect, keyboard scrolling, scoped and whole-page axe; screen reader usability and exhaustive state coverage unverified. |
| 7 | Measured performance and bounded resources | 65 | Measured improvement and preserved cache bound; mandatory dense p95 fails, device/frame/memory behavior unverified. |
| 8 | Lifecycle, persistence and recovery reliability | 84 | Independent atomic-save/draft tests plus current browser resize, denied-storage, import/export, corrupt-file and terminal-month recovery checks; exhaustive lifecycle coverage unverified. |
| 9 | Privacy, security and preserved site regressions | 84 | Passing app/integration and two catalog/forms checks, plus unchanged imported assets; live-host security/network audit unverified. |
| 10 | Genuine TDD, maintainability and reproducibility | 84 | Small focused changes, actual RED/GREEN logs, independent checks and source manifest; missing rubric and broader historical evidence prevent certification. |

Mean: `(84 + 82 + 84 + 84 + 84 + 82 + 65 + 84 + 84 + 84) / 10 = 81.7`. The threshold remains 95 plus mandatory gates and no critical/high defect. Retain the candidate for development; this single bounded review concludes without an implementation/review loop or release approval.
