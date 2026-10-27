# CMD-04 core performance and commuting correction

Direct Codex worker `/root/cmd04_performance`; baseline `c935bc91988f4882dfce8b858d265dbb6d7a2f5c`. Changed only `core.mjs` and two new test files. No save-schema change, journal removal, weaker byte validation, benchmark fixture change, or acceptance-target adjustment.

## Pure refactor (before fairness behavior change)

Replaced allocated routing-signature strings with an exact primitive-input snapshot. Cached computed service coverage behind exact funding, utility, research, tile type/module, activation and access inputs. Returned report arrays remain independent copies. Each live city has only one external coverage/routing snapshot; WeakMaps do not add saved data. Path capacity scanning stops at the exact zero lower bound.

`differential-probe.mjs ROOT` compares full saved states and full returned reports for 120 starter and 120 dense city-months. An isolated copy of the original committed modules and the same copy with only the pure-refactor core produced all 240 identical SHA256 results (`differential.json`). The later monthly rotation intentionally changes model behavior and is excluded from that equality claim. `pure-refactor.patch` preserves the pre-rotation refactor against the baseline; apply it to an extracted baseline to reproduce this comparison.

Controlled sequential original-versus-refactored dense timings (Node 24.22.1, Xeon Platinum 8573C): median 29.98→32.39 ms; p95 79.66→59.42 ms. Tail timing improved while median worsened. Host variation is material. Neither meets 20 ms. This machine differs from the earlier EPYC environment, so prior-turn timings are not an apples-to-apples comparison.

## Intentional commuting fairness correction

Previously the same tile-index order received scarce jobs and road capacity every month. Two equally eligible homes competing for ten jobs always favored the first home. Each month now rotates the actual eligible-home list by `month % eligibleHomes.length`. Inactive, disconnected, or workerless homes do not consume turns. Existing nearest-job ordering, utility/staffing rules, road/transit capacity and conservation remain unchanged. Month is included in routing-cache invalidation. No new save state is required.

The genuine RED test reproduced permanent preference; GREEN verifies alternating two-home priority, exact ten-job totals, per-home/job reconciliation, bounded roads, inactive-home exclusion and equality with a fresh cloned city. The initial synthetic test fixture omitted coherent month/ledger markers; those harness errors were corrected before the retained behavioral RED was captured. Pure refactor uses differential equivalence evidence; it is not falsely labeled a behavior-change RED.

Rotation does not create jobs, guarantee equal commutes, or guarantee each household's survival. With many homes, a full priority cycle can be long; disconnected homes still require infrastructure and limited job counts remain limited.

## Final integrated result

Includes the separate services worker's fleet-allocation correction. Final formatted core SHA256: `ecc7fc43b895aeebf454d1003ab975510a257ef57c0f8b23352949275501dcce`.

- Dense: median 24.64 ms, p95 66.08 ms, population 43,200→0; under-20 ms target **FAIL**.
- Sustained unchanged 120-month fixture: median 27.40 ms, p95 45.49 ms; minimum 4,385/4,800 residents (**91.35%**), at-least-90% retention **PASS**, exit 0. Initial/final serialization passed. No in-run replenishment, model override or fixture edits.
- 54 focused core, cache, commuting and size-budget cases passed after final formatting. Manager owns full integrated regressions and independent final review.

The sustained result supports this single finite synthetic city; it does not prove all cities remain viable or establish feature equivalence. Full performance and parity remain unresolved.
