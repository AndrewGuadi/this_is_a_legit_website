# CMD-02 model integration

Direct Codex implementation. These rules integrate the frozen civic and environment contracts; this is a playable progression milestone, not complete SimCity (2013) or Cities of Tomorrow equivalence.

## Public actions and metrics

`applyAction(city, {type:'environment', action:{type:'wind',direction:'N'|'E'|'S'|'W'}})` routes to the environment module. The explicit radiation scenario uses `{type:'environment',action:{type:'radiation',x,y}}` and requires an actual nuclear plant. There is no random radiation scenario or nuclear fuel creation.

Civic actions retain their contract's top-level shapes: `department`, `request`, `tutorial`, and `redeemBond`. Core supplies fresh authoritative metrics. Finance redemption is handled by `civicAction`, which requires Finance and an operating Hall; it charges the actual remaining obligation once without rewriting booked history.

`measure(city)` returns `environment` and `civic` reports. `access` and `roadAccess` describe actual gateway connectivity. `operationAccess` additionally excludes radiation-restricted lots, except roads, avenues, bridges, rail and cleanup. Utility supply, staffing, service fields, civic operation and production use this operational mask. Connectivity and hazard information are distinct in the inspector.

Environmental reports never call core measurement. Persistent air replaces the former instantaneous pollution field. Health subtracts the environment module's combined exposure penalty once; it does not retain the old additional air-pollution health term. Land value also responds to persistent ground contamination and radiation.

## Monthly ordering and resource conservation

1. Measure opening-state supply, workers and prospective fuel reservation.
2. Advance persistent environment exactly once at the START of the city month, using opening-state operational metrics. Emissions are explicitly opening-month activity forecasts, not calibrated chemistry or a claim that later changed occupancy produced precisely that quantity.
3. Deduct the actual globally reserved coal and ore before mines, factories, trade or recycling can use them. Nuclear plants reserve two ore units per operating plant/month, share shortages proportionally, and provide 2,400 base power capacity with module scaling. Nuclear output introduces no normal air-emission source.
4. Subsequent within-month measurements retain the reserved fuel's power output. The source forecast receives zero additional nuclear reservation because that ore is already deducted; it cannot subtract the same stock twice. Internal fuel counters remain outside the four displayed utility records.
5. Resolve incidents, shrink unserved/restricted occupancy, reserve shared growth capacity, perform staffed production and trade, charge upkeep/debt, and append the operating ledger row.
6. Increment the city month and advance civic progression once using that booked row. Civic ticks never award cash; a request pays only after an explicit successful claim.

Town Hall is included free at starter tile (13,15) and has ordinary monthly upkeep. Empty-city construction requires connected supplied government infrastructure. Departments restrict new advanced construction; they never retrospectively disable migrated existing facilities. `waterFilter` and `cleanup` each provide eight real job slots and positive upkeep. Cleanup remains possible on restricted land, has finite work, and cannot operate without actual workers, utilities and access.

## Saves and migration

New cities use city schema **2**, with both strict `environment` and `civic` objects. Persisted completed state requires `environment.lastMonth === city.month-1` and `civic.lastMonth === city.month`. A future, stale, malformed or partially migrated object is rejected.

Legacy city schema **1** is fully validated against its original key and tool allowlists first. Only then is it migrated by adding zero environment fields (marker month-1) and fresh civic state at the existing month. Migration preserves cash, inventory, RNG, tiles, history and research; it does not invent past civic observations or awards. A schema1 object with either new field or a new tile type is rejected rather than guessed into shape.

The regional wrapper remains schema **1**. Its existing `parseRegion` path independently migrates all three embedded city saves through `parseCity`, preserving shipments, stock, cash and RNG. Solo-to-region UI import must rebase the new companion cities' subsystem clocks to the imported city month without inventing historical progress.

Build/research/funding/policy catalog identifiers must be strings before lookup; coercible arrays or objects are rejected without any city mutation. Save research identifiers likewise require strings. Existing cash-boundary transactions remain atomic and report a treasury-limit error before civic observation.

## Tests and evidence

Baseline: the existing 83 model checks passed before integration. Actual baseline copies/hashes and RED/GREEN command logs are retained under ignored `dev_docs/evidence/CMD-02/integration/`. New integration behavior tests precede implementation; subsequent Finance/type/forecast corrections each retain an actual failing run. This does not retroactively claim TDD for inherited code.

Necessary existing-fixture changes:

- The old radial-pollution test now supplies real industrial workers and books a month before inspecting persistent pollution at the source. Adding a park still cannot erase that field.
- The focused research test explicitly enables sandbox construction so it continues testing research prerequisites, points and repeated completion; normal department construction gates are separately covered.
- The unknown city-version test now uses version3 because version2 is the implemented schema. Malformed version and field rejection remain enforced.

No browser/device acceptance, deployment, parity or independent release score is established by this model integration alone. Independent TODD and full application/browser verification remain separate.

## Final model handoff

All **157 city model tests pass** on this candidate, including legacy migration, exact subsystem clocks, cash boundaries, typed identifier rejection, finite fuel sharing, hazard-aware regional shipments/contributions, and previously accepted cargo delivery after a depot closes. The model's supported aggregate residential population is 1,000,000: save validation checks the whole city's sum, and monthly housing allocation reserves remaining global population room rather than permitting a future balance change to cross that boundary.

Routing keeps one derived employment snapshot per city in a WeakMap. The typed signature includes every routing-relevant tile field (including road class), operational access, utility ratios and transit research. The road-order signature is retained on the actual cached graph. Every returned routing array is a fresh copy. Construction definitions are individually frozen, preventing mutation of capacities behind the cache. Fresh-clone equivalence checks cover funding, toggle, module/road upgrades, road removal, ore shortage, research, occupancy, fire and radiation changes.

Measured on Node v24.19.0, Linux x64, AMD EPYC 9V74, with the existing 1,280-tile synthetic benchmark over 120 months: final median **5.87 ms**, p95 **19.80 ms**, maximum **32.78 ms**. The profile before cache corrections showed median 35.13 ms and p95 64.10 ms, dominated by repeated employment routing. The final measurement meets the local p95-under-20 ms target for this fixture; it is not browser/phone performance proof. Initial population was 43,200 and final population was 0, so this is not a sustained populated-city benchmark. Raw profiles, measurements, source hashes and command logs are retained in the ignored evidence directory.
