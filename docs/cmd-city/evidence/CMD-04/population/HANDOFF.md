# CMD-04 service fleet correction and population diagnosis

Baseline: `c935bc91988f4882dfce8b858d265dbb6d7a2f5c`. Direct Codex implementation by `/root/cmd04_population`; no commits, deployment or paid calls.

## Corrected behavior

A newly staffed service provider previously received no vehicles forever when 64 idle vehicles already belonged to existing providers. A first test captured this real failure (`fleet-red.txt`, exit 1). Fleet quotas now reserve every active journey before distributing remaining slots round-robin across operational providers, keeping existing idle vehicles only within those quotas. Vacant quotas receive new vehicles; the 64-vehicle cap, finite provider staffing/module capacity, existing active IDs/task references and loaded cargo remain intact.

Fairness is bounded by the global cap: more than 64 operational providers cannot all receive a vehicle. Active journeys are never removed to make a new slot. Provider order remains deterministic map order; no unconditional fairness or dynamic demand-priority claim.

Two regressions cover a new landfill actually collecting/returning waste after an idle clinic pool fills the cap, and slot redistribution while a blocked loaded garbage trip retains its vehicle/task IDs, backlink, payload and material identity. `fleet-green.txt`: 32 services tests pass. `module-regression.txt`: 64 services/households tests pass. No household source changes.

## Sustained population diagnosis

The unchanged fixture fails both before and after this fleet correction: 4,800 → 4,018 residents (83.7%), exit 1. It retains 191,009 units of pending waste. Node 24.22.1, Intel Xeon Platinum 8573C; timings are diagnostics from this new host and may overlap other worker activity, not direct comparisons with previous EPYC measurements.

The final state reveals exactly 34 homes with only one child each, zero adults/employment/wages/cash; the other 166 homes remain at 24 residents. Actual total employed remains 2,318 throughout. Index-ordered allocation makes the same households lose access to finite commuting capacity repeatedly, leading to unpaid taxes and no purchases. The saved diagnostic lists those exact homes. This is distinct from the corrected fleet admission bug, which does not close the population-retention gate.

Manager/core worker owns investigation of deterministic equitable commuting priority. No growth constants, wages, fixture setup, population refresh, thresholds or benchmark assertions were changed by this worker.
