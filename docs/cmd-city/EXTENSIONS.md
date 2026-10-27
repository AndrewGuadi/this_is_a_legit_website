# Transport and region interfaces — candidate extension

The 78-row parity target remains authoritative. These offline systems expand the candidate; they do not establish full historical SimCity online-service parity.

## Transit module owner

Own `static/cmd-city/transit.mjs` and `tests/city/transit.test.mjs` only. Pure functions, no DOM or model mutation:

- `planTransit(state, access)` returns derived transport network with `busLoad` and `railLoad` arrays (1280 zeros), `busPassengers` and `railPassengers` counters, and whatever internal graph data it needs.
- `routeTransit(network, originTileIndex, destinationTileIndex, roadPath, requested)` reserves passengers on a connected bus or rail route, returns `{mode:'bus'|'rail'|'none', moved:integer, roadFactor:number}`. Updates only the derived network load arrays/counters. Never mutate authoritative city tiles/occupants/cash. `roadPath` contains connected road indices from home frontage to job frontage.
- Rail requires a real orthogonally connected rail path and two different road-accessible stations with rail frontage, each within six Manhattan tiles of its endpoint. Ignore disabled/fire stations. Prefer rail; shared rail edges have finite 400-passenger capacity. A track drawn without stations serves nobody. Station modules increase throughput explicitly if supported, otherwise root restricts upgrading them.
- Buses require two different active road-accessible bus exchanges within six tiles of endpoints and actual road path. Shared road edges have finite 120-passenger bus capacity. This is a demand-assigned exchange service, not a user-authored timetable or full route planner; state that limitation.
- Return `roadFactor:0` for rail, `0.05` for bus (one road-vehicle equivalent per 20 passengers), `1` for none. No claimed movement when network disconnected, empty, closed or requested count invalid. Root reserves remaining road capacity before calling and falls back to car assignments for unserved passengers.

## Region module owner

Own `static/cmd-city/region.mjs` and `tests/city/region.test.mjs` only. Import the existing city core/save. Root handles UI and persistence adapter.

- `createRegion({seed=2013}={}) -> {version:1,active:0,month:0,cities:[{id:'riverbend',state},...],shipments:[],project:{goods:0,alloy:0,complete:false},events:[]}`. Three original independently seeded starter cities. Regions remain on-device.
- `regionAction(region,action)->{ok,message}` transactional failure. `switch` uses `{type:'switch',index}`; `shipment` uses `{type:'shipment',from,to,resource,amount}` and requires working connected trade depot/port in both cities. Sender reserves actual stock immediately, pays `amount*200` minor-unit freight cost once, shipment arrives next region month. Cap shipments to20 and stock to1e6. Reserve receiver headroom across all in-flight shipments, reject insufficient inventory/funds/capacity with no mutation. No lost/duplicated resources.
- `contribute` uses `{type:'contribute',from,resource:'goods'|'alloy',amount}` to fund an original regional project requiring total goods1000/alloy500. Requires connected trade facility. Reserve actual inventory and mark completed exactly once. Completed project gives explicit renewable power support or other concrete shared benefit through a defined `regionalBenefits` return function, without depositing unlimited cash every frame. Expose state; root integrates benefit with city rules only after reviewed.
- `advanceRegion(region)` advances every city exactly once through `advanceMonth`, delivers reserved shipments, increments region.month, caps events24, returns metrics for active city. No random AI cheating or ghost commuters.
- `serializeRegion(region)` / `parseRegion(text)` validate entire envelope/city saves, IDs, active index, project thresholds, shipments and conservation-related limits. Maximum3MiB. Current city saves remain accepted separately by the UI. A rejected save/import never mutates current region.

Both extensions require genuine behavioral RED against a minimal callable scaffold, then GREEN, explicit test logs under ignored `dev_docs/evidence/CMD-01`, no claiming setup/import failures as behavioral RED. Do not edit another owner path, commit, push or deploy. Send root exact exports and limitations before integration. User directly authorized Codex implementation; no OpenCode claim.
