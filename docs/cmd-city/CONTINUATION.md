# CMD City continuation — CMD-02

The owner confirmed SimCity (2013) plus Cities of Tomorrow on October 25, 2026 and requested continued implementation. Direct Codex authorization and independent TODD review remain in effect. The feature-equivalence target and 95-point release gate are unchanged. The prior playable candidate is not a completed equivalent.

Baseline: `61bbe2df9acf6a6ae3620038212f8bf4841fec50`, branch `october2026/cmd-city-plan`; initially clean and synchronized with origin. No credentials, paid model service, production records or new hosting account are required for this implementation batch. Existing PythonAnywhere hosting remains the target.

## Work contracts

| Task | Owner | Scope | Status |
|---|---|---|---|
| CMD-02-CIVIC | Direct Codex `/root/city_region` | Government departments and permission progression, requests, tracked tutorial, sandbox-aware achievements; standalone module and tests | HANDOFF_READY |
| CMD-02-ENV | Direct Codex `/root/city_transport` | Persistent transported air pollution, ground contamination, contaminated pumping/filtering, radiation and bounded cleanup; standalone module and tests | HANDOFF_READY |
| CMD-02-REFERENCE | `/root/parity_research` | Primary-reference catalog and acceptance gaps | HANDOFF_READY |
| CMD-02-INTEGRATE | Assigned after contracts stabilize | Core, content and strict backward-compatible persistence integration | HANDOFF_READY |
| CMD-02-UI | Assigned after contracts stabilize | Reachable management controls, overlays, explanations and real browser tests | HANDOFF_READY |
| CMD-02-TODD | Independent `/root/todd_city` | Candidate-bound independent regressions and ten-criterion review | REVIEW |

Implementers own disjoint files. Initial implementation concurrency is two. After the standalone suites passed (37 cases, subsecond execution), two independent review findings justified briefly allowing three disjoint corrective/integration workers: civic strict identifier validation, environmental stock reservations, and core/save integration. No external model calls or paid service were added. UI work waits for a correction slot to finish. Manager authors documentation and narrow integration corrections only. Tests precede behavioral implementation and actual RED/GREEN logs remain under ignored `dev_docs/evidence/CMD-02/`; selected evidence will be committed after verification.

## Dependencies and preservation

Freeze module APIs in `CIVIC_CONTRACT.md` and `ENVIRONMENT_CONTRACT.md` before shared-file integration. Preserve deterministic cities/regions, integer financial accounting, transactional rejected actions, all existing saved cities, on-device privacy, strict CSP, and the other arcade/form/admin flows. Migration must create explicit new state for old saves; it must not silently accept malformed partially upgraded saves.

Original thresholds and balancing must be labeled honestly. No new feature is equivalent merely because a corresponding tool or menu exists. Spatial groundwater quantity, individual medical treatment, all-reference government/building breadth and online authority remain separate dependencies unless implemented and verified.

## Release status

Development in progress. No merge or production deployment is claimed. The historical CMD-TODD-01 score of 82.4 applies only to its frozen older candidate and cannot certify changed code. Updated evidence and review must identify the new source.

Manager verification after integration: 180 game checks, 160 full browser checks, 33 application checks, 27 orchestration checks, five runtime checks and 33 operations checks passed. Synthetic research runner matched all nine issued tasks. The full browser run first reproduced a semantic ARIA defect in the bond container; a narrow manager correction and renewed full run passed. All product source is frozen for candidate-bound independent review. See VERIFICATION_02.md and evidence/CMD-02/source-manifest.json.
