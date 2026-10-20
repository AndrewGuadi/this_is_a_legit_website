---
name: behavior-tdd
description: Use for every OpenCode worker behavior change or bug fix requiring genuine tests-first development and evidence.
---

# Behavior Tdd

Read the task's behavioral contract. Write the smallest meaningful failing test before implementation. Execute it against a recorded pre-implementation snapshot; retain command, exit code and expected behavioral failure. Fix harness/setup failures before counting RED. Implement minimal behavior, run GREEN and relevant regressions, then refactor. Preserve red and green identities and actual logs. Do not fabricate a historical red result. For visual polish, use interaction/semantic tests where meaningful and actual render review; do not test CSS strings to manufacture coverage. Return known gaps, skipped checks and a reproducible command. Do not modify manager-owned evidence after handoff.
