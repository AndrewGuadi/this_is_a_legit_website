# CMD City — CMD-02 parity progress snapshot

Historical CMD-02 assessment. See [CMD-03 progress](PARITY_STATUS_03.md) for the subsequent implementation; the original assessment below remains intact for provenance.

## Scope and conclusion

The user has confirmed **SimCity (2013) plus Cities of Tomorrow**. Edition uncertainty is resolved. The exact reference building/module/research inventory and reference-game comparisons remain incomplete; see `REFERENCE_INVENTORY.md`.

This is an independently authored **implementation-progress ledger**, not TODD release acceptance, a deployment report or literal-equivalence certification. It assesses the frozen CMD-02 civic/environment integration and UI against the narrow authored scenarios in `PARITY_TARGET.md`, retaining the previous `PARITY_STATUS.md` assessments unless a change is identified below.

**Updated totals: 23 IMPLEMENTED, 40 PARTIAL, 15 MISSING; 78 IDs accounted for. EQUIVALENCE VERIFIED: 0.** Eight narrow scenarios advance, while major simulation, transport, expansion and online gaps remain. These counts are not a completion percentage: one small authored scenario and a whole missing regional economy do not have comparable scope.

Here, IMPLEMENTED means the authored scenario has working original behavior supported by source and appropriate tests. It does not mean the entire reference feature, original numeric rules, every variant or all interdependencies are equivalent. PARTIAL means useful behavior exists but material required capability remains. MISSING means no implementation of the essential target was found.

## Evidence actually inspected and executed

Inspected current `civic.mjs`, `environment.mjs`, their strict contracts, core/content/region/save integration, relevant management/overlay UI, and civic/environment/progression tests. Git HEAD during inspection was the prior review commit `61bbe2df9acf6a6ae3620038212f8bf4841fec50`; **the uncommitted CMD-02 source is identified by the hashes below, not that older commit**. After the model run, a template-only change was detected and the current complete template was reread; all model and model-test hashes remained unchanged. The manager identified the change as adding `role="group"` to the labeled bond-obligations container and reported four focused accessibility checks passing afterward. That semantic fix does not change these feature assessments; no full browser result was transferred across it. The manager can bind this snapshot to its subsequent candidate commit.

Independent command executed from the repository:

```text
node --test tests/game/*.test.mjs tests/city/*.test.mjs
```

Actual result: **180 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; exit 0; approximately 2.06 seconds.** This combined run covers the 157 city-model checks and 23 existing game checks. It is an authored-behavior regression run, not a licensed-reference comparison. No browser or physical-device run was independently executed by this ledger's author.

The UI worker reported 16 passing CMD-02 progression browser checks. The manager's broader 160-check browser run was still running when this assessment was commissioned. Those are separately attributed run states; this document does not assume the full browser run passed. Full application/operations regressions and independent release review remain separate evidence.

## Eight status changes

