# Isolated worker runtime verification

## Current iteration

The manager has an offline synthetic Docker worker smoke test. This is executable validation of the container boundary and artifact pipeline, **not an OpenCode or model run**. Remote-model execution in `run_task.py --run` remains disabled. No claim of successful Docker isolation is warranted until the Docker smoke job finishes successfully on its target host.

Run on a Linux Docker host:

```sh
python -m unittest discover -s orchestration -p test_runner.py -v
python -m unittest discover -s tests/runtime -v
python orchestration/runtime_smoke.py --output artifacts/runtime
```

The Docker build pulls the official `python:3.12-slim-bookworm` image if necessary; it installs no packages and copies only the synthetic probe and collector scripts. The resulting image ID is recorded. The mutable upstream base tag is a reproducibility limitation, so approved production images should subsequently be pinned by reviewed digest. Do not pass application source, credentials, or visitor records to this test.

## Boundaries exercised

- Worker runs as UID/GID 10001 with all capabilities dropped, no-new-privileges, Docker's default seccomp filter, read-only root filesystem, no host bind mounts, and no Docker socket.
- Network mode is `none`. An external socket-connect attempt must fail. This deliberately proves complete offline isolation; it does **not** prove model-only egress routing.
- CPU, memory, swap, process-count, and writable tmpfs limits are configured and inspected. The worker inspects its actual capability, UID, seccomp, and no-new-privileges state and attempts a forbidden root-filesystem write.
- A manager-owned immutable baseline exists only on the host. The worker edits a synthetic candidate without permission to alter the baseline.
- The immutable collector exports `/work` while the container is alive. Host transport enforces a byte ceiling and timeout before the existing manager validator parses the tar in memory. Nothing is extracted onto the host.
- Manager validation rejects unsafe members, forbidden paths, unauthorized changes, oversized output, and unsupported file modes/content. Proposed diffs and inventories come from manager comparison, not worker Git metadata.
- The candidate archive, review result, and patch are recovered before container termination. A second review verifies those artifacts remain usable after the container stops. The container and temporary image are then removed.

The output directory contains `candidate.tar`, `proposal.patch`, and `result.json`. A successful result reports `worker_kind: synthetic_offline` and `model_invoked: false`. CI should retain these artifacts for reviewer inspection; failed CI jobs must not be reported as passing.

## Tests completed locally

Eight candidate/baseline tests and five bounded-transport/configuration tests pass. These include hostile Git staging/commits, empty-file diff application, malicious archive members, scope violations, byte limits, export failure, and transport timeout. Docker is not available in the current development environment, so container execution remains pending CI.

## Remaining model-runtime gate

This offline smoke closes only the testable runtime harness gap when CI succeeds. A remote OpenCode execution path still requires separately authorized source transfer, an enforced and independently tested model-endpoint-only egress mechanism, approved/pinned model tooling, and the same bounded capture/manager review boundary integrated with the real worker lifecycle. Nothing in this test enables model execution or automatic patch application.
