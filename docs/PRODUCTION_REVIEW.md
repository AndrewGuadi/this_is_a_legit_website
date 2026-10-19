# Independent production review — 2026-10-19

**Status: review in progress; no production score or certification issued.** CI was reported in progress when this review began. This review evaluates the local source corresponding to manager-reported candidate `3da6e9e63b9bd686724b23d9d2d77695d4fc382f`; later source changes require re-review.

## Independently executed evidence

- `python -m unittest discover -s tests/operations -p 'test_*.py' -v`: 2 passed.
- Synthetic backup/login/logout/restore reproduction: a captured session cookie was rejected by the original database after logout (302), then accepted by the restored database with the same signing key (200).
- Synthetic capacity reproduction: with `MAX_EVENTS=1` and one current event, `/healthz` reported 200 after a successful heartbeat while form submission returned 503.
- No CI result is presumed successful here. Source inspection of Playwright/axe or Docker tests is not execution evidence. No live domain, TLS proxy, alert destination or production data was accessed.

## Findings requiring correction

| Priority | Finding | Evidence | Acceptance condition |
|---|---|---|---|
| High | Restoring backups restores revoked administrator sessions | `deployment/backup.py` is used for both backup and restore and copies `admin_sessions`; independent cookie replay reproduction succeeded | Add explicit restore behavior which clears authentication sessions before destination activation. Test revoked-cookie rejection after restore, current records preserved, expired records purged before serving. Do not clear sessions in ordinary backups silently. |
| High | Supervisor detects exits but not a hung retention service | `deployment/start.py` polls only child process state; `wsgi.py` heartbeat age does not stop traffic | Add a watchdog tied to configured interval plus bounded grace. Stale/missing/invalid heartbeat must cause supervised serving to stop or refuse work. Test live-but-stalled maintenance and orderly shutdown. |
| Medium | Healthy status can mask total collection failure | `wsgi.py` checks a read and heartbeat; independent full-capacity reproduction gives health200/submission503 | Separate liveness/readiness semantics. Readiness must surface persistent capacity/storage failures without exposing records or secrets; document routing behavior and test capacity, stale heartbeat, missing DB and storage failure. |
| Medium | Startup purge has no timeout and precedes signal/child cleanup setup | `deployment/start.py` initial `subprocess.run(...,check=True)` is unbounded | Bound startup purge time; ensure termination cleans its child. Test a stalled startup purge and signal during startup. |
| Medium | Deployment instructions bypass new production path | `docs/OPERATIONS.md` still instructs `create_app()` directly and a daily external purge | Document one authoritative supervised command and separately supported external-WSGI mode, including how retention is supervised in that mode. Ensure production preflight always runs. |
| Medium | Backups lack automatic expiry and can reintroduce deleted records | Backup has private permissions and integrity check but no expiration/deletion metadata or enforcement | Specify and verify backup lifecycle, deletion handling and restore purge. A synthetic successful restore does not prove production copies expire. |

## Remaining operational constraints

- Health heartbeat uses a hardcoded 3,600-second threshold while purge interval permits 30–3,600 seconds. This can hide failures for an hour or cause transient unhealthy results at the upper interval. Tie thresholds to one documented configuration and bounded scheduling grace.
- App retention wording says records expire after 30 days; physical removal is periodic. Specify logical expiry and maximum cleanup delay, including downtime, backups and snapshots. Ensure expired records are never served after restore.
- Actual TLS termination, HTTPS forwarding, host identity, trusted proxy behavior, secure-cookie delivery and raw hosting log retention remain deployment-specific. `PUBLIC_URL=https://...` does not verify them.
- Docker smoke with `--network=none` can demonstrate offline isolation only. It does not establish that a model-connected OpenCode worker has a safe approved-destination egress path.
- Production Dockerfile is non-root, which is positive, but persistence/mount ownership, memory/PID/disk limits, restart policy and private networking must be supplied and verified by deployment configuration.
- Current operations tests exercise functions and database restart, not real Gunicorn supervisor lifecycle, alert delivery, code rollback or a deployed service restart. Add process-level tests for the important failure cases.
- Current backups use SQLite online copy and mode0600; these are useful controls. They do not establish encryption, off-host access control or a production retention schedule.

## Review disposition

Continue implementation and CI validation. Do not equate passing component tests with verified production operation, or count iterations as a substitute for acceptance evidence. Re-review fixes and actual CI artifacts before assigning updated readiness scores.

