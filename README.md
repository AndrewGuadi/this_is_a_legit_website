# This Is a Legit Website

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

Start local development with `flask --app app:create_app run`. For PythonAnywhere, install dependencies into the site's virtualenv, configure the environment before importing the application, and use `application = create_app()` in its WSGI entrypoint. Do not use Flask's development server in production. Keep the database on persistent local storage; this is a single-instance prototype, not a multi-node service.

## Evidence

`GET /admin/events` returns up to 1,000 most recent events with `Authorization: Bearer <ADMIN_TOKEN>`. `DELETE /admin/events/<receipt>` removes an event using the same authentication. No browser-accessible public dashboard exists. The export includes timestamps, receipt IDs, network HMACs, limited user-agent strings, form identifiers, terms version/hash, checkbox state, field lengths, timing, declared automation, and whether the honeypot was filled. Submitted names, email addresses, message text, raw IPs, URL query parameters, and referrers are not persisted by this app. Headers are untrusted client claims; they are not identity proof.

Missing/expired tokens, replayed tokens, and missing acceptance are recorded as rejected attempts, not accepted applications. Receipt text says what occurred. Hidden-field and fast-submission signals are not conclusive bot detection. Assisting technology and password managers may produce unusual behavior too. No finding is automatically labeled a legal violation.

Public pages are allowed in robots.txt. Automated form submissions require prior written permission under the posted terms. Indexing is not submission permission. There are no secret Google-only disclosures or user-agent cloaking rules. Google discovery/indexing is not guaranteed; submit the sitemap through Search Console after the domain is live.

## Retention and launch checklist

- Set the real privacy contact, PUBLIC_URL, secrets and persistent DB path before public launch.
- Term text is an operational draft, not a determination of enforceability. Review the intended collection and consent basis before using records for claims against operators. Checkbox acceptance does not establish agency or identity.
- Configure HTTPS and hosting access-log retention. Hosting logs may contain raw IP addresses independently of this app.
- Schedule `flask --app app:create_app purge-events` daily in PythonAnywhere Tasks. Records older than 30 days are also removed during submissions and export. Include backups in the same retention/deletion policy; the application cannot erase host backups.
- The code intentionally ignores untrusted forwarding headers. Verify `REMOTE_ADDR` on the chosen host. If it is a shared reverse proxy, network identifiers/rate limits will group visitors until a host-specific trusted-proxy configuration is implemented. Do not blindly trust X-Forwarded-For.
- The basic limit is 30 recorded attempts per observed network per minute; concurrent requests can race. Configure an edge/body/rate limit for hostile traffic and protect admin routes there as well. This prototype is not a DDoS sink.
- Export is limited to 1,000 recent records; use controlled database tooling for larger investigations. Store exports privately and apply the same retention policy.
- Change the immutable policy version whenever the policy changes and preserve prior policy text in Git history. Current records retain its digest.
- No advertising identifiers, invasive fingerprinting, third-party tracking, outbound emails, uploaded documents, or visitor-controlled remote requests are implemented.

## Verification

`python -m unittest -v` checks consent rejection, token replay protection, metadata minimization, evidence authorization, deletion, expiry cleanup, and sitemap behavior. Browser layout QA and production hosting are not yet verified. This implementation was authored directly in this session; OpenCode was not used.
