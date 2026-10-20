---
name: swarm-manage
description: Coordinate bounded OpenCode workers and independent TODD reviews for Legit Arcade; use for task dispatch, scope validation and revision planning.
---

# Swarm Manage

Read AGENTS.md and dev_docs/handoff/Legit_Arcade_Codespaces_Kit/overlay/ops/arcade/docs/SWARM_PLAYBOOK.md. Establish runtime provenance before dispatch. Assign one owner per path and freeze interfaces before parallel tasks. Limit initial build concurrency to two. Supply purpose, task ID, selected context, baseline identity, expected failing behaviors, owned paths, budget, deadline and evidence format. Preserve immutable baselines outside worker control. Validate candidate scope using manager-owned comparisons. Send integrated evidence to an independent TODD session. Convert findings into specific defect/evidence tasks; never request a score increase without new work. Checkpoint budget, run IDs, files, scores and next actions. Merge only under the frozen release gate. Never substitute your own substantive coding for OpenCode silently.
