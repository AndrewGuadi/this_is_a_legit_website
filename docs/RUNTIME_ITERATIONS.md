# Isolated worker runtime verification

## Codespace verification — 2026-10-20

The current Codespace has a working Docker 29.8.0-1 daemon. A real OpenCode
1.19.3 smoke task ran in a disposable, non-root, resource-limited container using
`opencode/deepseek-v4.1-flash-free`, session
`ses_ea591483affe1Wirp3gypSL3FP`. This was a synthetic clamp-function task, not
Neon Breaker implementation. The worker wrote tests first; two behavioral
assertions failed before implementation, then all four tests passed. Manager and
independent reviewer TODD reproduced RED and GREEN, verified identical test
bytes, checked manager-owned source hashes/diff and scope rejection, and
confirmed worker removal.

TODD approved the supervised bootstrap only for a single infrastructure worker.
The manager added a bounded-output, externally timed dispatch wrapper with
container removal on failure following TODD's finding. The project online runner
remains disabled; its production isolation, failure cleanup, peer/TLS/DNS tests
and independent review remain required before game tasks.

The subsequent RUN-01 infrastructure request failed with HTTP 503 from the free
DeepSeek endpoint before returning implementation. A bounded attempt with the
listed free GLM endpoint encountered the same unavailable-endpoint errors. No
paid model access, game implementation, release scoring or merge is claimed.
Raw local evidence and the resumable task ledger are under ignored
`dev_docs/evidence/`; they are intentionally not published in this repository.

Current baseline: 30 application, 8 orchestration, 5 runtime-unit, 33 operations,
and 64 Chromium browser scenarios pass; the controlled research benchmark and
offline Docker runtime smoke pass. This Codespace's `/tmp` default ACL produces
unsupported candidate file modes. Use a private scratch directory without that
ACL through a per-command `TMPDIR`; preserve the strict validator. Chromium
required installation of its OS libraries before the browser suite could run.
These are baseline results, not certification of future game changes.

## Historical offline harness

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

Eight candidate/baseline tests and five bounded-transport/configuration tests pass. These include hostile Git staging/commits, empty-file diff application, malicious archive members, scope violations, byte limits, export failure, and transport timeout. At the time this offline harness was authored, Docker was unavailable locally. The current Codespace execution is recorded above.

## Remaining model-runtime gate

This offline smoke closes only the testable runtime harness gap when CI succeeds. A remote OpenCode execution path still requires separately authorized source transfer, an enforced and independently tested model-endpoint-only egress mechanism, approved/pinned model tooling, and the same bounded capture/manager review boundary integrated with the real worker lifecycle. Nothing in this test enables model execution or automatic patch application.
