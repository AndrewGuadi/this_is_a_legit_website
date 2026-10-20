# Legit Arcade

An arcade with **Neon Breaker**, a playable original three-stage brick breaker, seven future game concepts, and a secondary form-research area. Neon Breaker is a review candidate; final release requires independent TODD review and physical-device evidence. The homepage is `/`, concepts live at `/games/<slug>`, and the preserved forms are at `/forms` and `/apply/<kind>`. The investigator workspace remains `/admin/login`.

Game status is tracked in `game_catalog.py`; see [game roadmap](docs/GAME_ROADMAP.md) and [first-game brief](docs/FIRST_GAME_BRIEF.md). Catalog visits do not create observation records. Neon Breaker uses native Canvas and local modules, with no game telemetry or third-party requests. Optional best-score storage stays on the device.


A Flask/SQLite form-observation prototype for Authentic Dynamics LLC. Public, crawlable pages and three conventional application flows collect bounded first-party metadata. All clients receive the same research disclosure: this is not an actual job, grant, directory-placement, or service offer.

## Run

Use Python 3.11+ and `pip install -r requirements.txt`. Configure the following outside source control, with three independent randomly generated secrets of at least 32 characters:

- `SECRET_KEY`: form-token signing key.
- `NETWORK_KEY`: HMAC key for network pseudonyms; keep separate from the database.
- `ADMIN_TOKEN`: bearer secret for evidence access.
- `DB_PATH`: absolute persistent SQLite file path, outside the publicly served directory.
- `PUBLIC_URL`: actual HTTPS origin, without trailing slash, for the sitemap.
- `PRIVACY_CONTACT`: monitored operator email/address for privacy requests.

Generate secrets with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and store them in the hosting environment. Do not paste them into GitHub.

Start local development with `flask --app app:create_app run`. For production, build the Dockerfile and run its `deployment.start` supervisor with persistent `/data` storage and the required environment. This starts Gunicorn, scheduled retention, and a watchdog. See [operations](docs/OPERATIONS.md) for configuration, readiness, backup, restore and host validation. Use a single application instance with local persistent SQLite storage.

## Neon Breaker

Open `/games/neon-breaker` on the running app. Arrow keys or A/D move, Space launches, and P/Escape pauses while the game field is focused. Mouse movement and the touch drag strip also control the paddle. Sound starts off. A tab change or resize pauses play; use Resume to continue.

Run `npm run test:game` for deterministic simulation checks and `npm run test:browser` for browser, touch-emulation and accessibility checks (install dependencies with `npm ci` and `npx playwright install chromium`). Use the project Python environment so the browser fixture can import Flask. For a local synthetic preview without production data, run `python tests/browser/server.py` and open `http://127.0.0.1:5081/games/neon-breaker`. Never deploy that fixture server.

The owner authorized direct Codex implementation with a separate local TODD reviewer on 2026-10-20. See [implementation contract](docs/neon-breaker-contract.md). Browser emulation does not establish physical-phone performance.

## Evidence

`GET /admin/events` returns up to 1,000 most recent events with `Authorization: Bearer <ADMIN_TOKEN>`. `DELETE /admin/events/<receipt>` removes an event using the same authentication. A private investigator interface is available at `/admin/login`. Sign in with the operator credential; session cookies are Secure, HttpOnly and SameSite=Strict with 30-minute lifetime. Use HTTPS. The dashboard supports form/outcome/UTC-date filtering, 25-record pages, event detail, filtered export and CSRF-protected deletion. The export includes timestamps, receipt IDs, network HMACs, limited user-agent strings, form identifiers, terms version/hash, checkbox state, field lengths, timing, declared automation, and whether the honeypot was filled. Submitted names, email addresses, message text, raw IPs, URL query parameters, and referrers are not persisted by this app. Headers are untrusted client claims; they are not identity proof.

Missing/expired tokens, replayed tokens, and missing acceptance are recorded as rejected attempts, not accepted applications. Receipt text says what occurred. Hidden-field and fast-submission signals are not conclusive bot detection. Assisting technology and password managers may produce unusual behavior too. No finding is automatically labeled a legal violation.

