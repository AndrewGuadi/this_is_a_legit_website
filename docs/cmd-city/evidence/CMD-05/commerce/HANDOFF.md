# Standalone commerce/freight foundation handoff — CMD-05

Direct Codex worker `/root/cmd04_population`. Owned only commerce.mjs, commerce.test.mjs, COMMERCE_CONTRACT.md and this evidence directory. No core, household, save, region, UI or content edits for this task. This standalone module is not yet integrated into the game.

## Verified behavior

Actual staffed industrial output enters producer-owned stock. Existing warehouse stock remains central and is not duplicated by creation/migration. Up to32physical freight journeys, payload100 and16road-edges/month, dispatch from actual producers or the regional gateway, consume finite shared road capacity and unload only upon actual shop arrival. Retail unloading and receiving stock are bounded by actual staffed throughput. Tower retail is supported by the agreed `retailCapacityByTile` monthly throughput metric.

Local purchases consume delivered shop inventory once, preserving original money ownership for integration. Warehouse inflows/outflows book only actual bounded quantities. Cargo and on-site stock survive road closures, demolition, recalls and a full warehouse; returns use actual routes, with explicit loose recovered goods when warehouse capacity is full. Vehicles return physically before their source slot becomes available again. Deterministic monthly shop rotation avoids fixed first-shop admission. Complete material identity is checked, alongside clocks, IDs, path/cursor relationships and numeric bounds. Monthly work is detached and committed atomically after validation.

## Actual tests

`final-tests.txt`: **26passed**, zero failed/skipped, after formatting. Tests include96successive months with32shops and full conservation each month, actual32vehicle cap, finite partial arrivals, mixed road capacities, stock/counter bounds, defensive reports, strict malformed saves/observations, idempotent hooks and tower throughput. These are standalone synthetic Node checks, not integrated browser or full-game claims.

- `initial-stub.txt` and `initial-red.txt`: real expected behavior failures against explicit unimplemented hook scaffolding, then18initialGREEN cases (`first-green-attempt.txt`).
- `road-under-truck-red.txt`: a recalled vehicle on a demolished road incorrectly replanned from a neighboring frontage and failed candidate validation. Fix retains its exact position/cargo with an empty waiting route until repair. `road-under-truck-green.txt` passes22cases.
- `repair-expectation-diagnostic.txt`: corrected test assumption, not an implementation failure: restored roads legitimately allowed a new outbound shipment in the same month, so warehouse goods count need not return to100. The repaired-vehicle proof now checks returned cargo and completed original ID plus exact total conservation.
- `mixed-capacity-red.txt`: using minimum endpoint capacity minus maximum unrelated endpoint load blocked a valid mixed road/avenue crossing. `mixed-capacity-green.txt` applies each endpoint's actual remaining room and passes23cases.

API/state/month-order and mandatory integration changes are documented in COMMERCE_CONTRACT.md. Production and household consumption must never run both old global-stock and new local-stock paths. Every goods trade/regional/project mutation needs the warehouse hook, and every tile destruction needs preservation before replacement. New city schema and old-save migration require explicit integration tests.

Normal producer-to-export-depot cargo is still outside this foundation; existing goods exports may use central warehouse goods only. No payroll closure, named drivers, continuous timetables, full freight reference equivalence, deployment or integration readiness is claimed by these module checks.
