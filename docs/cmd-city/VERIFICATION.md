# CMD City candidate verification

This is a playable development candidate, **not a feature-equivalent SimCity release**. No production deployment or main-branch merge is established by this record. The working comparison is SimCity (2013) plus Cities of Tomorrow; the edition assumption and detailed reference-game observations remain open.

## Actual implementation

- Original 40 × 32 seeded city map, roads/avenues/bridges, three zoning sectors, density capacity, occupancy, demand and worker/job assignment.
- Road-car capacity and actual commuter route assignment; connected rail paths/stations and finite bus-exchange passenger assignment. Individual vehicle queues, timetables and freeform roads remain incomplete.
- Finite utility/fuel/water capacity, public-service coverage/funding, local pollution, persistent sewage/waste backlogs, landfill storage, industrial production, finite extraction, manufacturing inputs, imports/exports and a monthly integer-currency ledger.
- Bonds, deficits and decommissioning, research with real effects, original construction art, inspectors/overlays, emergency scenarios and bounded history.
- Three independently simulated on-device cities, transactional next-month shipments, one freight charge, shared receiving capacity reservations, and a material-funded solar project providing a fixed 200 power capacity units per city.
- Keyboard/pointer controls, touch emulation, pause/speed/lifecycle handling, opt-in local region saving, export/import, malformed-save rejection and graceful supported-limit recovery.

The detailed [progress ledger](PARITY_STATUS.md) assesses 78 initial targets: 15 narrow authored scenarios implemented, 42 partial, 21 missing, and **zero reference-equivalence verifications**. These are not a percentage of parity. Major incomplete areas include household wealth/cohorts, service dispatch, transport breadth, government progression, full mixed-use/future systems and authoritative online play.

## Executed checks

| Check | Result / evidence |
|---|---|
| Current city model, transit, region, save and clock checks | 83 passed; `evidence/city-model-tests.txt` |
| Both games' deterministic tests | 106 passed; 83 city checks plus 23 existing Neon Breaker checks |
| Flask application/configuration checks | 33 passed; includes city routes/assets/catalog/sitemap, existing forms/authentication/CSRF/privacy/deletion behavior |
| Offline orchestration checks | 27 passed |
| Runtime transport unit checks | 5 passed |
| Operations/recovery unit checks | 33 passed |
| Expanded city browser checks | 32 passed on 360/390/768/1440 CSS-pixel Chromium viewports; includes actual touch emulation, pointer cancellation, axe, storage denial, regional shipments, export/import and terminal-month recovery |
| Full site browser regression | 144 passed, including the final expanded city cases; `evidence/browser-tests.txt` |
| Actual browser interaction | Independent reviewer exercised simulation progression, pause/restart cancel, and a confirmed 10-goods shipment with exact 20-unit freight and next-month delivery |
| Visual evidence | Actual desktop CUA capture in `evidence/`; responsive browser renders inspected, with mobile screenshot retained when available |

The normal browser download failed in this environment. Automated checks used the existing Google Chrome for Testing **156.0.8078.47**, explicitly supplied through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Playwright package version remains pinned by the existing lockfile. Emulation does not establish physical-phone performance or Safari/Firefox compatibility. Static managed preview pages were rendered from the real Flask templates; route/CSP/server checks used the actual Flask test server.

## Performance

`node tests/city/benchmark.mjs` creates a fully developed 1,280-tile synthetic map, initially 43,200 residents, and advances 120 months. On Node 24.19.0/Linux x64 with an AMD EPYC 9V74 CPU, the retained manager run measured approximately **4.58 ms median, 18.44 ms p95**, maximum 35.69 ms. Independent rerun measured approximately 4.63/18.47 ms median/p95. This met the frozen 20 ms p95 target in those runs.

Population fell to 1,556 under congestion/shortages. This is an initially dense stress scenario, **not sustained 43,200-person or physical-mobile evidence**. Do not extrapolate these numbers to every device. Road connectivity and path/order caches are external to saved state, invalidated by road topology or job-position changes, and bounded per city; history/events remain capped.

## Provenance and corrections

Implementation used direct Codex, explicitly authorized by Andrew: root model/integration work, a separate interface worker, transit worker and regional worker. Independent planning/parity inspection and TODD sessions did not implement their own fixes. No OpenCode inference or paid model API was used for gameplay or implementation. `AGENTS.md` records the authorization extension.

Actual behavioral RED/GREEN executions were retained. Representative excerpts are in `evidence/tdd-excerpts.txt`; complete local development logs are under ignored `dev_docs/evidence/CMD-01`. The initial missing-module run and unavailable-browser run were setup failures, not behavioral RED. Some later regression checks were added to preserve already corrected behavior; no historical browser RED is fabricated for them.

Independent probes caused corrections for inherited-object tool names, shared fuel claims, facility utilities, unstaffed production, capped inventory/extraction, disabled recycling, failed-action RNG mutation, visitor-ledger consistency, ineffective upgrades, fire-recovery accounting, treasury-limit rollback and inspector accuracy. Touch testing found scroll anchoring moving the map under repeated taps; the workspace now prevents that anchoring.

## Release state and remaining limits

The source manifest in `evidence/source-manifest.json` binds the relevant implementation/tests/configuration. Independent final review must name the exact candidate commit and this inventory. Any relevant code change requires affected evidence to be renewed.

The required feature-equivalence acceptance is incomplete; a polished alpha and passing tests cannot replace the missing systems or reference comparisons. The normal ≥95 independent release gate is retained, and no acceptance score is invented here. Docker isolation/production-image checks were not executed locally because the required Docker runtime is unavailable. PythonAnywhere deployment account/path/credentials and a live deployed revision must be verified before any future publication claim.