| ID | Target | Previous → current | Verified original behavior | Remaining reference breadth |
|---|---|---|---|---|
| 015 | Government unlocks | MISSING → IMPLEMENTED | An operating Town Hall, persistent peak-population tiers, bounded department slots and six distinct departments govern new advanced construction. Existing migrated facilities remain valid; rejected purchases are transactional. | Original tier thresholds/permissions differ; no complete government-building/module graph, regional department benefits or class-tax progression. A Finance bond option is not wealth-class taxation. |
| 020 | Requests | MISSING → IMPLEMENTED | Five finite requests have accept/reject/cancel/expire/complete/claim states. Actual booked months or authoritative metrics drive progress; an explicit claim pays once and cannot rewrite operating history. | Authored objectives/deadlines/rewards differ. The full reference request inventory, map thought/request bubbles and its active-request rules are not reproduced or compared. |
| 021 | Tutorial | PARTIAL → IMPLEMENTED | Eight tracked steps examine actual road, zoning, utility, job, service, booked-balance and hall state. Check advances one satisfied step; dismiss/resume/replay retain the city and create no replay cash. | This is an original state-based tutorial, not the exact reference opening scenario, scripting or presentation. An existing starter condition may satisfy a step without repeating construction. |
| 027 | Contamination | MISSING → IMPLEMENTED | Persistent local ground/radiation affects operating pumps. Capacity-weighted delivered quality, finite staffed filter throughput and a bounded health penalty are connected. Filtering treats only actual delivered volume and creates no water. | Water quantity is still one citywide reservoir; quality is a weighted city delivery model, not individual pipe routing, hydraulic pressure or an illness/patient lifecycle. |
| 031 | Air pollution | PARTIAL → IMPLEMENTED | Persistent finite-cell air contamination moves with selectable cardinal wind; the update records bounded emissions, decay, deposition and boundary outflow. Exposure affects health/land value and survives render calls. | Emissions are explicitly **opening-month activity forecasts**, not exact later post-growth production or calibrated chemistry. No reference weather/dispersion tuning is verified. |
| 032 | Ground pollution | MISSING → IMPLEMENTED | Ground fields persist after emitter removal, decay slowly and support finite local cleanup. Stored landfill waste may continue leaching after closure. Inspection/overlays expose the state. | Soil/groundwater chemistry, physical units and reference decay/transport rules remain unverified. A bounded game field is not a real environmental prediction. |
| 033 | Radiation | MISSING → IMPLEMENTED | A deliberate incident requires an actual nuclear facility, ruins its source, creates persistent contamination and restricts normal construction/growth/operation. Recovery access and staffed finite cleanup remain possible; demolition does not erase contamination. | Original scenario/fuel/decay rules differ; the full reference nuclear failure model, automatic trigger conditions and long-term recovery behavior have not been compared. |
| 076 | Achievements | MISSING → IMPLEMENTED | Seven finite noncash badges depend on actual civic observations; repeated months/replays cannot award duplicates. Sandbox history permanently prevents badge eligibility, with strict persisted-state validation. | This is a small original badge catalog, not all reference profile achievements, unlocks, challenges or online eligibility systems. |

Relevant executable evidence includes the 24 civic tests, 20 environment tests and 27 core/progression integration tests, together with retained core/transit/region/save checks. Counts alone do not establish each reference feature's breadth; the table's behavior claims come from the inspected implementations and their named tests.

## Changed behavior that remains partial, or retains its former status

| ID(s) | Current status retained | CMD-02 effect and unresolved boundary |
|---|---|---|
| 005 — Density | PARTIAL | Radiation now blocks affected development. Density remains a paid manual capacity upgrade; no road/wealth/service-driven automatic reference redevelopment lifecycle. |
| 016 — Taxes | PARTIAL | Departments are real, but `tax` still accepts R/C/I rates directly. There are no three wealth classes or Town Hall→City Hall→Finance tax-granularity transitions. |
| 018 — Bonds | IMPLEMENTED | Finance and an operating hall now permit explicit early redemption of the selected remaining obligation. The payment is charged once, the debt is removed and past history stays unchanged. This extends original financing behavior, not a verified reference financing catalog. |
| 022 — Sandbox | PARTIAL | Higher funds, government-permission bypass and persistent badge ineligibility are real. It does not supply all reference sandbox toggles/unlocks; research and other normal rules are not universally bypassed. |
| 023–025 — Power/fuel/clean generation | IMPLEMENTED / PARTIAL / IMPLEMENTED | A new finite-fuel nuclear option reserves shared ore before factories; supply and module scaling are real. Distribution/fuel remain city aggregates rather than plant-local logistics or the full generation catalog. |
| 026 — Water table | PARTIAL | Ground/radiation now affect pump **quality**. Available water **quantity** remains finite citywide stock; there is no spatial aquifer or recharge. Quality must not be counted as completing hydrology. |
| 028–030 — Sewage/waste/recycling | PARTIAL | Unserved sewage/waste and stored landfill material can now contaminate ground persistently. Collection and treatment remain aggregate; no per-building waste routes, full recovered-material catalog or wastewater hydraulics. |
| 034–038 — Civic services/technology | PARTIAL | Exposure affects aggregate health; hazardous lots stop ordinary facilities/jobs. Departments gate selected advanced buildings/research institutions. No actual patient/student/offender cohorts, emergency dispatch or industrial skill/technology lifecycle was added. |
| 055 — Multiple cities | IMPLEMENTED | All three cities retain independent civic/environment state and migrate old saves through the region parser. This does not add arbitrary region-map selection or multiplayer. |
| 056 — Regional exchange | PARTIAL | Hazardous trade endpoints cannot create new shipments/contributions; previously accepted cargo still arrives once under existing reservations. Actual conserved resources exist, but utility/service contracts and cross-city travelers remain absent. |
| 058 — Shared projects | IMPLEMENTED | Existing one-project conservation/once-only benefit behavior is retained, now with hazard-aware contribution eligibility. The reference project variety is still missing. |
| 059 — Disasters | PARTIAL | Radiation adds another meaningful stateful event alongside the prior four original scenarios. This is not the complete reference disaster inventory or exact event behavior. |
| 060 — Data views | PARTIAL | Added air/ground/radiation overlays, quality/filtration reports, civic progress and selected-site restrictions. The complete reference reports and individual-agent inspection are absent. |
| 062 — Save/resume | IMPLEMENTED | City schema 2 persists civic/environment state with exact subsystem month markers. Fully validated schema-1 cities migrate without cash, inventory, RNG, tile, history or research changes; each city in an old region migrates independently. No historical requests/badges are fabricated. |
| 065–067 — Future research/resource/drone systems | PARTIAL | New civic prerequisites and nuclear/cleanup/filter behavior add meaningful infrastructure options. The four-topic research catalog is still original; mixed-use towers, exact expansion dependency resources and routed drones remain incomplete. |

