# Blockbound: First Light

An original, compact blocky 3D city adventure. This is a review candidate, not a claim of release approval or an adaptation of a commercial game.

## Play

Start at `/games/blockbound-first-light`. Walk through First Light, meet its three residents, collect the three golden light shards, and interact with the northern beacon. The minimap shows open lanes, buildings, uncollected shards, and the player.

- **W/S:** forward/back; **A/D:** step left/right.
- **Arrow Up/Down:** forward/back; **Arrow Left/Right:** turn.
- **E/Space:** talk, collect, or use the beacon; Space also starts from the title.
- **P/Escape:** pause; the visible action button resumes.
- **Touch:** separate movement, turning, and Interact controls.
- **Sound:** optional synthesized interaction cues; preference stays in this browser when storage is available.

The complete loop is title → exploration → pause/resume → beacon completion → restart. Restart asks for confirmation during an active or paused walk.

## Architecture

`games/blockbound/core.c` owns the map, fixed-memory game state, movement and collision, interaction rules, quest progress, and a 320×180 software raycaster. `static/blockbound/game.mjs` loads the module once, supplies keyboard/touch input, presents its framebuffer with Canvas, and exposes all quest information as readable DOM text. There is no game backend, telemetry, external asset request, per-frame entity creation, or runtime dependency.

The C module uses a fixed 1 MiB WebAssembly memory. The busy scene contains seven billboard entities and 320 ray columns. Rendering is pixelated by design. Native deterministic tests cover movement, wall collision, pause/resume, resident dialogue, duplicate-pickup prevention, incomplete beacon rejection, victory, restart, and framebuffer opacity.

## Rebuild

The browser-ready WebAssembly is checked in as base64 text at `static/blockbound/blockbound.wasm.base64` and decoded locally before instantiation, so normal arcade development needs no compiler. To rebuild after changing the C core, install Zig or clang+lld and run:

```sh
python scripts/build_blockbound.py
```

An alternate Zig command can be supplied with `ZIG`, for example `ZIG="python -m ziglang"`.

## Test

```sh
cc -std=c99 -DBB_TEST -Wall -Wextra -Werror \
  games/blockbound/core.c games/blockbound/test_core.c -lm \
  -o /tmp/blockbound-test
/tmp/blockbound-test
node --test tests/blockbound/*.test.mjs
python -m unittest -v
npm run test:browser
```

Browser emulation is not physical-device evidence. Independent gameplay, accessibility, performance, and release review remain required.

## Rights

City layout, names, dialogue, renderer, artwork, and synthesized audio are original to this contribution. No Pokémon names, characters, maps, assets, ROM data, or other commercial game content are included.
