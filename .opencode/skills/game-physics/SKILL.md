---
name: game-physics
description: Use when implementing or reviewing Neon Breaker physics, score, lives, stages and deterministic tests.
---

# Game Physics

Read FIRST_GAME_BRIEF in ops/arcade/reference. Define world-space state and inputs independent of render scaling. Use deterministic steps and bounded speed. Test corner contacts, fast contacts/tunneling, simultaneous collisions, paddle edges, score once per destroyed brick, life loss once, intentional launch and completion. Avoid near-horizontal infinite play. Test dt caps and pause without moving simulation. Keep stage data original and authored locally. Export stable contracts for input/view workers; route changes through manager. Document any non-deterministic behavior and test limits.
