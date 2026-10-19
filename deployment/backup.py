"""Explicit SQLite online backup/restore operations, no production data export by default."""
import argparse
import os
import sqlite3
from pathlib import Path


def backup(source, destination):
    source=Path(source).resolve(); destination=Path(destination).resolve()
    if source==destination or destination.exists():
        raise ValueError('Destination must be new and different from source')
    if not source.is_file():
        raise ValueError('Source database does not exist')
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

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Create a new private backup or restore into a new destination. Never overwrites an existing DB.')
    parser.add_argument('source'); parser.add_argument('destination')
    args=parser.parse_args(); backup(args.source,args.destination)
    print('Private database copy created and integrity verified. Apply documented retention to this copy.')
