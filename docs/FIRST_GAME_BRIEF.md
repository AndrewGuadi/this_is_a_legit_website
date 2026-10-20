# Neon Breaker — first-game approval brief

**Status: awaiting user approval. No game implementation or engine installation is authorized by this brief.** The arcade catalog/site rebuild can proceed separately. This brief describes the first proposed playable release; later games remain planned.

## Purpose and scope

Create a polished, original brick-breaker that makes the arcade useful within seconds of arrival. A short three-life run offers a clear goal: clear the formations, preserve the ball, and improve your score. Target sessions are 3–5 minutes, subject to testing. The business hypothesis is that an approachable, responsive game earns repeat visits; no visitor-retention or revenue result is claimed yet.

Proposed v1: three original compact stages, one paddle, one ball, three lives, score, a readable stage/lives display, a completion state, and a game-over state. An intentional launch begins each ball. After losing a life, explain the remaining lives and wait for another launch. Avoid power-ups, multi-ball, online leaderboards, accounts, purchases, ads, and multiplayer until the core feel is validated. If local best-score storage is used, keep it on-device, describe it, and gracefully handle unavailable storage.

## Play and presentation

Use an original neon visual identity with distinct brick shapes or outlines, strong ball/paddle contrast, restrained impact effects, and clear HUD hierarchy. Color alone must not distinguish essential states. Create original graphics and optional original sound effects; do not import branded ROMs, copied sprites, or commercial music.

The layout must work on mobile, tablet, and desktop. Keep a consistent landscape playfield ratio using letterboxing inside the available space; do not stretch physics or crop the field. Portrait devices should still expose the complete field and reachable controls. Landscape can be suggested, never required by an orientation lock. Safe areas and the site's navigation must remain usable. Resizing or rotating pauses play, repositions presentation safely, and requires explicit resume.

| Action | Keyboard | Touch/pointer |
|---|---|---|
| Move paddle | Left/Right or A/D | Drag the paddle control region; support mouse movement as a desktop alternative |
| Launch ball | Space or focused Launch button | Explicit Launch button |
| Pause/resume | P or Escape; accessible button | Visible Pause/Resume button |
| Mute/unmute | Focusable labeled control | Visible labeled Mute/Unmute button |
| Restart | Focusable Restart button | Visible Restart button |

Pause must stop the simulation rather than only hide it. Switching tabs or losing visibility pauses automatically, with an explicit resume step on return. Restart during a live run asks for confirmation; cancel preserves the paused run. Restart after game-over or completion begins a clean run. Never capture gameplay keys while an unrelated site input is focused. Prevent page scrolling only for active gameplay interactions, not for the entire page.

Audio starts only after intentional user interaction and is optional. A persistent-in-session mute state applies to every sound. Reduced-motion preferences disable nonessential shakes, flashes, and decorative movement while preserving readable ball motion. Provide HTML controls and instructions outside the canvas; full nonvisual play equivalence is not promised by labeling a canvas alone.

## Technical plan and risks

Phaser is the proposed 2D framework candidate, not an installed dependency. Its [official documentation](https://docs.phaser.io/phaser/getting-started/what-is-phaser) describes browser-focused desktop/mobile support. After approval, pin a reviewed release, use original assets, and bundle locally. No external API, server-authoritative gameplay, paid engine service, or player identity is needed.

Primary risks are ball tunneling at high speed, shallow trajectories that stall play, paddle control under touch, and layout/physics changes during rotation. Bound speed, constrain rebound angles, use deterministic collision tests where practical, and separate world coordinates from display scaling. The team should validate a representative lower-powered phone before increasing effects. Engine choice can be revised if testing reveals poor suitability.

## Acceptance gates for the future playable build

- [ ] User approves this scope — owner: user — awaiting approval.
- [ ] Original gameplay and asset implementation — owner: implementation team — blocked by approval.
- [ ] Ball/paddle/brick collision, life loss, score, and progression tests — owner: implementation/QA — blocked by implementation.
- [ ] Pause, mute, restart, visibility changes, rotation, and storage-denied checks — owner: QA — blocked by implementation.
- [ ] Complete runs using keyboard and touch across mobile, tablet, and desktop — owner: QA — blocked by implementation.
- [ ] Reduced-motion, focus visibility, target sizing, and readable instructions reviewed — owner: QA — blocked by implementation.
- [ ] Independent review of responsiveness, visual polish, usability, and remaining limitations — owner: manager/reviewer — blocked by playable evidence.

These are approval and verification gates, not completed tasks. Approval permits the first game only; it does not change the other seven catalog statuses to playable or authorize their implementation.