The table above identifies related effects without promoting them merely because a new menu, department or overlay exists. Unmentioned baseline rows retain the prior assessment exactly. In particular, there is still no wealth-cohort system, streetcars/ferries, regional commute assignment, functional tower-floor economy, corporate franchising, future transport, robot event or online authority.

## Complete status index

This index retains all 78 original IDs. It makes the arithmetic auditable without rewriting unchanged explanations from `PARITY_STATUS.md`.

| Status | Count | IDs |
|---|---:|---|
| IMPLEMENTED | 23 | 001, 002, 004, 007, 012, 014, 015, 017, 018, 020, 021, 023, 025, 027, 031, 032, 033, 047, 055, 058, 061, 062, 076 |
| PARTIAL | 40 | 003, 005, 008, 009, 010, 011, 013, 016, 019, 022, 024, 026, 028, 029, 030, 034, 035, 036, 037, 038, 039, 041, 042, 044, 046, 048, 049, 050, 051, 052, 054, 056, 059, 060, 063, 065, 066, 067, 077, 078 |
| MISSING | 15 | 006, 040, 043, 045, 053, 057, 064, 068, 069, 070, 071, 072, 073, 074, 075 |
| EQUIVALENCE VERIFIED | 0 | None |

## Source identity

These are SHA-256 hashes actually computed during this inspection. The ordered manifest consists of all `static/cmd-city/*.mjs`, `static/cmd-city/game.css`, `templates/cmd_city.html` and all `tests/city/*.test.mjs`, sorted lexically by path. Encoding one line per file as `HASH`, two spaces, `PATH`, newline produces manifest digest **`8992854e13928825630ded34e823b92800627fd7479e880c08a47431dd8c00f3`**. Evidence remains bound to this source snapshot; later changes require affected reassessment.

