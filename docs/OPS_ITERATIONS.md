# Operations hardening iterations

1. Added regression tests for restored revoked sessions, expired backup restore, full event capacity readiness and interval-dependent heartbeat. All four failed against the baseline (two failures and two missing APIs).
2. Added explicit restore that clears admin_sessions, private expiry manifests and a 24-hour maximum copy lifetime; restore rejects expired copies.
3. Connected managed backup expiry to each maintenance cycle before heartbeat; invalid manifests fail closed in the dedicated directory.
4. Readiness now probes an actual writable transaction and rolls it back, checks event capacity and uses interval-related heartbeat limits.
5. Supervisor registers signal handling before startup purge, tracks/reaps that child, caps initial purge at 30 seconds and enforces hung-maintenance watchdog shutdown. Unit tests simulate timeout/kill/reap and stale-live-child cases.
6. Added regression checks for probe rollback and maintenance-driven backup expiry; updated runbook to require production wrapper and supervisor.

Validation: `python -m unittest discover -s tests/operations -q`. Synthetic-only fixtures. Actual runtime/host fault tests remain distinct from these unit tests.
