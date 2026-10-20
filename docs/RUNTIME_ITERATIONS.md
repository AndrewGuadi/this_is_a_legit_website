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
remains disabled; integrated execution, failure/crash cleanup and independent
review remain required before game tasks.

The subsequent RUN-01 infrastructure request failed with HTTP 503 from the free
DeepSeek endpoint. The free GLM endpoint also initially failed, then recovered.
Its broad runtime scaffold was rejected; no part was integrated. A narrower
OpenCode task, RUN-01A, implements process supervision. Independent review found
exception-cleanup and exact-output-limit defects in its first candidate.
Expanded failing tests and worker corrections are being reviewed before acceptance.

The process supervisor is now independently accepted. OpenCode session
`ses_ea55a74b9ffez1907Qr2gWOlqI` corrected partial-log loss and exception masking
against a frozen 19-test suite. Manager and TODD independently replayed all 19
passing tests, checked unchanged tests and exact candidate hashes, and verified
worker removal. Integrated regression checks pass: 27 orchestration tests and
5 runtime tests, using the documented private temporary directory.
Accepted `online_transport.py` SHA-256:
`e77fc8d271a3fa0816248f95e8aa572420fcfd8a8f052a19c218491fd7b45066`.

Network probes found a real isolation gap in the initial Squid tunnel: selecting
another TLS hostname behind the shared CDN reached an unrelated site. That
gateway was removed. A fixed nginx model API gateway now pins the public upstream
IP, verified TLS name, HTTP host and request path, and denies general tunnels.
TODD's independent local TLS fixture verified request rejection, fixed routing,
header stripping and certificate-name enforcement. Actual OpenCode smoke session
`ses_ea55bc7a3ffeC9figM0R2njA0H` completed through it with reported cost zero.
This approves continued supervised infrastructure work. The game still requires
the bounded single-phase runner and its independent live crash/cleanup checks.

No paid model access, game implementation, release scoring or merge is claimed.
Raw local evidence and the resumable task ledger are under ignored
`dev_docs/evidence/`; they are intentionally not published in this repository.

Current baseline: 30 application, 8 orchestration, 5 runtime-unit, 33 operations,
and 64 Chromium browser scenarios pass; the controlled research benchmark,
offline Docker runtime smoke and production Docker smoke pass.
This Codespace's `/tmp` default ACL produces
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
