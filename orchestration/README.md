# Managed OpenCode review scaffold

**Worker execution is disabled.** The initial runner was found to trust worker-controlled Git state. That path has been removed. This version supplies independently tested source snapshot and candidate-review primitives; it is not yet a working autonomous Docker service.

## Current capability

`python orchestration/run_task.py foundation` creates an input manifest without Docker/model access. Tasks and file ownership are declared in tasks.json. The manager must enforce dependencies: HTML foundation before UI/JavaScript/backend, accepted UI before motion, integrated code before QA.

The Python API `capture_baseline(root, inputs)` captures immutable manager-owned source bytes. `review_candidate(baseline, archive, allowed)` validates a complete UTF-8 candidate source tree in an uncompressed tar without extracting it onto the host, compares it to that baseline, and returns the authoritative patch, actual changed paths and SHA-256 inventories. Worker Git indexes, commits and supplied diffs are ignored. A complete candidate is required: omission of a baseline file is treated as deletion.

Validation rejects paths outside the allowlist, traversal, links, devices, executable/special file modes, duplicate paths, forbidden runtime/secret filenames, binary files and file/count/byte-limit violations. Filename filtering is not a content secret scanner: the manager must inspect selected source for embedded secrets before disclosure. Patches and logs remain untrusted; the manager reviews code and independently runs tests in an isolated integration environment before accepting anything.

No automatic apply, commit, push, merge or deployment exists. The prototype supports non-executable UTF-8 source only. A future artifact transport must enforce limits before downloading the entire candidate; local archive validation does not itself bound network transfer.

## Gates before execution can be restored

- Explicit authorization for sending selected source/prompts to the remote OpenCode model service.
- Enforced model-only egress, blocking host/private-network access.
- Verified Docker runtime isolation, resource bounds, timeout, cleanup and bounded artifact transport/storage.
- Independent integration tests on a Docker-enabled host; no host sockets, credentials, production data or writable source mounts.
- New independent reviewer approval of the exact candidate.

`--run` deliberately fails closed even when `--allow-source-transfer` is supplied. That flag is an acknowledgement, not a bypass of platform review or technical gates. Docker/Podman are unavailable in the current workspace. No Docker or external model execution is claimed.

## Tests

Run `python -m unittest discover -s orchestration -p 'test_*.py' -v`. Tests include a worker committing modifications such that its own git diff is empty while the manager comparison still detects them, plus malicious archive and scope/bounds checks. These are offline artifact-integrity tests, not Docker isolation tests.
