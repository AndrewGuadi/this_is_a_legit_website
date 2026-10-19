"""Periodic purge with atomic heartbeat; run with the same environment as WSGI."""
import json
import os
import time
from pathlib import Path
from app import create_app
from deployment.backup import purge_expired
from deployment.deletion_ledger import default_ledger_path, purge_ledger


def interval_seconds():
    interval=int(os.environ.get("PURGE_INTERVAL_SECONDS","900"))
    if not 30<=interval<=3600: raise ValueError("PURGE_INTERVAL_SECONDS must be 30..3600")
    return interval


def heartbeat_fresh(db_path):
    try:
        stamp=json.loads((Path(db_path).parent/"retention-heartbeat.json").read_text())["last_success"]
        return 0<=time.time()-stamp<=2*interval_seconds()+60
    except (OSError,ValueError,KeyError,TypeError): return False


def purge_once(app):
    result = app.test_cli_runner().invoke(args=['purge-events'])
    if result.exit_code:
        raise RuntimeError('Retention task failed')
    purge_expired(Path(app.config['DB_PATH']).parent/'backups')
    purge_ledger(default_ledger_path(app.config['DB_PATH']))
    heartbeat=Path(app.config['DB_PATH']).parent/'retention-heartbeat.json'
    pending=heartbeat.with_suffix('.tmp')
    pending.write_text(json.dumps({'last_success':time.time()}))
    pending.replace(heartbeat)


def main():
    app=create_app()
    interval=interval_seconds()
    while True:
        purge_once(app)
        time.sleep(interval)

if __name__=='__main__': main()
