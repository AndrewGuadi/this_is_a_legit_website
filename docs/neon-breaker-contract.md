# Neon Breaker implementation contract

Approved by Andrew on 2026-10-20; direct Codex implementation with independent local TODD review now replaces the previous OpenCode-only workflow. The other seven games remain concepts.

Use native Canvas 2D, with locally served ES modules and no runtime dependency. Phaser would supply scene/input/asset systems useful to a larger game; one paddle, one ball and three authored formations do not need those systems. A small deterministic simulation can be exercised directly by Node, while browser tests exercise the real HTML interface. No engine installation, external assets, model runtime or telemetry is needed to play.

World space is 960 × 600, independent of CSS and device pixel ratio. Physics uses bounded time steps and swept ball contacts; speed and rebound angles are bounded. The model owns lives, score, bricks and transitions. Renderer consumes state; controller calls explicit actions. Rendering never changes collision geometry.

States: ready → playing → paused (explicit resume); missed ball → ready or gameover; final brick → stage-clear or complete. Stage-clear waits for Continue, then intentional launch. Restart during any unfinished run asks for confirmation; cancel keeps the same score, lives, bricks and ball, paused where appropriate. Restart after a terminal state is immediate.

Files: static/neon-breaker/core.mjs (simulation/stages), view.mjs (canvas/art/audio), game.mjs (input/lifecycle/HTML updates), game.css; templates/neon_breaker.html; narrow Flask/catalog integration. Tests live in tests/game and tests/browser/neon-breaker.spec.js. Existing forms/admin code stays untouched.

Controls are HTML outside the canvas. Pointer movement is restricted to the field and a separate drag strip; touch scroll remains available elsewhere. Keyboard gameplay keys are scoped to the game field; buttons retain normal activation and unrelated inputs retain their keys. Visibility/window blur and resize pause simulation; return never resumes automatically. Optional synthesized sound starts muted and requires intentional activation. Best score is opt-in local storage, disclosed, and storage/audio failures are nonfatal. Reduced motion removes decorative motion and impact trails.

Evidence: authentic red/green source snapshots and logs under ignored dev_docs/evidence/NEON-01. Independent TODD reviews exact candidate hashes, executes tests and inspects rendered gameplay. Browser emulation is not physical device testing. The original ten-criterion score and mandatory evidence gates remain unchanged except that implementation provenance is now direct Codex, explicitly authorized by the owner.
