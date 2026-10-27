# CMD-03 finite road services contract

Direct Codex worker; no full SimCity equivalence claim. This module owns deterministic service tasks, road vehicle positions, finite collection/treatment and case backlogs. It imports no core model.

## API and integration order

- `createServices(city,{month=city.month}={})` returns version1 service state with `lastMonth=month-1`, `nextId`, full-length integer arrays `waste`, `patients`, `crimes`, `beds`, `custody`; scalar `looseWaste`; bounded `vehicles`, `tasks`; and cumulative `counters`.
- `serviceNeedsDraft(city)` is a pure rare-boundary flag. Before any environment/fuel mutations, core uses a whole-month draft when IDs have fewer than256 spare values, cumulative counters fewer than3,000,000 spare units, or local queues fewer than10,000 spare units. Ordinary states do not need this extra draft. A service overflow then rejects the entire month without retaining earlier subsystem changes.
- `validateServices(value,city,{stable=true}={})` returns true or throws. Stable saves require lastMonth=city.month-1; in-transaction validation also permits city.month. Strict fields, IDs/references, adjacent saved paths, quantities, and material/case conservation are checked. Broken/removed roads are permitted in saved paths so a blocked convoy can be restored and rerouted, rather than losing its cargo during import.
- `serviceReport(city,metrics)` is pure: fleet, actual vehicle positions, tasks/counters, uncollected/carried/stored/processed waste, pending patients/cases, beds/custody occupancy, health/crime penalties and conservation totals. Missing service state is treated as a read-only prospective legacy migration, never assigned by a report.
- `advanceServices(city,metrics)` runs **once at START of the current city month, before core fire decay**. It generates new bins from opening occupancy, treats previously admitted patients/custody cases, synchronizes finite fleets, queues/dispatches tasks, moves vehicles, handles arrivals and returns. It sets lastMonth=current month; core increments month afterward. Duplicate calls are inert. It returns serviceReport plus changed.
- `serviceAction(city,{type:'serviceIncident',kind:'medical'|'crime',x,y,amount})` adds 1–100 deliberate case units at a valid map tile. No RNG is used. Small deterministic exposure/high-pressure case generation is described below; no arbitrary identity cohorts are implied. Invalid actions are inert.
- `preserveDemolition(city,index)` transfers stored waste into a persistent local bin and admitted patients/custody back to local queues before the core clears/replaces a facility. It clears stored/beds/custody itself, making repeated preservation inert. Vehicles and carried cargo survive removal of the home facility and seek another compatible operational destination.

Core must REMOVE the former aggregate garbage processor and radius-based fire extinguishing. It retains actual fire damage/decay AFTER service arrivals, so an arriving fire vehicle can extinguish a fire before that month's damage. No served quantity is credited merely because a coverage radius overlaps a building. Existing sewage processing is separate and unchanged. `city.backlogs.waste` becomes a bounded compatibility summary of bins+loose+cargo; the service fields are authoritative.

## Saved entities and bounds

Vehicle: `{id,kind,home,position,status,path,cursor,payload,capacity,taskId,destination}`. Kinds fire/medical/police/garbage. Status idle/outbound/returning; a busy vehicle with an empty route is waiting. Full orthogonal road routes may use up to the complete map size. A maximum of 64 vehicles and 128 tasks bounds entity counts without truncating a long map route. Counts alone do not guarantee a complete city fits the 1 MiB file budget: independent probes found a larger module-valid combination. Core/region mutation entry points must enforce the exact encoded city/region budgets transactionally and preserve the source state when an action does not fit. `nextId` allocates globally unique positive numeric IDs across both entity collections.

Task: `{id,kind,target,status,vehicleId}`. Status queued/outbound/returning/completed. Completed records are bounded history; completion increments a counter once and releases its vehicle. An active task and its vehicle reference each other. One active task per kind/target prevents duplicate pickups.

Counters: `generatedWaste`, `legacyWaste`, `initialStoredWaste`, `collectedWaste`, `processedWaste`, `recoveredOre`, `completedTrips`, `treatedPatients`, `resolvedCrimes`, `extinguishedFires`, `createdPatients`, `createdCrimes`, `naturalPatients`, `naturalCrimes`. Per-tile/scalar quantities are finite nonnegative safe integers bounded by1e12; cumulative counters by1e15; IDs by1e12; per-action incidents by100. New save state adds around five fixed numeric tile arrays plus bounded routes/entities. Existing landfill stock is recorded as a baseline, never copied into new bins.

