# CMD City deployment-readiness continuation — CMD-05

Andrew's current instruction is to keep working until deployment-ready. The confirmed comparison remains SimCity (2013) plus Cities of Tomorrow, with original code/assets/balancing and comparable observable capabilities. The ten equal-weight review criteria, 95-point gate, current performance target and existing regression requirements remain unchanged. A partial milestone or passing CI alone is not release acceptance.

Baseline: `3c33c764a7548d81aa84988688caabeabe47d545` on `october2026/cmd-city-plan`. Its native Production readiness run 26 passed. Prior independent CMD-TODD-04: 85.5, REVISE; retained population 91.35% passes, dense p95 68.38 ms fails under-20 ms. Repository initially clean.

Direct Codex implementation remains explicitly authorized. Two initial implementation workers own performance and transit; a separate reviewer owns reference/readiness assessment, not product code. A third worker owns a standalone future-city module after measured capacity: nine logical/affinity CPUs, load averages 0.62/0.36/0.48 and roughly 9 GB available memory. Timed benchmarks must run sequentially without other worker test/browser activity.

## Ownership

- Performance: households/services/save/region and performance evidence. Core temporarily assigned to transit integration, then returned for measured optimization. Preserve validation, transactional save limits, deterministic behavior and exact before/after comparisons for pure refactors.
- Transit: transit/content/view/game/template and temporarily core transit integration; new connected streetcar, ferry and researched maglev capabilities. Genuine behavioral RED/GREEN, actual browser evidence and strict save continuation. No other performance-owned modules.
- Future: only new future module/tests/contract at first. Mixed-use tower and corporate dependencies must be integrated and validated before any feature claim. Shared schema/core/UI integration requires an explicit ownership handoff.
- TODD: independent primary-reference audit, implementation checks and source-bound final review. Correct unsupported assumptions about hidden original-engine models; retain observable documented capabilities and independently verify comparisons honestly.

## Operational readiness boundary

The existing Flask/PythonAnywhere hosting target is retained. No domain-specific PythonAnywhere account/path/virtualenv/static configuration or authorized deployment token was available in this runtime or recovered context. Readiness work continues in source; this is not a reason to weaken code/review requirements or claim production verification. Never print credentials, infer account from public reachability, or copy unrelated deployment secrets. The eventual deployed revision and real route/assets must be verified before a deployment claim.

## Evidence

Worker/manager evidence will be retained under `docs/cmd-city/evidence/CMD-05/`, with current source hashes, real test results and explicit failed/unverified items. Unchanged historical evidence is identified as historical, not silently presented as current. Primary-document capabilities can support documented comparison; licensed-game execution is not claimed unless actually observed.
