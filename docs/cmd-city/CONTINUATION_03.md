# CMD City continuation — CMD-03

Andrew requested continued implementation toward the confirmed SimCity (2013) plus Cities of Tomorrow feature-equivalence target. Direct Codex implementation and separate independent TODD review remain authorized. The prior 85.6 review and 95-point release gate remain historical/current requirements respectively; no milestone is a completed equivalent merely because tests pass.

Baseline: `5cebb4748ec1ad1c69c79aef924b46238f02fe6b`, branch `october2026/cmd-city-plan`, initially clean. Native GitHub Production readiness run20 completed successfully. A fresh baseline run passed 180 deterministic game checks. PythonAnywhere remains the hosting target; this continuation creates no new telemetry, accounts, production records or paid API dependency.

## Work ownership

| Task | Direct Codex owner | Files / outcome | State |
|---|---|---|---|
| CMD-03-HOUSEHOLDS | `/root/city_region` | New household module/tests/contract: conserved demographic groups, private budgets, wealth transitions, finite reachable shopping/enrollment and class taxation | HANDOFF_READY |
| CMD-03-SERVICES | `/root/city_transport` | New services module/tests/contract: finite road-routed fire, health, police and waste vehicles with persistent tasks/cargo | HANDOFF_READY |
| CMD-03-REFERENCE | `/root/parity_research` | Primary-reference checks and honest acceptance boundaries | HANDOFF_READY |
| CMD-03-INTEGRATE | `/root/city_design_review` | Core/content and strict schema migration; actual booked private taxes, waste/case conservation and bounded route caches | HANDOFF_READY |
| CMD-03-UI | `/root/city_interface` | Meaningful household/service reports, controls and vehicle rendering with actual browser tests | HANDOFF_READY |
| CMD-03-TODD | Separate `/root/todd_city` | Candidate-bound ten-criterion independent review | QUEUED |

Initial implementation concurrency is two, with disjoint ownership. Actual tests-first snapshots and logs remain under ignored `dev_docs/evidence/CMD-03/`; selected evidence will be published with the candidate. Worker platform is direct Codex, not an unexecuted OpenCode inference claim. The manager owns documentation, scope/contract decisions, narrow integration corrections and publishing; implementation workers own substantive product changes.

After the initial standalone suites passed, brief disjoint correction/integration concurrency up to three was authorized for persisted shopping traffic and measured route-performance work. No paid model API was introduced. Household state now persists full actual shopping loads; reports and duplicate hooks return defensive copies. The two panels passed 12 browser cases at four widths, including real private-ledger/class-tax and case/vehicle persistence checks. No full-candidate certification is inferred from these focused results.

## State and ordering contract

Freeze APIs in HOUSEHOLDS_CONTRACT.md and SERVICES_CONTRACT.md before integrating shared files. Households must reconcile against actual tile population without creating or destroying people. Private wage sources, purchases, tax payments, arrears and departures must be explicit; a forecast is not booked municipal money. Household processing happens after growth and before finance, marking the upcoming booked month; after the normal city month increment its marker equals city.month.

Service processing happens at the start of the current city month, before ordinary fire decay. Completed saves retain its marker at city.month-1, like the environment module. Vehicle arrival, finite fleet/bed/custody/storage capacity and actual cargo delivery replace applicable radius/aggregate effects. Previously generated bins, cargo and patients cannot vanish when roads or facilities close. Old aggregate garbage processing must not run in parallel with actual deliveries.

New state requires a strict new city schema and complete validation/migration of old schema 1/2 first. Migration preserves public cash, RNG, inventory, history, existing environmental/civic state and regional reservations. It creates no retrospective wages, education, service completions or awards. Supported file-size/population/currency bounds, CSP, privacy, opt-in local storage and all other arcade/form/admin behavior remain enforced.

## Scope limits

Household groups are not named individual citizens. Shared finite enrollment is not a full age/education lifecycle unless that lifecycle is actually implemented. Routed case counts are not unique patient/offender histories. Original balancing is distinct from reference numerical tuning. Full freight/business logistics, road geometry, transport inventory, future-city economies and online authority remain separate gaps until code and comparison evidence close them.

## Manager verification and unresolved gates

Final formatted functional source passed 274 game checks (251 city), 176 full browser checks, 33 application, 27 orchestration, five runtime and 33 operations checks; the synthetic research runner matched all nine issued tasks. Actual schema 1/2 regions migrated preserving prior fields, projects and shipments. Independent closed-road and accepted-save rename defects were reproduced, corrected and rechecked. The UI now uses the guarded regionCityAction entry point. Manager reporting-copy changes distinguish educated adults and actual pending waste from radius coverage/capacity forecasts.

Final dense performance: median 16.99 ms, p95 47.01 ms; target 20 ms NOT met. Sustained fixture: 4,800→minimum 4,018 (83.7%), below 90% retention; its script exited 1. No target was weakened and no in-run population/resource refresh occurred. Full feature-equivalence and source-bound independent acceptance remain incomplete. No merge or deployment is claimed.
