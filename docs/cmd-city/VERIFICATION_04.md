# CMD City CMD-04 verification

This continuation fixes permanent service-fleet admission starvation and permanent map-index preference in commuting. It remains an original development candidate toward the full SimCity (2013) plus Cities of Tomorrow target. No completed equivalence or production deployment is claimed.

## Behavior

Existing active service journeys retain their vehicles, task links and cargo. Remaining fleet slots are distributed across eligible providers before old idle vehicles are retained. A new staffed landfill can receive trucks even when an older idle clinic fleet filled the cap. There are still only 64 vehicles; more eligible providers cannot all be guaranteed immediate service.

Commuting starts with a different eligible household each month (`month % eligibleHomes.length`). Each household keeps the existing nearest-job and real road/transit-capacity rules. This removes permanent first-map-position priority without inventing jobs or wages. It is rotating priority, not equal instantaneous allocation; changing eligibility and long lists can still produce unequal waiting periods. City month already persists, so no new schema is needed.

Primitive routing snapshots replace repeated large string signatures. A per-city service-coverage cache invalidates on actual relevant inputs; returned arrays are defensive copies. An isolated pure-refactor comparison matched full states/reports for 240 city-months. That exact-match claim applies before the subsequent intentional commuting change.

## Verification and limits

Manager: 280 game tests pass (257 city + 23 Neon), no failures/skips; 33 application tests pass. The new behavioral tests captured real RED before implementation for fleet admission and recurring employment starvation. Cache tests verify invalidation and report mutation isolation. The final full Chromium browser run passed all 176 checks at 360/390/768/1440 widths, no failures/skips (5.9 minutes). The independent review is recorded with the report publication.

Worker sequential final measurements on Node 24.22.1 / Intel Xeon Platinum 8573C:

| Unchanged workload | Result | Gate |
|---|---|---|
| Dense 1,280-tile / 120-month | Median 24.64 ms, p95 66.08 ms; 43,200→0 population | Under-20 ms p95 FAIL |
| Sustained / 120-month | Median 27.40 ms, p95 45.49 ms; minimum 4,385 / 4,800 residents (91.35%) | At least 90% retention PASS; initial/final saves valid |

The sustained world's geometry, initial resources, thresholds and monthly progression remain unchanged. No mid-run refresh or population override was used. Passing this fixture does not guarantee stability in every city, equality of employment, browser render speed or physical-phone performance. The host differs from CMD-03; only the intermediate same-host pure-refactor comparison supports before/after timing analysis, and it showed a worse median despite a better p95.

The 78-scenario feature ledger remains 32 narrow implemented, 33 partial, 13 missing; zero literal reference-equivalence verifications. These fixes do not promote unrelated features. Full scope and reference comparisons remain unfinished, as does the dense performance requirement. The independent 95-point release gate remains unchanged.

Evidence: `evidence/CMD-04/`, including worker provenance, actual RED/GREEN logs, diagnosis, intermediate/final benchmark records and a complete 46-file source inventory. Benchmark script output paths still use their existing CMD-03 scratch location; copied CMD-04 results identify the actual new source hashes.

[Independent CMD-TODD-04 review](TODD_REVIEW_04.md): **REVISE, 85.5/100**. All 46 source hashes match. Independent 280 game, 33 application and eight focused browser checks pass; retention reproduced at 91.35%, dense p95 68.38 ms still fails. Native Production readiness run 25 passed on source `93432d1bec84f40d6eb44f4fcbab5c8e10dcdca2`. No main merge or deployment; full feature equivalence remains incomplete.
