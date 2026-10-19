# Managed OpenCode task containers

Prepared scaffold; Docker execution has NOT been verified in the current workspace because Docker/Podman are unavailable. This is a bounded task runner, not an autonomous publishing swarm.

## Data flow

Manager-selected source files → per-task Docker build → disposable non-root OpenCode worker → proposed patch, log and scope report → manager review → isolated integration/tests → feature branch.

Remote models still receive source and prompts. Docker restricts filesystem/process access; it does not prevent model-provider disclosure or provide an outbound network allowlist. No secrets, production records or private visitor data should be selected. The runner does not forward host environment variables, provider keys, repository tokens, Docker sockets or host directories to workers. A free OpenCode model is selected; its availability is not guaranteed. Production use should add a controlled egress proxy for approved model destinations.

## Before running

Use a Docker-enabled host with Python 3 and an audited copy of the repository. Model source transfer must be explicitly authorized. Review `tasks.json` and source contents, not only filenames: credentials embedded in otherwise allowed source cannot be detected by filename filtering. The base image and package version should be reviewed/pinned to digests/lockfiles for a production runner.

Prepare a manifest without starting Docker or contacting a model:

```sh
python orchestration/run_task.py foundation
```

After reviewing the manifest and authorizing source disclosure, run:

```sh
python orchestration/run_task.py foundation --run --allow-source-transfer
```

The transfer flag acknowledges disclosure; it does not override platform permission checks. Stop on approval rejection. Do not pass any credentials to make a blocked run proceed.

Each worker has a read-only root filesystem, bounded tmpfs workspace, no Linux capabilities, a non-root user, CPU/memory/process limits and a 14-minute model timeout. A named volume retains output until it is copied out and removed. No source-repository mount or GitHub credentials are provided. Model dependencies are installed at image build time; workers may not introduce dependencies. Runtime egress remains available to contact the model.

Results go to `.agent-results/<task-id>/`: source hashes/task metadata, `proposal.patch`, `agent-run.log`, and `result.json`. Treat all worker outputs as untrusted, including claimed test results. The scope report flags unexpected output paths; it never approves or applies a patch. Keep logs private and do not commit generated artifacts.

## Scheduling and ownership

1. **Foundation / HTML** first: template extraction, hooks, base styles and UI contract. Review and integrate its patch before starting other teams.
2. **UI**, **JavaScript**, and **backend** can work from that same accepted baseline. Their output ownership is disjoint. Backend owns admin templates and CSS; UI owns public base styles.
3. **Motion** follows the accepted UI contract and modifies only its own stylesheet.
4. Manager adds requested stylesheet/script imports and reconciles integration changes. Teams report those requests rather than editing each other's files.
5. **QA** runs on the fully integrated candidate and reports defects without implementation changes.

Dependency entries are planning metadata, not an automatic approval scheduler. The manager must enforce completion and start each task deliberately. The runner will not decide that a task is approved because it finished.

Backend requires real red → green evidence for each behavioral increment: failing test first, minimal implementation, passing tests and regression checks. The manager reruns tests independently in a separate integration container. Frontend requires responsive, keyboard, contrast and reduced-motion checks; no fabricated browser results. Browser tooling is not installed by this scaffold.

## Review and integration

Review each patch's actual file list, paths, file modes and contents; do not rely only on the worker's scope report. Reject unexpected dependencies, subprocesses, network calls, data collection, changed access controls or evidence claims. Never execute a returned script on the manager host. Apply only inspected patches into a disposable integration checkout/container, run tests there with no production secrets, then review the combined diff before pushing the existing feature branch. No automatic apply, merge, deploy or GitHub write exists in this runner.

Use `python -m unittest discover -s orchestration -p 'test_*.py' -v` to verify snapshot filtering and generated entrypoint syntax. These checks are not a Docker integration test. Before relying on the runner, verify container permissions, artifact extraction, free-model connectivity, timeout behavior and cleanup on a Docker-enabled host.
