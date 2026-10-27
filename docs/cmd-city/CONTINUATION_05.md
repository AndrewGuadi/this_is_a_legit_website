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

## CMD-05 integration continuation

Published intermediate checkpoint `a0ab98882cdafedc5f904dc2636cbca4f46f52ea` has exact local source tree `3ad1c6cbbc014af4f3bd9f0dfbbbaf3c7aa7c598`; PR6 remains draft. Main implementation checkout is `/tmp/cmd-city-work`. Reconciled future source is local `6a5c8c3e70787a5a1a9cf318af48577894c2206d` in `/tmp/cmd05-reconcile`; evidence checkpoint `a836e38` follows it. Manager game regression passed385/385. Frozen isolated future source passed96 city browser checks across360/390/768/1440;360 full-state/report month comparisons preserve results after routing reconciliation. These are intermediate evidence, not final release approval.

A bounded Wasm BFS experiment passed behavioral and fallback checks but failed to improve whole-game performance. Production kernel/CSP/dependency edits are being reverted; experiment evidence remains. The under20ms p95 target remains unmet. Next optimization uses immutable owned report snapshots, retaining fresh public validation, mutation invalidation and exact rollback budgets.

Current isolated work: commerce schema5 integration at `/tmp/cmd05-commerce-integration`; tower keyboard focus/layout correction then aerial services at `/tmp/cmd06-aerial`; performance at main; independent TODD review of future/schema/UI. Fourth narrow implementation worker added for online foundation in `/tmp/cmd06-online` after remeasuring9 CPUs/affinity9, load1.28 and8.93GiB available memory. This worker owns new backend/adaptor/tests only, with no shared model/UI edits before a contract handoff. Sequential quiet performance measurement remains mandatory; no recursive delegation.

Online foundation must use original identity and explicit region authorization, authoritative model actions, bounded storage, conflict/idempotency rules and permission-filtered activity. It must preserve form/admin privacy boundaries. A fixed Node subprocess adapter can reuse the actual JavaScript model, but PythonAnywhere Node availability/configuration remains unverified and must be checked before deployment readiness. No game accounts, database migration or production configuration have been created on the deployed site.
