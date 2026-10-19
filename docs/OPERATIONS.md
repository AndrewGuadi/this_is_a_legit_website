# Deployment and recovery runbook

Status: prepared, not exercised on a live host. Do not call this production approved until the independent review gates pass.

## Configure and verify

Use a dedicated virtualenv and install requirements. Set independent SECRET_KEY, NETWORK_KEY and ADMIN_TOKEN through the hosting environment, not Git. Set PUBLIC_URL, PRIVACY_CONTACT and an absolute DB_PATH on persistent private storage. Run `python preflight.py`; a pass checks configuration shape only. Inspect the host's actual TLS, reverse-proxy trust and access-log retention. Do not enable Flask debugging.

Start the WSGI app with `from app import create_app; application = create_app()`. Use the host's WSGI service rather than the development server. Confirm HTTPS-only browser access and secure session cookies. Verify authentication, logout, filtered export and deletion with synthetic data before real traffic.

## Retention

Schedule `python -m flask --app app:create_app purge-events` daily under the same environment and persistent database. Verify its actual execution log, including after quiet periods. Apply the same retention window to backups, exports and host logs or disclose and justify differences. Application deletion cannot erase copies in exports or backups automatically.

## Backup and recovery

Use SQLite's online backup API rather than copying a live database file blindly. Encrypt/private-store backups, restrict operator access, record creation/expiry dates and delete expired copies. Before release, restore a synthetic backup into an isolated directory and run integrity_check and app smoke tests. Record the command, resulting counts, time and reviewer evidence. Do not restore production data into a developer/agent workspace.

## Rollback

Record the accepted commit and dependency versions. Back up safely before schema-changing releases; verify downgrade compatibility. To roll back code, deploy the prior approved commit using the host deployment mechanism and restart its WSGI workers. Do not automatically roll back the database: choose a compatible migration/restore plan based on verified data state. Test this on synthetic data before public release.

## Monitoring and incident handling

Monitor HTTP 5xx, authentication failures, database growth, retention-task failures, disk capacity and rate-limit frequency through host tooling without logging request bodies or credentials. Record alert destination and test delivery. On suspected unauthorized access, restrict public/admin access, preserve a minimal incident record under an explicit retention basis, rotate affected credentials, and investigate actual exposure. Do not upload evidence to external agents.

## Outstanding host evidence

Docker worker execution and egress controls, browser rendering/accessibility, live TLS/proxy identity, scheduled retention, backup restoration, and rollback remain unverified in this workspace. These are release blockers, not documentation-complete checkboxes.
