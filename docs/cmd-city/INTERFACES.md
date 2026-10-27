# CMD City interface contract — first integrated candidate

Direct Codex implementation is approved in the current conversation. This interface freezes the initial model/UI boundary; full SimCity parity remains the product target, with incomplete features recorded separately. Original assets and names only.

`content.mjs` exports `TOOLS` keyed by tool ID. Each definition has `label`, `group`, `cost` (integer minor currency units), `upkeep` (monthly minor units), `color`, `description`, and optional `capacity`, `supply`, `resource`, `radius`. Groups: Transport, Zones, Utilities, Services, Industry, Future. IDs: road, avenue, bridge, residential, commercial, industrial, wind, coalPlant, water, sewage, landfill, recycling, park, school, university, clinic, hospital, fire, police, bus, rail, station, port, airport, mine, oilWell, factory, trade, tourism, casino, academy, tower. Inspect and bulldoze are UI tools, not constructed types.

`core.mjs` exports `createCity({seed=2013,starter=true,name='Riverbend',sandbox=false}={})`, `measure(state)`, `applyAction(state,action) -> {ok:boolean,message:string}`, `advanceMonth(state) -> metrics`, `inspectTile(state,x,y,metrics?) -> {title:string,lines:string[],blockers:string[],connected:boolean,operating:boolean}`. Actions mutate only on success. `measure` is read-only. `advanceMonth` mutates only the simulation model.

State has `version:1,width:40,height:32,seed,rng,name,month,cash,sandbox,taxes:{residential,commercial,industrial},funding:{school,clinic,fire,police},policies:{recycling,disasters},research:{points,completed:[]},inventory:{coal,ore,oil,goods,alloy,electronics},trade:{coal,ore,oil,goods,alloy,electronics},bonds:[],history:[],events:[],tiles:[]`. Trade modes are off/import/export, fixed bounded quantities per month defined in content. Tile fields: `terrain` land/water, `type` empty or tool ID or ruins, `occupancy` integer, `level` 1–3, `modules` 0–3, `fire` 0–3, `resource` null/coal/ore/oil, `reserve` nonnegative integer, `age` integer. Gateway road tile is at (0,16) and protected. `events` strings and history bounded to 24 entries. Amounts displayed as `cash / 100`.

Metrics has `population,workers,jobs,employed,unemployment,happiness,education,health,crime,pollutionAverage,traffic`, `monthly:{income,upkeep,debt,trade,net}`, `utilities:{power:{supply,demand,ratio},water:{supply,demand,ratio},sewage:{supply,demand,ratio},waste:{supply,demand,ratio}}`, `demand:{residential,commercial,industrial}` (0–100), `access:[]` boolean, `roadLoad:[]` number, `pollution:[]` number 0–100, `landValue:[]` number 0–100, `coverage:{park:[],school:[],clinic:[],fire:[],police:[],bus:[]}`, `warnings:[]` strings. Education/health/crime indices are city indicators, not individual simulation. Utility demand is based on actual occupancy; growth must reserve prospective demand.

Actions:

- `{type:'build',tool,x,y}`; `{type:'bulldoze',x,y}`; `{type:'upgrade',x,y}`.
- `{type:'tax',sector,value}` (0–20 integer); `{type:'funding',service,value}` (0–150, increments unrestricted integers).
- `{type:'policy',name,value}` (boolean, recycling/disasters).
- `{type:'bond'}`; `{type:'research',topic}` (cleanEnergy/transit/vertical/serviceDrones).
- `{type:'trade',resource,mode}`; `{type:'disaster',kind}` (fire/flood/meteor/tornado); `{type:'rename',value}`.

`save.mjs` exports `serializeCity(state) -> JSON string`, `parseCity(text) -> validated state` (throws Error on invalid/oversize/unknown version). UI handles localStorage, explicit opt-in, import replacement confirmation and export. No backend save/telemetry.

`clock.mjs` exports `createClock()`, `setRunning(clock,bool)`, `setSpeed(clock,1|2|4)`, `advanceClock(clock,elapsedSeconds)->numberOfMonths`. Hidden/blur/resize UI calls `setRunning(false)`. Max elapsed accepted is 1 second, max two months per frame, one month = two seconds at 1×. Clock is not saved.

Proposed DOM: semantic top HUD, original Canvas map, tool palette, inspector, budget/tax/funding panel, data overlays (none/access/power/water/pollution/landValue/traffic/services), help and parity-status link. Real page states: paused/playing, selected tile, confirmation dialog, storage warning. Keyboard map arrows/Enter/Space/I/Escape scoped to map; ordinary inputs untouched. Canvas mapping, zoom and pointer input use the same camera transform. Visible zoom/reset and coordinate jump controls.

UI owner: `templates/cmd_city.html`, `static/cmd-city/{view.mjs,game.mjs,game.css}`, `tests/browser/cmd-city.spec.js`, `static/arcade-art/cmd-city.svg`. Root owns model/content/save/clock, model tests, integration, documents and release. No editing another owner's paths without requesting an interface change. Manager handles Flask server/dependencies/preview. UI must not start its own server. Strict CSP: self-hosted scripts and styles, no inline handlers or style attributes. Any dynamic geometry belongs in Canvas; toggle classes for HTML state.


Integrated extensions add `tiles.stored` (landfill stock), `tiles.enabled`, `state.regionalPower` and sewage/waste backlogs. Metrics include actual `busPassengers`, `railPassengers`, `busLoad`, `railLoad` and filled jobs per tile. See EXTENSIONS.md for the standalone transit and region APIs; region saves now preserve all three cities. `toggle` suspends/reopens a selected facility. Facility utility demands, trade/fuel/extraction conservation and local cache invalidation are covered by the model tests.
