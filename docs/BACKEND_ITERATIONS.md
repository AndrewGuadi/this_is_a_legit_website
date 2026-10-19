# Backend hardening iteration evidence

Date: 2026-10-19. Scope: application/backend tests; implementation performed directly, without external model execution. Results are local verification, not a production load-test or deployment certification.

## Iteration 1 — globally bounded collection and safe database failures

Added failing tests before implementation:

- `test_global_caps_fail_closed`: globally stop collection at an event ceiling, including distributed network addresses.
- `test_rate_and_counter_tables_are_bounded`: unique network addresses cannot grow rate/counter tables without limit.
- `test_database_failure_is_safe_and_recoverable`: database errors return a safe 503, never internal path/details.
- `test_production_config_fails_closed`: production configuration and untrusted Host rejection.

Observed red: `Ran 4 tests ... FAILED (failures=3, errors=1)`.

Implemented atomic resource checks, environment limits, connection cleanup, safe 503 responses, and production configuration validation. First green attempt discovered an additional real failure: Flask's URL adapter is unavailable when Host validation rejects a request, so rendering the normal error template crashed. Fixed that path with a minimal safe plain-text 400. Observed green: `Ran 22 tests ... OK`.

Defaults and operators' controls:

| Setting | Default | Behavior |
|---|---:|---|
| MAX_EVENTS | 100000 | Stops new collection instead of evicting retained evidence |
| MAX_USED_TOKENS | 100000 | Bounds replay nonce state; entries expire after 2 hours |
| MAX_RATE_ROWS | 50000 | Bounds admission state; entries expire after 1 hour |
| MAX_BLOCKED_ROWS | 10000 | Bounds network/minute counters; entries expire after 24 hours |
| GLOBAL_SUBMISSIONS_PER_MINUTE | 1000 | Global admission ceiling across networks |

Positive integer overrides up to 1,000,000 are accepted. Saturation returns 503 with `Retry-After: 60`; 60 seconds is a retry hint, not a promise that capacity will be restored then. At evidence capacity, an operator must remove data or await expiry. Capacity-blocked requests are not counted as observed submissions. Policy v3 explicitly says observations are not a complete traffic census.

Production requires `APP_ENV=production`, an HTTPS origin in `PUBLIC_URL`, an operator privacy contact, three distinct configured secrets, secure cookies, and DEBUG disabled. Accepted Hosts are restricted to that origin's hostname. Health probes/reverse proxies must supply the canonical Host. Network identity continues to ignore untrusted forwarded-address headers.

## Iteration 2 — revoke copied administrator sessions

Added `test_logout_revokes_copied_session_cookie` first. Observed red: `200 != 302`, proving a copied signed cookie still worked after logout.

Added server-side session digests with fixed 30-minute expiry and immediate logout deletion. Raw session identifiers are not stored in SQLite. The table has a 1,000-active-session ceiling; expired entries are purged. Browser cookies remain Secure, HttpOnly, SameSite=Strict. Added simultaneous multi-network event-cap test: 12 concurrent requests produce exactly four observations at a four-event ceiling; the other eight fail closed.

Observed green: `Ran 24 tests ... OK`.

## Iteration 3 — independent capacity boundary cases

Added direct coverage for distributed global admission, nonce exhaustion, and blocked-counter exhaustion separately, so a preceding rate limit cannot mask an unbounded table. Also routed service-unavailable HTTP errors through the safe recovery page.

Final observed run: `python -m unittest -q` → `Ran 26 tests in 1.579s ... OK` (23 application tests plus 3 orchestration tests at this checkpoint).

## Remaining deployment evidence

- Real HTTPS, reverse-proxy/body/connection limits, filesystem quotas and backup controls must be verified on the deployment host. Application row caps bound retained payload volume; they are not a substitute for edge protection against request/CPU saturation.
- Purge scheduling must run independently of traffic. Purge also happens during collection and investigator reads.
- Existing databases already larger than a new cap are not silently trimmed. New collection pauses; the operator must deliberately manage them.
- This work does not claim legal violation, operator identity, consent validity, or definitive bot classification from collected signals.

## Iteration 4 — deletion-safe restore integration

Added two regression tests before integration; both failed because no durable deletion helper was wired into the application. Both session-authenticated and bearer deletion now first commit a separate receipt-only tombstone journal, then delete the application record. Journal persistence failure returns safe 503 and leaves the observation intact. No application write lock is held while acquiring the separate journal lock. Unknown receipts remain idempotent and do not grow the journal.

Added assertions that the journal's deletion table contains only receipt/time and that eight concurrent deletion calls return 204 with exactly one tombstone. Operations owns journal durability, 48-hour retention, capacity, and backup/restore identity validation. Application policy v4 discloses this narrowly scoped 48-hour deletion journal.

Observed application/discovery run: `Ran 29 tests ... OK`. Re-executed the controlled HTTP benchmark after the policy/app change: 9/9 task traces matched. The result manifest contains the updated application digest and policy version.
