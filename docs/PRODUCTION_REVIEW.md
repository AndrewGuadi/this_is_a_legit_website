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
