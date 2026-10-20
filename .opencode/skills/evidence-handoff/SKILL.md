---
name: evidence-handoff
description: Use when packaging worker results or validating candidate source, test logs and provenance for TODD.
---

# Evidence Handoff

Use templates in dev_docs/handoff/Legit_Arcade_Codespaces_Kit/overlay/ops/arcade/templates. Include task/run/model/CLI identity, baseline and candidate manifests, owned/changed paths, real red/green logs, exit codes, commands, dependencies, screenshots, known defects and unavailable checks. Keep artifacts bounded and free of secrets/production data. Manager computes authoritative diff and reruns integrated tests in isolation; worker git state and self-reported success are not enough. Bind evidence to source content as well as commit SHA, staging all intended files first. Do not re-use old logs for a changed build without documenting coverage. Validator scripts check consistency, not truth or authenticity.
