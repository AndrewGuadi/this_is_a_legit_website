# CMD-03 reference checks

Target remains the confirmed **SimCity (2013) + Cities of Tomorrow**. Read alongside `PARITY_TARGET.md`, `PARITY_STATUS_02.md` and `REFERENCE_INVENTORY.md`. This is reference/specification work for the household and routed-service batch, not a candidate assessment. No parity status changes or equivalence certification are made here.

## What primary documentation supports

All anchors refer to [EA's official PC manual](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf); printed and PDF pages differ.

| Topic | Supported reference fact | Anchor |
|---|---|---|
| Class/taxation | Overall taxation progresses to sector control, then three wealth classes through Finance. Wealth also changes tax sensitivity. | [Printed 20](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=11) |
| Work/shopping | Employment funds consumption; industry supplies shops; unmet needs can drive departures. | [Printed 11–13](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=6) |
| Response | Roads affect emergency access. Fire garages, ambulances/waiting rooms and patrol lots expand particular service capabilities. | [Printed 21–23](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=11) |
| Health/crime | Reports distinguish sickness, injuries, deaths, crimes, criminals and arrests. | [Printed 22–23](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=12) |
| Learning | Enrollment/capacity, schools/college, transport and education-dependent advanced industry are distinct. | [Printed 23–24](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=12) |
| Waste | Collection vehicles and disposal/recovery capacity matter. | [Printed 18](https://eaassets-a.akamaihd.net/eahelp/manuals/simcity-manuals_PC.pdf#page=10) |

The manual does not specify exact wages, household size, cohort ages, class transitions, vehicle speeds, dispatch algorithms, treatment durations or all fleet capacities. Define original rules explicitly; do not label chosen constants reference tuning.

## Original acceptance recipes

These are proposed tests, not statements about undocumented original algorithms.

| IDs | Recipe |
|---|---|
| 006 | Reclassify an occupied home after sustained qualifying conditions. Residents and total savings must reconcile before/after; a class change cannot invent people or multiply balances. Test deterioration too. |
| 008–009 | Give two homes finite money and one shop limited stock. Reserve purchases across both callers; only reachable, paid, delivered units satisfy consumption. Exhaust goods, funds and shop capacity independently. |
| 009 | Trace producer stock → transfer reservation → shop stock → consumed goods. No unit may occupy two stages, disappear on retry or be deducted twice. A citywide stock abstraction must be disclosed. |
| 007, 016–017 | Close a workplace and compare earned wages, household spending and booked taxes. State the wage source and transaction sinks. Private cash, business revenue and public treasury are different ledgers; book each tax once. |
| 010, 019 | Sustain unemployment, unmet purchases or service failure; verify specific complaints and gradual departure. Restore access and verify recovery. Removing residents must reconcile cohort counts and money rather than leaving ghost wallets. |
| 016 | Before Finance, reject class-rate changes without mutation. After the required entitlement, vary one sector/class rate and reconcile that class's booked receipts. Test save/reload and permission loss policy. |
| 034, 040–041 | Dispatch against two incidents with one available engine. Block a shared road, close the source and saturate destination capacity. Arrival and completion must be separate; no immediate radius extinguishing or duplicate assignment. |
| 035, 040 | Reconcile waiting cases + onboard cases + admitted cases + resolved cases + explicit losses. Sever the return route or close the receiving clinic after pickup. Define holding/rerouting/recovery; deleting a vehicle cannot silently delete patients. |
| 036 | Keep prevention, active cases, arrests and custody distinct. Reserve custody capacity before committing transport; test a full station, interrupted journey and repeated completion. Case counts are not automatically unique offenders. |
| 029–030, 040 | Reconcile uncollected waste + vehicle cargo + stored/processed output + explicit disposal. Close or fill the destination after pickup; cargo must remain tracked. Recovery must not erase contamination already produced. |
| 037–038 | Allocate finite learner places globally. Disconnect a school and distinguish eligible, enrolled, attending and attained counts. Repeated reports must not teach; completion advances only under the defined attendance rule. |
| 039, 041 | If shopping or parks generate trips, assign a real destination and shared network capacity. A coverage bonus or animated car is not a completed visit. |

## Boundary and integration warnings

Home-level cohorts are not named individual people, complete families, birth/death histories or reference agent identity/following. Likewise, routed service vehicles can transport aggregate cases without establishing individual patient/offender simulation. Label those levels accurately.

Freeze monthly ordering across growth, employment, private income, purchases, incidents, movement, treatment, tax booking and migration. Preserve accepted reservations when facilities or roads change. Invalid actions and repeated same-month updates must be inert; save/load must preserve pending trips, cargo, cases and eligibility. Legacy migration must not fabricate historical wages, education or completed service.

The next integrated candidate still needs independent behavior/UI evidence and reference comparison. Full household-agent parity, exact class rules and complete service catalogs remain unverified.