## Re-review after operations hardening

This section supersedes the initial findings above where explicitly resolved. Local source was re-read after `docs/OPS_ITERATIONS.md` changes. The next CI run is pending, so no final production score is issued.

### Independently verified progress

`python -m unittest discover -s tests/operations -p 'test_*.py' -v` completed with **16 passing test executions**. Several inherited base tests run more than once; this is not 16 distinct behaviors. The suite verifies cleared restored sessions, rejected expired backups, maintenance deletion, full-event readiness failure, interval-related heartbeat age, rollback of readiness writes, and mocked supervisor timeout/watchdog cleanup.

- **Resolved in inspected code/tests:** restored admin sessions; event-capacity false readiness; missing retention watchdog; unbounded startup purge; outdated production entrypoint documentation.
- **Implemented and component-tested:** private expiry manifests, maximum 24-hour managed backup lifetime, maintenance cleanup before heartbeat, explicit restore API. Real host snapshots and out-of-directory copies remain external obligations.
- Supervisor tests mock subprocesses. They establish the control decisions, not actual Gunicorn/child/process-group behavior. The production Dockerfile and complete supervisor have not been executed by this reviewer.

### Rendered visual evidence inspected

Reviewer opened CI images `browser-qa/40.png`, `41.png`, `10.png`, and `35.png`: desktop homepage, full mobile homepage, desktop investigator overview, and full mobile form. Desktop hierarchy, whitespace, typography, form grouping and investigator summary are coherent and visually polished. Mobile cards and form fields stack without obvious clipping in the provided captures. Disclosure remains visible; the dashboard clearly distinguishes signals from conclusions.

The mobile homepage is long and puts a substantial illustration before the forms. Navigation and auxiliary labels are small; readability and task speed deserve real-user review. These are optimization opportunities, not demonstrated failed accessibility criteria. Screenshots cannot establish focus order, live announcements, screen-reader interaction or browser performance. No comparative competitor usability study has occurred.

Manager reports first CI candidate `3da6e9e63b9bd686724b23d9d2d77695d4fc382f`: application and offline isolation passed; browser **28/44** passed, with label-matching and canonical-slash causes corrected locally. Those are manager-reported aggregate results; the reviewer directly inspected the four images above, not the full CI transcript. Pending rerun must establish whether all scenarios pass before using that claim.

### Remaining actionable blockers

1. **Readiness covers event capacity only.** `wsgi.py` checks MAX_EVENTS but not MAX_USED_TOKENS or MAX_RATE_ROWS. Exhausting these can reject ordinary form work while readiness is 200. Check applicable persistent blocking capacities, document temporary rate-throttle semantics separately, and add regressions. Do not make all healthy traffic transiently unready merely because one client is rate-limited.
2. **Production process/container path lacks execution evidence.** Existing workflow runs app/function tests and an offline synthetic worker. It does not build/start the production image or actual supervisor/Gunicorn path. Exercise production startup, synthetic readiness, correct-host routing, persistence/restart and clean shutdown; inject stale heartbeat with a live maintenance process and confirm serving stops.
3. **Host-bound requirements remain:** real TLS/proxy identity, public access-log policy, encrypted/private persistent volume, alert delivery, host restart policy, external backup expiry and rollback. Configured strings and CI-local fixtures cannot certify those.
4. **Research validation remains:** controlled agent/task benchmark with actual permission conditions and denominators, plus investigator task interpretation. HTTP fixtures establish server outcomes, not general AI behavior.
5. **Online agent runtime remains disabled.** Offline isolation evidence must not be labeled safe remote-model egress. Either keep model workers disabled or independently verify the actual model-connected configuration and bounded transport.

### Ten-front evidence disposition, pending final CI

