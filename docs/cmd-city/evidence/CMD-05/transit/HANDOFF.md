# CMD-05 transit handoff

Baseline: `3c33c764a7548d81aa84988688caabeabe47d545`. Direct Codex worker `/root/cmd04_population`. No commits or deployment.

## Implemented

Dedicated streetcar track/stops, local shore-to-shore ferry terminals, and research-gated maglev guideways/stations now assign actual existing commuter demand through connected networks. Streetcar/ferry/maglev shared segments and base terminals admit 160/200/600 commuters. Modules increase terminal throughput without increasing individual segment capacity. Both directions share reservations; even a single track/water tile has a finite shared budget. Assignments reduce actual car road equivalents and consume existing job/resident demand exactly once.

Terminals require road/gateway access and working city power/water. Ferries traverse connected water containing empty cells or bridges; land gaps, buildings, hazards and disabled cells block navigation. Maglev requires completed Maglev mobility research (after Transit coordination). Five-topic research saves and new infrastructure validate; unresearched maglev and track-module forgeries reject. New types are schema-3 only; complete legacy saves remain compatible. Building shore terminals inland, unresearched maglev or ineffective track module upgrades rejects without charging.

Core metrics expose streetcar/ferry/maglev passenger counters and path loads; employment caches include terrain and maglev unlock state, and return defensive arrays. Map graphics distinguish T/F/M, connected guideways, traffic loads and unavailable tracks. Actual reports say assigned commuters and state their limits.

## Evidence

- `unit-red.txt`: genuine initial missing-mode behavior failures.
- `integration-red.txt`: initial missing commuter integration/build rules/research-save limit failures. An earlier fixture setup attempt used five topics too early; that attempt was corrected before retaining this behavioral RED.
- `single-segment-red.txt`: real single-cell capacity-overbooking failure, corrected with cumulative reservations.
- `integration-green.txt`: 34 unit/integration checks pass (29 transit +5 integrated).
- `core-regression.txt`: 77 transit/integration/core checks pass.
- `browser-red.txt`: all three mode flows fail on missing assigned-commuter report fields.
- `browser-green.txt`: 12 real Chromium flows pass at360/390/768/1440. Each imports a valid unfinished network, constructs its missing terminal by keyboard, observes six actual assignments, exports/reimports with identical assignments, closes terminal tozero then reopens torestore. All five tools visible; no horizontal overflow.
- `render-green.txt`: final three1440px flows pass after adding map captures. Actual report images retained for all modes at1440 and streetcar390; actual three map images retained. Worker opened mobile streetcar, desktop ferry reports and maglev map; legible/no overlap observed.

Browser uses pinned Playwright/official Chromium and local Flask fixture. Screenshots and emulation do not establish physical-device or manual-player testing. Core/save ownership returned to performance worker after hooks/tests passed; final manager manifest/review must bind integrated source.

## Reference scope boundaries

These are local monthly commuter capacity assignments, not vehicles/timetables/completed trip counts/wait times. Streetcars use dedicated tracks rather than rail-enabled avenue lanes. Ferries do not implement regional tourist arrivals or wealth-specific traveler modes. No literal SimCity equivalence is claimed. All remaining road/gateway, shared-city and reference economy limitations stay explicit.

## Corrective review and final integration update

Independent TODD reproduced a preexisting conventional-rail single-cell overbooking case:350+350passengers used one400-capacitytracktile. `rail-corrective-red.txt` captures it; cumulative cell reservations now limit the second request to50 and report400total. `rail-corrective-green.txt`:35transit/integrationchecks pass. New modes already had equivalent single-cell protection.

Transit dashboard caption was shortened to user-facing current-assignment/capacity guidance; reference/timetable limitations remain here. Road-planner integration subsequently retained all12transitbrowserflows within `../roads/browser-regression.txt` (24combinedpasses). Final source snapshot is in `../roads/handoff-hashes.json`; final manager inventory will bind subsequent shared-file integration.