## Dispatch and movement

A service facility needs actual road/operation access, positive filled jobs, supplied power/water and positive funding. Root adds actual service jobs: fire, police, clinic, hospital, landfill and recycling. Fleet size depends on modules, funding and filled jobs. Idle excess/closed-facility vehicles may retire; busy vehicles and cargo never silently disappear. Providers receive fleet slots round-robin under the global cap.

Vehicles follow contiguous current road/avenue/bridge paths. Movement budgets are8 road edges per month for emergency/medical/police vehicles and32 for garbage tours, each is reduced by the load/capacity ratio of crossed roads. Removed road tiles invalidate/reroute the journey; a vehicle on a removed road waits at its saved position. A closed destination receives nothing. Return cargo can reroute to another compatible operational provider. Radius is not used as a teleport shortcut.

Garbage trucks can collect additional unreserved adjacent bins while physically traversing their route; they cannot touch a bin reserved by another active truck. Pickup transfers bin→cargo. Returning at an actual landfill transfers cargo→finite stored quantity. Returning at a recycling facility transfers accepted cargo→processed sink and bounded ore output (one ore per10 waste units; nonrecoverable residue is included in the explicitly counted processing sink). Stock/output capacity is reserved at delivery. An unsuccessful return retains cargo. Overflowing/unreachable bins remain in place.

Medical pickup transfers local cases→ambulance cargo. Arrival admits only available bed capacity; treatment of existing beds occurs in later service ticks with finite staffed throughput. Police pickup similarly transfers cases→patrol cargo→finite custody; later processing closes custody cases. These are counted service cases, not full patient/offender life histories. A delivery cannot cure or resolve cases before the actual return arrival and subsequent treatment.

## Conservation and legacy migration

Waste generated + legacy uncollected waste + initial stored stock equals current bins + loose waste + carried cargo + actual stored stock + processed waste. Landfill delivery is storage, not a second processed sink. Patient cases created equal local waiting cases + ambulance cargo + admitted beds + treated cases; crime cases likewise reconcile local queues + patrol cargo + custody + resolved cases.

On migration only, old `city.backlogs.waste` is allocated across occupied lots once, proportionally and deterministically. With no occupied lots it becomes `looseWaste` collected at the gateway. Existing landfill stored values remain in place. Demolition preservation is required for stock conservation, including before destructive disaster replacement where applicable.

## Limits

Deliberate case incidents are supported. Bounded natural medical cases are also generated at occupied homes exposed to delivered-water contamination above20/100 or local air above40/100. Crime cases are generated only with crime pressure at least60/100 and unemployment at least20%. A deterministic `(month+tileIndex)%12` cadence and household-size caps avoid RNG consumption and unbounded spontaneous queues. Cumulative natural counts are explicit; these are still simplified case indicators, not a life-cohort/hazard-calibration model. Road assignment is discrete monthly service movement, not subsecond vehicle physics. No physical medical or law-enforcement accuracy is asserted. A64-vehicle cap, bounded task queue, original balancing and simplified treatment/processing remain explicit scope limits. This module's counters are not certification of reference-game parity.

## Ephemeral routing memo — CMD-03 performance revision

Each `advanceServices` call creates a private road mask and bounded lazy BFS frontiers. A frontier is indexed by its current vehicle start and continues only far enough to answer requested target frontages. The FIFO neighbor order and first-discovery tie order match fresh breadth-first search. Each returned route is reconstructed into a new array, so changing a saved vehicle path or a report cannot poison another query.

No route memo is saved or retained across service ticks. Road demolition, closures and repairs between ticks necessarily create a fresh context. If arrival at a burning road clears its fire during the same tick, the road mask and frontiers are invalidated immediately. Facility selection, available destination capacity, case quantities and congestion budgets remain live rules outside the memo.

The live cache has at most min(128,map tile count) start entries. Each entry uses an Int32 packed predecessor/discovery-rank table and a Uint16 FIFO queue of at most the map size. At1280 tiles the maximum typed-array storage is983,040 bytes, excluding ordinary Map/adjacency/object overhead. FIFO eviction affects performance only; a later query reconstructs the same route from the unchanged road mask.

The dense43200-starting-resident benchmark still ends with zero residents and is a comparable stress scenario, not sustained-population proof. Its measured p95 improves with this change but the overall20ms target remains unmet; profile evidence identifies household routing and allocation as the larger remaining bottleneck. The separate sustained scenario must be measured on the integrated candidate before making any maintained-load claim.
