# CMD City civic progression contract — CMD-02

This original subsystem advances toward the confirmed SimCity (2013) + Cities of Tomorrow feature target. It does not establish complete parity. Population thresholds, money, deadlines and rewards below are original game balancing, not claims about EA's exact numbers.

## Model boundary

- `createCivic({sandbox=false,month=0}={})` returns fresh civic state. Migration passes the existing city month, preventing historical quest credit.
- `civicReport(city,metrics)` is read-only and returns `{eligible,government,departments,requests,tutorial,achievements}`.
- `civicAction(city,action,metrics)` returns `{ok,message}`; every rejected action preserves the complete city. Call with authoritative model metrics, never visitor-supplied assertions. Actions are `redeemBond:{index}`, `department:{department}`, `request:{id,operation:'accept'|'reject'|'cancel'|'claim'}`, `tutorial:{operation:'check'|'replay'|'dismiss'|'resume'}`. Prototype/inherited action and catalog names are rejected. Catalog IDs and persisted department/achievement IDs must be primitive strings: arrays, boxed strings and objects are never coerced into property names.
- `advanceCivic(city,metrics)` runs after one city month and its ledger/history row. It advances progress but never changes cash/history. A repeated call for the same month does not duplicate progress. Skipped months are rejected rather than inventing past observations.
- `buildPermission(city,tool,metrics?)` returns `{ok,message}` for NEW construction only. No existing building is disabled or invalidated by missing departments; old saves retain their actual advanced facilities, while new additions must satisfy new rules. Sandbox bypasses these construction restrictions.
- `validateCivic(value,cityMonth,sandbox)` returns `true` or throws. Strict keys, enums, bounded numbers, timestamps, progression consistency and eligibility are checked. Civic `lastMonth` is the current city month in a completed save; one previous month is accepted only for the transient before-`advanceCivic` integration state. Root save integration may require exact equality when persisting.
- Exports `DEPARTMENTS`, `REQUESTS`, `ACHIEVEMENTS`, `TUTORIAL_STEPS` supply immutable original definitions for UI labels.

No DOM, network, browser storage, clock or independent randomness is used. Save integration owns adding `city.civic` and migrating old files. The module does not import `core.mjs`, avoiding an integration cycle.

## State

`{version:1,eligible,peakPopulation,tier,lastMonth,departments:[],requests:{housing,balancedBooks,publicHealth,researchDrive,cleanServices},tutorial:{step,completed,dismissed,replays},achievements:[]}`.

Each request has `{status,acceptedMonth,deadlineMonth,completedMonth,claimedMonth,progress}`. Status is offered/active/completed/claimed/rejected/cancelled/expired. Rejected, cancelled and expired requests cannot be reaccepted. Progress is bounded by that request's target. Rewards are paid once only by an explicit successful claim and rejected before mutation if the cash limit would be exceeded.

## Government

Town Hall opening requires a regional gateway road, positive connected power and water supply meeting occupied/facility demand, and a site connected to that gateway (the site check belongs to construction integration). It never requires an already-operating Town Hall. Department installation does require an open, non-burning gateway-connected Town Hall and at least 90% actual power/water service.

Peak population determines government tier and slots: tier 1 at 0 / 1 slot; tier 2 at 500 / 2 slots; tier 3 at 1,500 / 3 slots; tier 4 at 5,000 / 4 slots; tier 5 at 15,000 / 6 slots. Falling population does not revoke a purchased department or attained tier. Extra Town Halls do not duplicate department slots.

| Department | Minimum peak population | One-time minor-unit cost | New construction permission |
|---|---:|---:|---|
| Utilities | 0 | 200000 | Water filter |
| Safety | 0 | 200000 | Hospital |
| Finance | 500 | 250000 | Early redemption of an existing bond's remaining balance |
| Education | 500 | 250000 | University; Civic Research Institute |
| Transportation | 1500 | 350000 | Air terminal |
| Tourism | 1500 | 350000 | Entertainment district |

Finance enables `redeemBond` only with an operating Town Hall and enough treasury to pay the selected obligation's entire remaining balance. A successful action removes that bond exactly once, charges cash once and preserves all past operating ledger/history. It is original early-redemption balancing, not a claim about an exact reference-game repayment feature.

Nuclear construction additionally needs both Utilities and Education and a 5,000 peak population. Existing research requirements remain enforced separately by core integration.

## Requests, tutorial and achievements

Five finite requests measure actual population, consecutive positive booked months, consecutive healthy-city observations, current accumulated research points, and sustained complete utility service. Accept records a fixed deadline. Goal completion at the deadline is valid; an unmet goal then expires. No progression/reward can be duplicated by calling a render/report function.

The eight-step replayable tutorial checks actual road access, housing, utilities, work, services, a booked month, operating balance and an operating Town Hall. `tutorial/check` advances at most one currently satisfied step; monthly observation does the same. Dismiss/resume preserve progress. Replay is explicit and carries no money/repeated achievement reward.

Seven finite badges award no money: first population milestone, a positive operating year, educated city, transit use at scale, completed regional power support, metropolitan population, and completed research. Sandbox creation is permanently ineligible, even if a later import or rule change turns `city.sandbox` off. A normal city moved into sandbox must be marked ineligible and clear badges through an explicit conversion/migration; the validator rejects inconsistent eligibility instead of laundering it.

## Report fields

`government:{tier,label,peakPopulation,population,slots,slotsRemaining,townHallReady,townHallReason,nextPopulation}`.

`departments:[{id,label,cost,threshold,installed,available,reason}]`.

`requests:[{id,title,description,status,progress,target,reward,deadlineMonth,remainingMonths,canAccept,canClaim,reason}]`.

`tutorial:{step,completed,dismissed,replays,title,instruction,progress,target}`.

`achievements:[{id,title,description,earned,eligible}]`.

All cost/reward values are integer minor currency units; divide by 100 for display. Report arrays follow definition order and never mutate the model.
