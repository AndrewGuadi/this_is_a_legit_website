# Deployment and recovery runbook

## Production launch

Set independent SECRET_KEY, NETWORK_KEY and ADMIN_TOKEN via host secrets, plus PUBLIC_URL, PRIVACY_CONTACT and an absolute DB_PATH on private persistent storage. Run `python preflight.py`. Start with `python -m deployment.start`; the nonroot container uses this supervisor. It runs a bounded initial purge before opening the listener, then maintains exactly two child services: Gunicorn and retention maintenance. Direct `create_app()` is a development/testing entrypoint and bypasses production preflight and readiness middleware. External WSGI hosts must use `wsgi:build_application()` and separately supervise required maintenance.

On SIGTERM/SIGINT, child exit or stale retention heartbeat, supervisor terminates both services. Startup purge has a 30-second limit; shutdown permits each child 10 seconds then kills and reaps it. Configure container termination grace at least 25 seconds. Host restart policy should restart failed service and alert after repeated failures. Public TLS, trusted proxy configuration, alert delivery and persistent storage must be verified on the actual host.

## Readiness and retention

`/healthz` returns 200 only when the database accepts a real write transaction (rolled back), unexpired event/token/rate rows and the global submission-minute counter are below their configured caps, and the retention heartbeat is fresh. It returns 503 on write locks/storage failures, full capacity or stale/missing heartbeat. Keep readiness out of public caching. PURGE_INTERVAL_SECONDS defaults to 900 and permits 30..3600. Freshness limit is twice that interval plus 60 seconds; supervisor checks every half-second. An expired heartbeat terminates the service, including when a maintenance process remains alive but hung. This endpoint intentionally tests readiness, not merely process liveness.

Maintenance purges expired records and managed backups before atomically updating heartbeat. Event retention follows configured application retention. Backup files can retain deleted records until their expiry; default/max backup lifetime is 24 hours, with deletion on the next successful maintenance cycle (up to one interval later in healthy operation). A stalled host cannot promise physical deletion; readiness fails and the supervisor stops serving after its heartbeat deadline. Host snapshots, external exports and logs are outside this mechanism and require separate deletion controls.

## Backup and recovery

Only use synthetic data in developer/agent workspaces. Store production backups in the dedicated `backups` directory next to DB_PATH. That directory must contain only managed backup copies: unknown or malformed manifest copies are deleted by maintenance, not retained indefinitely. Restrict storage to the service owner and encrypt the underlying host volume. The helper creates mode-0600 database and expiry manifest files:

```
python -m deployment.backup backup /private/events.sqlite3 /private/backups/checkpoint.sqlite3
python -m deployment.backup restore /private/backups/checkpoint.sqlite3 /private/restored.sqlite3 --ledger /private/deletion-ledger.sqlite3
```

Before running the restore command, stop ALL application, deletion and maintenance writers on every host using this database. Keep them stopped through restore and the DB_PATH/file switch, then restart. The CLI does not detect or enforce host quiescence; operator verification is mandatory to prevent a deletion racing between ledger replay and activation.

Destination must not exist. Restore requires an unexpired, valid manifest and clears every admin session before releasing the restored database. This prevents a backup from reviving sessions revoked since it was created; all administrators log in again. Stop the supervisor before switching DB_PATH to a restored file. Start normally so initial purge runs before traffic. Never use the backup action as a substitute for restore. Restore requires the current authoritative deletion-ledger.sqlite3, whose identity must match the backup manifest, and automatically removes every tombstoned receipt before returning. Missing, replaced or corrupt journals fail closed. Keep the supervisor stopped throughout restore; restart with the restored DB in the same private directory so future deletions use the same journal. Preserve this journal independently when moving storage, never replace it with a snapshot-era copy. If it is lost, discard old backups rather than restoring them; restart with an empty observations database and fresh journal. The journal retains receipt IDs and deletion times only for 48 hours (longer than the maximum 24-hour backup lifetime), capped at 200,000 receipts; deletion fails closed if durable recording is unavailable. Maintenance prunes expired receipts. App deletion records the durable tombstone before committing row removal; a crash in between can conservatively delete the row on recovery, never revive a confirmed deletion.

## Rollback and incident handling

Record approved code and dependency versions. Restore backups only with a verified schema-compatible recovery plan; rolling back code does not imply rolling back data. Before release, exercise restore, schema integrity, authentication rejection, retention, health failure/recovery and service restart against synthetic data. On suspected exposure, restrict access, rotate affected credentials, preserve a minimal authorized incident record, and investigate. Monitor readiness/5xx, storage capacity, failed authentication and failed maintenance without recording credentials or form bodies.

Local tests verify these code paths. Actual host TLS, external snapshot expiry, proxy identity, alert delivery and deployment rollback require host-specific evidence; they are not implied by unit-test success.