| Front | New support | Remaining acceptance work |
|---|---|---|
| Research validity | Protocol and explicit unknown authorization preserved | Execute controlled agent trial and investigator comprehension benchmark |
| Public UX | Rendered mobile/desktop flows; browser suite partially passed | Successful rerun, keyboard/no-JS/error task evidence |
| Visual design | Four actual captures independently reviewed positively | Review all final responsive/state captures; objective comparative critique |
| Accessibility/motion | Semantic design and automated axe/browser checks being exercised | Final rerun results; actual screen-reader task, focus/error announcements |
| Investigator usefulness | Actual desktop dashboard screenshot, existing filter/export/delete tests | Full final interaction suite and interpretation task |
| Data/provenance | Versioned policy, bounded counters, unknown identity | Verify all new capacity/partial-failure paths and output invariants |
| Privacy/retention | Managed expiry/restore and watchdog components now tested | Host logs, external snapshots, deletion reapplication on restore |
| Backend correctness/security | Session revocation, input/resource checks, new ops regressions | Final CI regression, production configuration/runtime coverage |
| Agent isolation/review | First offline isolation pass reported; manager-owned comparison | Inspect complete final offline result; model-connected egress remains separate |
| Operations/release | Supervised startup, heartbeat, restore and cleanup implemented/tested | Actual production process smoke, real host deployment and alert/rollback evidence |

**Disposition remains: development improvements accepted as evidence; public production approval withheld.** Final readiness must attach to a specific source manifest and completed verification run. Iteration count does not override an unmet acceptance gate.

### Subsequent verification update

The readiness-capacity gap above is now **resolved in inspected code and component tests**: `wsgi.py` checks live event, used-token and rate-reservation rows, and the global submission window, using the same expiry boundaries as request-time purge. Per-network blocked-row capacity is intentionally not a global-readiness gate. Reviewer reran operations tests: **21 passing executions**, again including inherited duplicates.

`tests/runtime/production_smoke.py` and a production-image CI job now exist. The script builds the actual Dockerfile, starts the production supervisor, submits synthetic data, reads authenticated evidence, restarts with persistent storage, and checks that the maintenance heartbeat advances without public requests. Its output explicitly disclaims actual TLS and live-host verification. This is meaningful runnable coverage, but its CI result remains pending in this review.

The first version of that smoke script does not insert an expired record, so heartbeat advancement alone proves periodic execution rather than actual deletion. It also force-removes the container during cleanup rather than checking graceful shutdown. Recommended acceptance additions: insert an expired synthetic fixture and verify removal, exercise normal stop, and stop the maintenance process without exiting it to verify the real watchdog kills serving. These are distinct from the mocked supervisor tests.

For research validity, implement a repeatable synthetic benchmark manifest with one row per issued task, including client/version, instruction, permission condition, request/no-request result, receipt, timestamps, expected state and actual outcome. Include no-attempt and indeterminate cases in the denominator, and label deterministic HTTP fixtures explicitly. Rephrase H1 as an empirical question about actual clients, rather than the tautology that an instruction-enforcing client enforces its instruction. Controlled general-purpose-agent behavior and investigator comprehension still require separate real trials; server fixtures alone cannot satisfy those gates.

### Deletion-ledger re-review

Reviewer inspected `deployment/deletion_ledger.py`, restore integration, maintenance and `app.py:erase_event`, and independently reran **30 passing operations test executions** (with inherited duplicates).

The new separate receipt-only ledger commits a tombstone before removing the event. No application write lock is held while obtaining the ledger lock, avoiding a cross-file lock-order cycle. Restore requires the matching ledger UUID from the backup manifest, replays tombstones, and clears admin sessions; failures remove the partial destination. Backup lifetime is capped at 24 hours and tombstone lifetime at 48 hours. Policy v4 discloses the minimal deletion journal. These are meaningful fixes for deleted-record resurrection under the documented recovery procedure.

Restore is an **offline operation**: all writers must remain stopped from before restore begins through DB-path switch and restart. Otherwise, a deletion committed after restore's ledger snapshot could be absent from the restored destination. The current runbook says keep the supervisor stopped throughout restore; strengthen the earlier wording to say stop before running restore, not merely before switching paths. Do not substitute a stale copy of the authoritative ledger; UUID equality alone cannot establish freshness. A lost ledger makes old backups unusable under the documented fail-closed process.

Useful final edge checks: missing ledger file, corrupt ledger/schema, concurrent duplicate/deletion writers, and app deletion preserving the event if ledger persistence fails. The latter app regression is already present in current source. Review final CI before treating these as executed evidence.

The new `tests/research/runner.py` was inspected. It emits all issued trials, expected and observed outcomes, receipts, blocked counters, package/source versions, denominators and explicit no-attempt/indeterminate cases. Its disclaimer correctly states that the permission guard is hard-coded and manual/assisted conditions are simulated. This can support deterministic server-outcome validation; it cannot establish AI comprehension or a human investigator's interpretation.
