# CMD City persistent environment — CMD-02 contract

Direct Codex implementation, independent review required. This extends the original monthly model; it is not a calibrated environmental forecast or complete SimCity parity.

## Frozen APIs

- `createEnvironment(width=40,height=32)` returns `{air,ground,radiation,wind:'E',lastMonth:-1}`. Arrays have exactly width×height integer entries in 0–1000. Wind is N/E/S/W. `lastMonth` records the city month already processed.
- `validateEnvironment(value,width=40,height=32,cityMonth=1000000)` returns true or throws Error. Reject unknown/missing keys, invalid dimensions/entries/wind/lastMonth, and lastMonth beyond cityMonth. It never repairs or mutates a candidate.
- `environmentReport(city,metrics)` is read-only. It reports `air`, `ground`, `radiation` arrays on the display scale 0–100; `restricted` booleans; `blockers` arrays of strings; `sources` with source indices, type, air and ground emission units; `emissions:{air,ground}` and `emissionBasis:'opening-month activity forecast'`; `pumpWeightedRawContamination`, `deliveredWaterContamination`, `waterFilterCapacity`, `filteredWater`, `deliveredWater`, `residentAirExposure`, `residentRadiationExposure`, and `healthPenalty`. Display-scale quantities are bounded, numeric indicators. It does not call core `measure` and cannot recurse into it.
- `advanceEnvironment(city,metrics)` updates city.environment once at START of a city month, using the supplied pre-month raw access/jobs/fuel/utility metrics. Calling it again for the same city.month is inert. It returns an environment report plus `changed` and `massBalance` describing this update. No city RNG, cash, inventory or groundwater quantity mutation occurs.
- `environmentAction(city,{type:'radiation',x,y})` requires an actual nuclear facility. It contaminates a finite radius and ruins/disables that plant, preventing repeated incidents at an empty tile. `environmentAction(city,{type:'wind',direction:'N'|'E'|'S'|'W'})` changes the direction used by actual air advection. Successful actions return `{ok:true,message}`; rejected actions return `{ok:false,message}` without any state change.

## Integration order

Core creates `city.environment=createEnvironment(40,32)`. Schema2 saves must validate it. To migrate a legacy schema1 city, add zero arrays and set lastMonth=city.month-1, then use the normal validator. Global `city.groundwater` remains the existing quantity model; local water *quality* derives from persistent ground/radiation near active pumps. Spatial aquifer quantity/recharge is not implemented by this module.

At START of simulateMonth, call advanceEnvironment(city,rawMetrics), then use environmentReport in measure for air/ground/radiation overlays, water contamination and health/desirability/growth effects. Reports use only provided raw utility/job data; never call measure inside this module. Caller prevents building/occupancy growth on report.restricted tiles (radiation≥200/1000), but can permit infrastructure/cleanup as an explicit policy. Existing occupants may remain exposed until caller applies health/relocation rules. Core should append selected-tile report.blockers to the inspector.

## Source and treatment rules

Operating industrial/factory/extraction emission forecasts require gateway access, enabled/non-burning tiles, supplied power/water and actually filled jobs in the provided opening-month metrics. A single shadow inventory reserves all input stocks and output headroom in stable tile-index order, including ore reserved by `metrics.nuclearFuelUsed` before factory use. Factories cannot each claim the same ore/oil, mines cannot each claim the same storage headroom, and industrial lots cannot each claim the same goods headroom. Earlier factory consumption may free storage for a later mine. Neither reports nor environmental advancement mutate the real inventory, deposits or fuel. Thermal emissions use shared reserved fuelUsed/eligible plant fuel demand rather than inventing unlimited combustion.

This is an **opening-month activity forecast**, used by the persistent environment update at the start of the month. It is not a claim to reproduce exact post-growth booked production, whose workers, supplied demand and inputs can subsequently change in core. Environmental state applies the provided forecast once per month; trade and other later core transactions are outside that opening forecast. Stored landfill waste can continue leaching even when the facility is closed; disabling it does not erase physical waste. Sewage/waste service deficits contaminate occupied connected lots. Sources add finite integer game pollution units. Wind moves air to orthogonal neighbors; emissions, decay, deposition and boundary outflow are explicitly accounted. Ground and radiation persist after demolition and decay slowly under documented game rules.

Nuclear power generation/fuel reservation is owned by core (finite ore consumption); environment does not generate power or consume nuclear fuel. A deliberate nuclear incident is an original scenario, not a reproduction of any particular physical reactor process.

Connected, supplied, staffed `waterFilter` facilities treat actual delivered volume. Default base throughput500 units/month, scaled by modules and filled jobs/8; 90% removal applies only to the filtered share. No delivered water means no fabricated clean-water supply. Pump-contamination aggregation is weighted by active pump capacity, not number of pumps.

Connected, supplied, staffed `cleanup` facilities perform finite monthly work, never an instant reset. Required core content definitions: 8 jobs for each filter/cleanup, positive construction cost and monthly upkeep. Each cleanup facility removes at most80 ground units and20 radiation units across a Manhattan radius3 (modules add capacity/radius). Core's ordinary finance charges the facility upkeep, even if financed by a deficit. The module does not silently make an extra treasury deduction or claim unpaid work generates money. Calling advanceEnvironment twice cannot repeat cleanup in a month.

## Boundaries

Air is deterministic finite-cell advection, not fluid dynamics. Ground is persistent local contamination, not a soil/chemistry model. Radiation is a persistent restricted-land/health indicator with finite remediation. Water filtering is throughput-weighted city delivery, not a pipe-routing/hydraulic model. These limitations remain explicit in the parity ledger until those additional behaviors exist.
