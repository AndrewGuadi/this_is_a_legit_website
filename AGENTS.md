# Legit Arcade agent operating rules

## Current authorization

**Latest owner instruction (CMD City, current session):** Andrew approved direct Codex implementation with independent TODD review and requested feature-to-feature equivalence with SimCity. This authorizes the new city-game scope and extends the direct-Codex exception to CMD City; the older Neon-only scope restriction below does not block this work. Track the reference edition and every parity gap explicitly. A playable milestone is not feature equivalence. Preserve tests-first work, privacy, independent review and normal release gates. PythonAnywhere is the existing hosting target. Do not claim deployment or parity without evidence.

**Latest owner instruction (2026-10-20):** Implement Neon Breaker directly with Codex and an independent local TODD reviewer. The owner explicitly suspended the OpenCode-only implementation requirement while its runtime is worked out separately. Record direct Codex provenance honestly. All game scope, tests-first, privacy, independent review, scoring and merge gates below remain in force; OpenCode runtime completion is no longer a prerequisite for this game. This paragraph supersedes conflicting implementation-role instructions below.

Andrew approved Neon Breaker implementation through OpenCode workers on 2026-10-20. Manager may merge the accepted first game to main once TODD averages ≥95/100 across all ten criteria and required gates pass. No other game, new visitor telemetry, purchases without an approved budget, or unrelated deployment is authorized by this scope. Older awaiting-approval documents are historical for this one game; update status when work begins.

## Responsibilities

- Codex Astra manager: plan, task ownership, version/budget control, isolation checks, candidate diff verification, integration, feedback and final merge. Minimal direct coding; never silently substitute for OpenCode implementation.
- OpenCode workers: implement assigned sections with genuine TDD and return source plus evidence. No GitHub push/merge credentials, production data, shared writable checkout or uncontrolled recursive delegation.
- TODD: separate reviewer session, read current candidate, independently evaluate evidence and return scores/findings. Do not implement fixes or approve your own work.

Read `SKILLS.md`; load only relevant `.opencode/skills/*/SKILL.md`. Read `dev_docs/handoff/Legit_Arcade_Codespaces_Kit/overlay/ops/arcade/reference/NEON_BREAKER_TODD_RUBRIC.md` for scoring. See `dev_docs/handoff/Legit_Arcade_Codespaces_Kit/overlay/ops/arcade/docs/` for execution and repository references.

## Source and runtime

The public repo may be supplied to authorized OpenCode model services for this task. Public source status does not make credentials or production records public. Use source-only inputs, immutable manager baselines, allowlisted output paths and bounded candidate archives. Review changes using manager-computed diffs; worker git state and logs are untrusted. The existing online runner is disabled; enable a replacement only after evidence establishes container isolation, bounded transport, egress restrictions, timeout and cleanup. Do not bypass approval or platform controls.

The manager owns Docker orchestration. Workers must not receive Docker socket, GitHub token, manager home, repository .git directory, deployment secrets or other workers' outputs. Provider connection credentials must be narrowly scoped; prefer a controlled model gateway that retains them outside worker tools. Native OpenCode agent permissions are a usability layer, not a security sandbox.

## TDD and evidence

Each behavioral change: failing test and source snapshot → minimal implementation → passing test → regressions/refactor. Capture commands, exit codes, actual logs, tool/model/run identity and before/after manifests. Do not fabricate test execution or retrospectively claim tests-first. Request missing interfaces rather than editing another team's files. Visual tasks require rendered evidence; browser emulation does not prove phone hardware performance.

Use synthetic form input. Preserve `/forms`, `/apply/*`, admin authentication/CSRF, export, retention and deletion protections. No accounts, online leaderboard, purchases, ads or multiplayer in first-game v1. Optional local best score stays on-device and handles storage denial.

## Review and release

All ten scores are required and equal-weight. Missing evidence is UNVERIFIED, never assumed passing. Average≥95 is necessary but not sufficient: required tests/evidence and no critical/high defects are mandatory. Bind every review to candidate SHA and content manifest; code changes invalidate relevant evidence. The JSON validator cannot authenticate review provenance.

Push feature branches; merge only the exact accepted candidate through normal GitHub rules. No force-push, branch-protection bypass, test removal, score inflation or unauthorized paid calls. When blocked, preserve evidence and state the actual missing prerequisite. Do not quietly replace OpenCode with another implementation agent.

## Continuity

Record task status, run IDs, file ownership, costs, commands, source hashes, scores and next actions under the configured evidence directory. Do not commit raw secrets or huge traces. After a restart, reload current Git state, runtime report and last accepted review before dispatching work. Use at most two build workers initially; increase only when measured resource and rate limits support it.
