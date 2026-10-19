"""Private online copies with bounded expiry and explicit session-revoking restore."""
import argparse
import json
import os
import sqlite3
import time
from pathlib import Path
from deployment.deletion_ledger import initialize, default_ledger_path, apply_deletions


def manifest_path(path):
    return Path(str(path)+'.manifest.json')


def _copy(source, destination):
    source=Path(source).resolve(); destination=Path(destination).resolve()
    if source==destination or destination.exists() or manifest_path(destination).exists():
        raise ValueError('Destination must be new and different from source')
    if not source.is_file(): raise ValueError('Source database does not exist')
    destination.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(destination,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600); os.close(fd)
    try:
        with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as src, sqlite3.connect(destination) as dest:
            src.backup(dest)
            if dest.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
                raise RuntimeError('Backup integrity check failed')
    except BaseException:
        destination.unlink(missing_ok=True)
        raise
    return destination


def backup(source, destination, retention_seconds=86400):
    if not 1<=retention_seconds<=86400: raise ValueError('Backup retention must be 1..86400 seconds')
    ledger_id=initialize(default_ledger_path(source))
    dest=_copy(source,destination)
    try:
        now=time.time()
        with os.fdopen(os.open(manifest_path(dest),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as stream:
            json.dump({'version':1,'created_at':now,'expires_at':now+retention_seconds,'ledger_id':ledger_id},stream)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise


def _expiry(source):
    data=json.loads(manifest_path(source).read_text())
    created=float(data['created_at']); expires=float(data['expires_at'])
    if data['version']!=1 or not 0<expires-created<=86400 or created>time.time():
        raise ValueError('Invalid backup manifest')
    return expires


def restore(source,destination,ledger_path=None):
    if ledger_path is None: raise ValueError("Current authoritative ledger_path is required")
    if _expiry(source)<=time.time(): raise ValueError('Backup has expired')
    dest=_copy(source,destination)
    try:
        with sqlite3.connect(dest) as conn:
            conn.execute('DELETE FROM admin_sessions')
            identity=json.loads(manifest_path(source).read_text())['ledger_id']
            apply_deletions(conn,ledger_path,identity)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise


def purge_expired(directory):
    """Only the dedicated backup directory is managed. Unknown/corrupt copies fail closed."""
    directory=Path(directory)
    if not directory.exists(): return
    for source in directory.iterdir():
        if not source.is_file() or source.name.endswith('.manifest.json'): continue
        try: expired=_expiry(source)<=time.time()
        except (OSError,ValueError,KeyError,TypeError): expired=True
        if expired:
            source.unlink(missing_ok=True)
            manifest_path(source).unlink(missing_ok=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Private expiring backup or session-revoking restore into a new destination')
    parser.add_argument('action',choices=['backup','restore']); parser.add_argument('source'); parser.add_argument('destination')
    parser.add_argument('--ledger',help='Required current authoritative deletion ledger for restore')
    args=parser.parse_args()
    if args.action=='restore': restore(args.source,args.destination,ledger_path=args.ledger)
    else: backup(args.source,args.destination)
    print('Operation complete; database integrity verified.')
