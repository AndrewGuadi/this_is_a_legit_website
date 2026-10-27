# Ten-candidate readiness round

Owner request: list up to 50 candidates, execute the first five, review and edit the remainder, then continue until the list is resolved. Ten candidates selected to bound usage. Direct Codex implementation under AGENTS.md authorization. No new feature scope or relaxed release targets.

Baseline: f418e76, production source inherited from 925b577. Tests-first evidence: performance-red.txt (exit 1, two intended assertion failures), performance-green.txt (exit 0, 15 checks), routing-green.txt (exit 0, five checks). A preliminary test setup used an excessive treasury that failed before its intended assertion; corrected before implementation. UI setup failure is not a behavioral RED.

## Batch one

1. **Retained:** nearest road destinations scanned once; then only new BFS discoveries examined. Preserve discovery ties, predecessors, cache bound and closure invalidation.
2. **Retained:** serialize a rollback journal only for in-place months. Private drafts retain commit-after-validation and leave the original untouched on failure.
3. **Rejected after inspection:** save-size encoding already uses a proven UTF-16/ASCII bound and exact Unicode fallback. Serialization still enforces the exact 1 MiB budget. No safe measured replacement justified.
4. **Removed from this round after inspection:** household reports depend on live employment, coverage, utilities and mutable accounts. Simulation already omits presentation work. Broader memoization needs a separately designed dependency/validation contract.
5. **Rejected after inspection:** service coverage already caches funding, utility scales, access, activity, modules and research radius, returning owned arrays. Removing invalidation or copies would weaken correctness.

Batch review: 480 complete states and reports over four seeded 120-month runs match the pre-edit modules exactly. Dense p95 42.038 -> 33.674 ms; sustained p95 34.841 -> 20.745 ms. Single-run comparisons on the same host, not proof of physical-phone performance. Dense target remains 20 ms and fails. No fixture, stock, threshold or cache-cap changes.

## Remaining list after batch-one review

6. Preserve keyboard focus on tower toggles; reproduce and verify in a browser.
7. Keep a manually closed household inspector closed when reselecting the same home; retain useful opening on selection changes.
8. Bound long inspector height with keyboard-accessible scrolling; verify at mobile and desktop sizes.
9. Integrate current main while preserving Circuit Match, Blockbound and Infinite Tic-Tac-Toe.
10. Run regressions and one independent candidate review. No production merge/deployment without existing release gates.

## Batch two results

6. **Retained:** tower controls have stable identities and restore focus after list refresh, with a summary fallback when a control becomes disabled/unavailable.
7. **Retained:** selecting the same tile preserves the household disclosure choice. Selecting another tile still opens the applicable household report.
8. **Retained:** inspector height is bounded to 80vh with native scrolling, a keyboard focus target and visible focus outline. Browser RED measured the old long inspector at 2566px; GREEN confirms <=800px at a 1000px viewport height and keyboard scrolling. Manager visually inspected actual 1440px and 360px rendered evidence. Build palette height remains a separate layout limitation.
9. **Completed locally:** merged main 1f431877048635d953375bfe1ad928b5d1dae59a into the city candidate. Resolved seven conflicts, retaining all newer arcade games, scoped WASM CSP behavior, routes, tests and catalog. Catalog has five playable entries (CMD City explicitly alpha) and six concepts. No production/main deployment performed.
10. **Completed, release gate not passed:** 412 game tests, 33 application tests, 16 focused UI checks at 360/390/768/1440 widths, and 40 integration browser checks at 360/1440 widths passed. Tests include core city lifecycle/save/input/accessibility and Circuit Match/Blockbound/Infinite Tic-Tac-Toe. Native Chrome156 download was invalid; used actual Chromium134 headless shell from Playwright1.51.1 via PLAYWRIGHT_CHROMIUM_EXECUTABLE, while keeping repository dependency pins unchanged. Browser emulation is not physical-device evidence.

UI tests were written and produced three genuine behavioral failures before implementation (ui-red.txt); initial missing executable failure is separately saved as ui-setup-failure.txt. Commands are in test source and logs. For differential reproduction, extract static/cmd-city from f418e76 to a temporary baseline directory and run `node tests/city/readiness-differential.mjs /absolute/baseline/static/cmd-city`. Earlier snapshot is kept out of production source.

This list is now reduced to the five retained product changes, completed integration and release review. Broader household caching was removed rather than silently treated as an implemented optimization. Dense p95 remains over20ms; first-release readiness is not established. No full parity claim.

## Final disposition

All ten candidates were assessed in two batches. Five product changes retained; three speculative optimizations removed from this round; main integration completed; final review completed. Catalog/form navigation adds two passing browser checks, for **58 total current browser checks**. Independent review reran **47 focused model checks** and verified 65 source/test hashes. Provisional assessment **81.7/100, REVISE**, with formal certification blocked by the absent frozen rubric; this is not a 95-point release approval. No new critical/high regression was reproduced in the reviewed changes. The existing dense performance gate still fails.

Reviewed product candidate: 2a50622116df1a546fd02f38544927acfd297f4e. Subsequent additions are reports/logs only. Native GitHub publication may use different commit metadata but must match the complete local tree. The merge retains main as a parent. Production branch and PythonAnywhere remain unchanged. Next engineering work is still a separately measured simulation optimization, not another cache-size experiment or a weaker target.

Browser invocation: `PATH=/tmp/cmd-readiness-venv/bin:$PATH PLAYWRIGHT_CHROMIUM_EXECUTABLE=/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell npx playwright test ...`. Commands used the focused readiness/future specs at all four configured widths, core CMD City and the three imported game specs at360/1440, and the catalog/forms test at360/1440. Model/app commands: `npm run test:game` and `/tmp/cmd-readiness-venv/bin/python -m unittest -q`, both exit0. Existing historical screenshot files overwritten by a test were restored; new images are saved under READINESS-02/browser.
