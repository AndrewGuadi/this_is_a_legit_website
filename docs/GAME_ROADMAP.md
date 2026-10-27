# Arcade roadmap

`game_catalog.py` is the source of truth for the public catalog. Pages should derive their titles, order, descriptions, controls, session estimates, and status from `GAMES`; they should not maintain a second game list. Session lengths and controls are design targets until playable testing exists.

Four games are implemented: Neon Breaker, Circuit Match, Blockbound: First Light, and Infinite Tic-Tac-Toe. Six concepts remain planned.

All ten catalog entries target mobile, tablet, and desktop browsers with touch and keyboard input. Use original code, names, layouts, graphics, and audio; no branded ROMs, copied game art, or commercial game music. No account, paid asset, advertising integration, external data source, or multiplayer service is needed for the initial concepts. Business assessments below are hypotheses, not measured demand or revenue claims.

| Order | Game | Owner | Status | Business strategy | Technical feasibility |
|---:|---|---|---|---|---|
| 1 | Neon Breaker | Codex implementation; independent TODD | Playable review candidate | Familiar, short rounds can demonstrate arcade quality quickly and give visitors an immediate reason to return. Evaluate replay intent before adding monetization. | Small 2D collision surface, original formations, three lives, local score only. Paddle/ball speed and resize handling require device tests. No external API. |
| 2 | Orbit Snake | Game implementation team; manager reviews | Planned | Quick sessions suit casual visits and low onboarding friction. Compare repeat runs with the first title before expanding scope. | Deterministic grid simulation, queued direction input, and local scoring. Prevent impossible reverse turns; verify swipes and keyboard parity. No external API. |
| 3 | Pixel Rally | Game implementation team; manager reviews | Planned | A solo time challenge adds skill progression and a different audience within the catalog. No evidence yet supports a multiplayer investment. | Original top-down circuits and lightweight vehicle physics. Steering feel, simultaneous touch inputs, and lap validation are primary risks. Local best times; no online leaderboard. |
| 4 | Starline Patrol | Game implementation team; manager reviews | Planned | Short action rounds broaden variety while keeping a clear score goal. Test whether visitors choose another run before adding content packs. | Scripted original enemy waves, pooled projectiles, and bounded collisions. Multi-touch movement/fire and rendering budgets need validation. No backend gameplay dependency. |
| 5 | Circuit Match | Direct implementation | Playable | A calmer, turn-based choice supports visitors who prefer planning over reflexes. Evaluate completion and frustration before tuning difficulty. | Seedable boards, legal swaps, match resolution, and move budgets. Validate solvability and keyboard focus without relying on color alone. Local state; no external service. |
| 6 | Pocket Paddles | Game implementation team; manager reviews | Planned | A concise duel provides an easy repeat-session format without account setup. Begin with computer opposition rather than costly networking. | Single-player computer paddle with bounded reaction speed and original presentation. Test collision edges, difficulty fairness, and touch precision. Multiplayer is excluded initially. |
| 7 | Dungeon Dash | Game implementation team; manager reviews | Planned | Exploration adds a longer session for visitors already engaged with the arcade. Content effort makes this a later investment. | Small handcrafted original room set, tile collision, keys, traps, and limited health. Touch movement, readable hazards, and save/reset semantics need careful testing. No generated live content or external API. |
| 8 | Skyline Sprint | Game implementation team; manager reviews | Planned | Short mastery-oriented routes can encourage retries and round out the catalog. Validate controls before committing to a level pipeline. | Original platform layouts, predictable movement, jump buffering, and bounded obstacles. Collision corners and low-frame-rate fairness are the main risks. No network gameplay. |
| 9 | Blockbound: First Light | External contribution; independent review required | Playable review candidate | A compact exploration quest tests whether visitors enjoy a longer, calmer adventure without accounts or backend gameplay. | Fixed-memory C/WebAssembly raycaster, collision, dialogue and shard quest. Requires browser, touch, accessibility and independent review before release. |

| 10 | Infinite Tic-Tac-Toe | Direct implementation; independent review pending | Playable review candidate | A familiar local duel adds social repeat play without accounts or networking. Evaluate whether removal and loop-breaking produce interesting rematches. | Deterministic nine-cell state machine, native accessible buttons, local optional audio, and bounded repeat history. No backend or external API. |

## Build order and gates

Build in the numbered order unless the user changes priorities. Each title must pass strategy review (purpose, intended audience, repeat-play hypothesis, future revenue path) and technical review (input, rendering, storage, dependency cost, rights, and device reliability). Technical review can reject or reduce scope. The initial revenue path is increased usefulness and return visits to the arcade; specific ads, purchases, or sponsorships require a separate decision and are not implemented here.

- [x] User approves Neon Breaker — Andrew, 2026-10-20.
- [x] Select native Canvas with no runtime dependency; see implementation contract.
- [x] Implement the three-stage candidate and original procedural visuals/audio.
- [ ] Verify gameplay, keyboard/touch parity, accessibility controls, and mobile/tablet/desktop layouts — owner: QA team — status: automated checks passing; physical-device evidence pending.
- [ ] Independently review the first playable build — owner: manager/reviewer — status: TODD review and correction loop in progress.
- [ ] Obtain direction for the next game — owner: user — status: planned after first-game review.
- [ ] Repeat implementation and review gates for Orbit Snake through Skyline Sprint — owner: implementation/QA teams — status: planned; not authorized by first-game approval.

## Engine candidate

Phaser is a candidate for these 2D browser games. Its [official introduction](https://docs.phaser.io/phaser/getting-started/what-is-phaser) documents desktop/mobile browser support and WebGL/Canvas rendering. Tablets are a required project test target, not a claim of completed compatibility. No Phaser dependency or game engine has been added in this planning work. Version selection, package licensing review, dependency installation, and actual device validation belong to the approved implementation phase.