| File | SHA-256 |
|---|---|
| `static/cmd-city/civic.mjs` | `81f6c9e2f43b5e9b2cf9e4c2b1711095ab2e5d0757f262ef11c8b5407f0e23cb` |
| `static/cmd-city/clock.mjs` | `753fa07ceb01228eb63fe7d8f0727db79801df99663bf990aa4a7300f09fbedb` |
| `static/cmd-city/content.mjs` | `228014e2e03f3c151449418fff06a729fcc8560c075acd23a4bdcf0a1c45c799` |
| `static/cmd-city/core.mjs` | `f69197b8280c1edd0b63beb43ac54564bfefe933aaf31e9a5e62b9b8d98b8683` |
| `static/cmd-city/environment.mjs` | `a07db7c66e37cfea86500b9ea5d0574ea86593ced61f03e9f614b4639eddb602` |
| `static/cmd-city/game.css` | `755d4695b5ea6ac1bf2c916d5c23718353f025d5d95a45189348625a0466bfac` |
| `static/cmd-city/game.mjs` | `0eb6d6747fd27467448c1dd6b1fb4859f4bdf2b1fa0e95636795e21e30a0c4b5` |
| `static/cmd-city/region.mjs` | `4348562da580a1db3925fd442537a50347b61444001d17f34649e0511f8fe880` |
| `static/cmd-city/save.mjs` | `0bc358c2f6997435d5d46538a27c6f63e0c72b0aa9cd4787134b980f72bfe792` |
| `static/cmd-city/transit.mjs` | `2eb3ed830385c6adfbcad04b10b7ddb071fb691cee16dc3ffaf8346b069e2bf9` |
| `static/cmd-city/view.mjs` | `20b65244dd0905cec23dc2318bf51c6dbb87590a61318417552ce3c5bb101e35` |
| `templates/cmd_city.html` | `f9931d10571915e6373b445b7e583bd38b0ffb20f5e68554ab45e6a8b1dc9292` |
| `tests/city/civic.test.mjs` | `aecbe98cbc77add34013c6ee1ebd4320392c8a7a4a1082119ddc33d32ac088e2` |
| `tests/city/core.test.mjs` | `b424df787daab756c26db2a11f0218269dd92e81eca3d92567022ffd94862448` |
| `tests/city/environment.test.mjs` | `ac74ea295294e5b46dfa7ca49b4526a0deaf508c5c936de8e97602810cdaa9a1` |
| `tests/city/progression.test.mjs` | `a44088a841e89337be3dd445bbf997d14176b6b05b9dfa83c1ee11753a815a40` |
| `tests/city/region.test.mjs` | `acc4f0400eeaa5ff7287f8c56141803e40564639d7ea1217555ed4efe16e9577` |
| `tests/city/save-clock.test.mjs` | `cfd4690f9f8ac4d1b3d3d57147addd90ec1c06f98bd7e6232b267e8cef8087d3` |
| `tests/city/transit.test.mjs` | `45999422c286ecb9262dba147e9079b04073bc479cad08550a636e5941295fa7` |

## Next foundations, in dependency order

1. **Finish reference observation, with the edition now fixed.** Capture exact road/building/module/research inventories and comparative scenarios. Documentation breadth gaps remain even though the user selected the edition.
2. **People, class and business lifecycle.** Wealth/age/skill cohorts, household budgets/consumption, per-business inventories, demand and automatic redevelopment are prerequisites for class taxes, richer education/health and faithful tower economies.
3. **Movement and service operations.** Add explicit route/time/queue state, freight and emergency dispatch, then complete transit modes and cross-city movement. A radius bonus or decorative vehicle cannot close these gaps.
4. **Spatial quantity and finer environment coupling.** Add local aquifer quantity/recharge and any required source-to-consumer routing. Align emission accounting with whichever production interval the model actually defines; retain the current forecast label until that changes.
5. **Complete progression and expansion graphs.** Reference department effects, tax tiers, tower floors/interdependence, corporate chains, control resources, drones and future transport need actual stateful mechanics and compared scenarios.
6. **Original online authority.** Multiplayer, roles/invitations, moderated communication, synchronized saves and conserved markets require a separate authenticated authoritative backend. No such service was added in CMD-02.

CMD-02 materially improves government, tracked progression and persistent environmental consequences. It remains a development milestone toward the requested equivalence; this ledger grants neither release approval nor a parity claim.

## Manager verification after this independent assessment

The final full browser rerun passed all 160 cases after the one-attribute bond accessibility correction. The 37-file manager inventory is at `evidence/CMD-02/source-manifest.json`, with sorted files-mapping SHA-256 `2cd0c51308dc19d1c8ca693bfeb7c9ead5ccf9684ff12d6200dd70aaa46efa64`. This later result does not change which checks the independent assessor personally executed or its zero-equivalence conclusion.

Published source binding: remote candidate `0eb19f8f89ba03459f3c41172e7c53fa7316746a`, full tree `28c71bceb31e31a0bcec3332d54b1b73cdb89290`, matches the inspected source. Independent CMD-TODD-02 remains REVISE at 85.6/100; later report-only documentation does not alter those source hashes.