Public pages are allowed in robots.txt. Automated form submissions require prior written permission under the posted terms. Indexing is not submission permission. There are no secret Google-only disclosures or user-agent cloaking rules. Google discovery/indexing is not guaranteed; submit the sitemap through Search Console after the domain is live.

## Retention and launch checklist

- Set the real privacy contact, PUBLIC_URL, secrets and persistent DB path before public launch.
- Term text is an operational draft, not a determination of enforceability. Review the intended collection and consent basis before using records for claims against operators. Checkbox acceptance does not establish agency or identity.
- Configure HTTPS and hosting access-log retention. Hosting logs may contain raw IP addresses independently of this app.
- The production supervisor runs scheduled retention independently of requests. Managed backups become non-restorable after at most 24 hours; physical removal follows on the next successful maintenance cycle; explicit restore revokes administrator sessions. Host snapshots and investigator exports require separate deletion controls.
- The code intentionally ignores untrusted forwarding headers. Verify `REMOTE_ADDR` on the chosen host. If it is a shared reverse proxy, network identifiers/rate limits will group visitors until a host-specific trusted-proxy configuration is implemented. Do not blindly trust X-Forwarded-For.
- The submission reservation limit is 30 attempts per observed network per minute, serialized with a SQLite write transaction. Login has a separate five-attempt/15-minute network bucket. Configure an edge/body/rate limit for hostile traffic and protect admin routes there as well. This prototype is not a DDoS sink.
- Bearer export is limited to 1,000 recent records. Session-authenticated filtered export is also capped at 1,000; X-Export-Total and X-Export-Truncated headers indicate matched count and truncation. Use narrower date filters or controlled database tooling for larger investigations. Store exports privately and apply the same retention policy.
- Change the immutable policy version whenever the policy changes and preserve prior policy text in Git history. Current records retain its digest.
- No advertising identifiers, invasive fingerprinting, third-party tracking, outbound emails, uploaded documents, or visitor-controlled remote requests are implemented.

## Verification

`python -m unittest -v` checks form rejection/recovery, replay protection, minimization, session/CSRF controls, login throttling, concurrency, filtering, bounded export, deletion, expiry, sitemap and configuration preflight. Run `python -m unittest discover -s orchestration -p 'test_*.py' -v` separately for offline candidate-review tests. GitHub Actions also executes browser/accessibility scenarios and isolated Docker runtime checks. Live hosting remains a separate launch gate; see the production review for current evidence. This implementation was authored directly in this session; OpenCode was not used.

## Quality gate

See docs/QUALITY_SCORECARD.md for ten independent fronts, each requiring 85/100; passing unit tests alone does not satisfy release approval. docs/RESEARCH_PROTOCOL.md defines the controlled study and attribution limits. docs/OPERATIONS.md documents host verification and recovery. The OpenCode execution path is disabled pending verified isolation/egress; offline candidate comparison is implemented.

### Rate-limit accounting (policy 2026-10-19-v4)

Requests blocked by the submission limit increment a bounded aggregate row per observed network HMAC/minute, excluded from investigator reads after 24 hours. The dashboard shows this global count separately from its filtered event records; it is not a visitor denominator or proof of identity. Aggregates contain counts, timestamps and network HMAC only, no form bodies. Ordinary observation records expire from investigator reads after 30 days. Physical cleanup follows on the next successful maintenance cycle.

### Retention timing — policy 2026-10-19-v5

The supported production supervisor purges before serving traffic, then runs cleanup every 15 minutes by default (`PURGE_INTERVAL_SECONDS`, 30–3600 seconds). Investigator reads purge expired 30-day events and 24-hour aggregate counts before returning results. Receipt/time-only deletion-journal entries become eligible for cleanup at 48 hours. Managed backups cannot be restored after their configured expiry (maximum 24 hours), and expired backup files are removed on the next successful cleanup cycle. Downtime or maintenance failure delays physical cleanup; the supervisor's watchdog fails closed when retention health is stale. These are logical database/file deletions, not guaranteed forensic storage erasure. External exports, host snapshots, and provider logs require separate controls and are outside automatic application cleanup.



#To Run
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export NETWORK_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ADMIN_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export DB_PATH="$PWD/instance/events.sqlite3"
export APP_ENV=development

flask --app app:create_app run --host=0.0.0.0 --port=8000
