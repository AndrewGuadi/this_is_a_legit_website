# CMD City continuation — CMD-04

Baseline: `c935bc91988f4882dfce8b858d265dbb6d7a2f5c`, draft PR #6. Its native Production readiness run 22 completed successfully. The full SimCity (2013) plus Cities of Tomorrow comparison and unchanged ten-criterion, 95-point release gate remain in force. CMD-03 scored 85.1, REVISE.

Direct Codex implementation remains explicitly authorized. Two implementation workers own disjoint paths: core performance/commuting and public-service fleet allocation. A separate TODD session reviews without product edits. No paid inference service or production data is used.

## Diagnosed behavior

- Fixed home iteration permanently gives earlier homes priority over scarce reachable jobs/road capacity. In the unchanged sustained fixture, 34 later homes lose their adults after receiving no employment, wages or shopping. Total employment remains 2,318. This is distinct from a general shortage of jobs and cannot be corrected by inventing employment or refreshing population.
- Already allocated idle emergency vehicles can fill all 64 fleet slots and permanently exclude a new staffed garbage provider. The correction reserves every active trip/cargo, then distributes remaining idle/new slots across eligible providers before retaining old idle vehicles. More than 64 providers still exceed the global limit.
- Repeated routing-input string construction and repeated service radius propagation allocate unnecessary work. Primitive snapshots and an external bounded coverage cache preserve state and report behavior, with defensive copies and explicit invalidation tests.

## Evidence boundaries

Fresh runtime: Node 24.22.1 on Intel Xeon Platinum 8573C, Python 3.12.14. This differs from CMD-03's Node/EPYC host; cross-host timing is not a controlled comparison. The initial Playwright download was invalid; actual official Chrome for Testing 156.0.8078.47 was obtained and the existing executable override used. Harness setup succeeded with eight focused browser checks; final validation follows source freeze.

The pure cache refactor's same-host dense comparison measured median 29.98→32.39 ms and p95 79.66→59.42 ms. The p95 target remains under 20 ms. Both the worse median and failed threshold are retained, not replaced by a generic performance claim. These intermediate results do not certify later behavioral edits.

Workload geometry, initial resources, population and thresholds are unchanged. No mid-run replenishment or population override is permitted. Full feature equivalence, renderer/device performance and online systems remain incomplete. Publishing a development branch is not release acceptance or PythonAnywhere deployment.
