"""Periodic purge with atomic heartbeat; run with the same environment as WSGI."""
import json
import os
import time
from pathlib import Path
from app import create_app


def purge_once(app):
    result = app.test_cli_runner().invoke(args=['purge-events'])
    if result.exit_code:
        raise RuntimeError('Retention task failed')
    heartbeat=Path(app.config['DB_PATH']).parent/'retention-heartbeat.json'
    pending=heartbeat.with_suffix('.tmp')
    pending.write_text(json.dumps({'last_success':time.time()}))
    pending.replace(heartbeat)


def main():
    app=create_app()
    interval=int(os.environ.get('PURGE_INTERVAL_SECONDS','900'))
    if not 30<=interval<=3600:
        raise SystemExit('PURGE_INTERVAL_SECONDS must be 30..3600')
    while True:
        purge_once(app)
        time.sleep(interval)

if __name__=='__main__': main()
