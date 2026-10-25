# CMD City continuation verification — CMD-03

This is development progress toward the confirmed **SimCity (2013) plus Cities of Tomorrow** comparison. It is not a completed feature equivalent, accepted release, main merge or PythonAnywhere deployment. The independent ten-criterion review and unchanged 95-point gate still apply. Passing functional regressions does not erase the failed performance/workload targets below.

## Delivered behavior

- Per-home wealth classes, conserved children/adult/senior groups, private cash and tax arrears, wages from actual routed employment, and sustained wealth transitions. Age groups do not chronologically age; named individuals, births and deaths remain absent.
- Shopping requires a staffed supplied shop, a real road route, remaining shared road capacity, available city goods and private cash. Actual purchases consume goods and money once. School/university enrollment shares finite staffed capacity; a fixed adult cohort needs twelve attended months before attainment is awarded.
- Nine Finance-gated sector/class tax rates, actual paid household taxes and separately reported private flows. Existing sector controls intentionally overwrite all three class rates. Municipal booking uses actual receipts before wealth transitions, not a later forecast.
- Fire engines, ambulances, police vehicles and garbage trucks have finite fleets, saved road positions, tasks, cargo and return trips. Actual arrivals extinguish fires, collect bins or admit cases. Treatment and custody processing require finite staffed capacity. Closed roads, closed facilities and demolition preserve material and cases.
- Actual Residents & wealth and Services & dispatch panels, household inspection, wealth overlay, real vehicle markers and deliberate case controls. Closed roads are marked and can be closed/reopened through the interface. Traffic distinguishes current commute assignment from last-booked shopping.
- City schema 3 strictly migrates complete schema 1/2 states. City actions/months and region actions/months enforce exact encoded budgets: 1 MiB per city and 3 MiB per region. A failed mutation restores the original controller state and roots; the UI routes municipal changes through `regionCityAction`.

Private wages and incoming residents' starting capital are explicit external private sources; merchant payments are an explicit private-economy sink. They are not municipal income. Full private firm payroll/balances and local freight/shop inventories remain incomplete. Case counts are not unique patient/offender histories. Vehicles move in discrete game-month steps rather than subsecond lane physics. These boundaries are documented in the module contracts and [progress assessment](PARITY_STATUS_03.md).

## Actual verification

| Check | Manager result |
|---|---|
| Deterministic games | **274 passed**, zero failed/skipped: 251 city and 23 retained Neon cases |
| Full browser regression | **176 passed**, zero failed; four Chromium widths: 360/390/768/1440 |
| Application/configuration | **33 passed**, including both new local module URLs and preserved protected/public routes |
| Orchestration / runtime transport / operations | **27 / 5 / 33 passed** |
| Synthetic research runner | All nine tasks matched: three submissions, five rejections, one no-attempt, zero indeterminate |
| Actual old-source saves | Regions generated from committed schema1 and schema2 source migrated all three cities to schema 3 while retaining every prior field except version; projects/shipments were preserved and restored copies advanced identically |
| New browser behavior | Real private ledgers/purchases, Finance class rates and bulk overwrite, actual booked receipts, case creation, saved vehicle routes/cargo, import persistence, closed-gateway reopening, panel accessibility and mobile overflow |
| Visual inspection | Actual retained Residents mobile and Dispatch desktop browser-test images inspected; no fabricated vehicle movement or screenshots |

Browser verification used repository-pinned Playwright 1.64.1/axe 4.14.0 and official Chrome for Testing 156.0.8078.47 through the existing executable override. Touch/viewport emulation is not physical-phone or multi-engine evidence. The synthetic test server and generated static preview are not production deployments.

Independent module QA earlier ran 1,200 varying months per module, with exact private-ledger/material/case identities. Optimizations then preserved exact state/reports/transactions against the previous implementation for 96 household city-months and 180 service months. Separate final independent review must identify which checks it personally executed and bind the final source candidate.

## Reproduced defects and corrections

Independent review demonstrated that an accepted disabled gateway blocked shopping while still granting commuting, wages and regional dispatch. All road graphs/cache signatures now respect enabled/fire state. Reopening restores connectivity; protected-gateway burnout preserves the protected road type. Real browser RED/GREEN confirmed the recovery control.

An accepted 1,048,506-byte city could previously accept an 80-character rename and exceed its export limit by one byte. Exact pre-transaction JSON journals and post-mutation city/region validation now reject oversized actions without changing state. Seven size-budget cases cover ASCII, control-character and emoji names, complete-region rename, shipments/contributions and monthly atomicity. The original independent probe now rejects the rename and exports the exact unchanged 1,048,506 bytes. A separate normal-action probe preserved all canonical region/city root identities.

Entity caps alone do not prove encoded save size: an independently constructed module-valid combination was 1,134,586 bytes and correctly rejected by the whole-city serializer. The service contract's earlier blanket size claim was corrected. Byte validation now protects mutation entry points rather than assuming caps make every combination fit.

## Performance and workload targets — failed

The final formatted source, including save journals, was measured on Node 24.19.0/Linux x64, AMD EPYC 9V74:

| Fixture | Actual result | Target / limitation |
|---|---|---|
| Original fully built 1,280-tile dense fixture, 120 months | Median **16.99 ms**, p95 **47.01 ms**, maximum **69.22 ms**; population 43,200→0 | Frozen p95-under-20 ms target **not met**; not sustained populated-city proof |
| Unchanged sustained-world geometry/stocks, initialized once for schema 3, 120 months | Median **19.54 ms**, p95 **40.17 ms**, maximum **79.31 ms**; population minimum **4,018/4,800 (83.7%)** | Existing at-least-90% retention criterion **failed**; script exited 1. Initial/final serialization passed |

There was no mid-run population/resource refresh, model override or weakened retention assertion. The new routed employment/shopping/service needs make the prior fixture less viable. This observation does not prove every normal city is unstable, but it does invalidate reusing CMD-02's constant 4,800-resident result as current evidence.

Profiling found repeated road BFS, eager home-to-shop paths and unnecessary copying. Bounded route caches and lazy path materialization substantially reduced those hotspots while preserving behavior. Intermediate timings are retained as diagnostics; only the final run above describes this complete source. Model CPU measurements do not establish renderer performance, physical-phone behavior or every city layout.

## Source and release boundary

Direct Codex implementation remains authorized. Independent TODD/parity sessions did not implement their own fixes. Manager edits were documentation/formatting, local-asset test coverage, precise education/waste reporting copy and the narrow regional-action UI handoff. No paid inference, new telemetry, server gameplay account service or external runtime dependency was introduced.

Selected actual logs, source inventory and browser-test images are retained under `evidence/CMD-03/`; complete development logs remain under ignored `dev_docs/evidence/CMD-03/`. Scaffold RED, corrective RED, failed benchmark targets and passing regressions are distinguished. A formatter filename error was corrected and is not behavioral TDD evidence.

The complete feature target, exact reference comparisons, the dense performance gate and the sustained fixture criterion remain unresolved. Publish only the development branch and evidence; do not claim acceptance or production release.

[Independent CMD-TODD-03 review](TODD_REVIEW_03.md) returned **REVISE, 85.1/100**. It verifies the exact local source and 44-file inventory, and records native source candidate `f13ea1b208c1747f9b64facd4094308d21006be7`, whose tree `e92bf9c214b281373343cefa7ca3ed8e7aeb63aa` exactly matches the reviewed local commit. Its independently executed 274 game, 33 application and eight focused browser checks passed. Both workload gates failed independently. The later report-only publication does not change the reviewed product source.
