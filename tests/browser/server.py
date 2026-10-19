"""Loopback-only browser fixture. Never deploy this synthetic test server."""
import atexit
import json
from pathlib import Path
import secrets
import sqlite3
import sys
import tempfile
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app import create_app, VERSION, POLICY_HASH

fixture = tempfile.TemporaryDirectory(prefix="legit-browser-fixture-")
atexit.register(fixture.cleanup)
database = str(Path(fixture.name) / "synthetic.sqlite3")
app = create_app({
    "SECRET_KEY": secrets.token_hex(32),
    "NETWORK_KEY": secrets.token_hex(32),
    "ADMIN_TOKEN": "browser-fixture-only-" + "x" * 40,
    "DB_PATH": database,
    "CONTACT": "privacy@example.com",
    "PUBLIC_URL": "http://127.0.0.1:5081",
    "SESSION_COOKIE_SECURE": False,
})
# Seed all dashboard states without consuming public submission rate limits.
with sqlite3.connect(database) as conn:
    for index in range(55):
        event = dict(schema_version=1, authorization_status="not_verified", form="directory",
                     outcome="recorded", terms_version=VERSION, terms_sha256=POLICY_HASH,
                     user_agent="Synthetic browser fixture", consent_asserted=True,
                     automation_declared="human", honeypot_filled=False,
                     field_lengths={"name": 14, "email": 0, "message": 20}, elapsed_seconds=12.0)
        conn.execute("INSERT INTO events VALUES (?,?,?,?)", (
            f"{index+1:032x}", int(time.time())-index, "a"*64, json.dumps(event)))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5081, debug=False, use_reloader=False)
