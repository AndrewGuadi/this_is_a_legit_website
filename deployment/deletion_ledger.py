"""Authoritative receipt tombstones, separate from restorable observation snapshots."""
from contextlib import contextmanager
import os
import re
import sqlite3
import time
import uuid
from pathlib import Path

RETENTION_SECONDS=48*3600
MAX_RECEIPTS=200000


def default_ledger_path(db_path):
    return Path(db_path).resolve().parent/'deletion-ledger.sqlite3'


@contextmanager
def _connect(path, create=False):
    path=Path(path).resolve()
    if create:
        path.parent.mkdir(parents=True,exist_ok=True)
        fd=os.open(path,os.O_WRONLY|os.O_CREAT,0o600); os.close(fd)
    conn=sqlite3.connect(path.as_uri()+'?mode=rw',uri=True,timeout=5)
    try:
        conn.execute('PRAGMA synchronous=FULL')
        conn.execute('PRAGMA secure_delete=ON')
        with conn:
            yield conn
    finally:
        conn.close()


def initialize(path):
    with _connect(path,True) as conn:
        conn.execute('BEGIN IMMEDIATE')
        conn.execute('CREATE TABLE IF NOT EXISTS identity (id INTEGER PRIMARY KEY CHECK(id=1), uuid TEXT NOT NULL)')
        conn.execute('CREATE TABLE IF NOT EXISTS deletions (receipt TEXT PRIMARY KEY, at INTEGER NOT NULL)')
        conn.execute('INSERT OR IGNORE INTO identity VALUES (1,?)',(str(uuid.uuid4()),))
        identity=conn.execute('SELECT uuid FROM identity WHERE id=1').fetchone()[0]
    # Ensure newly created journal directory entry survives host crashes.
    fd=os.open(Path(path).resolve().parent,os.O_RDONLY)
    try: os.fsync(fd)
    finally: os.close(fd)
    return identity


def record_deletion(path,receipt):
    try:
        if not re.fullmatch(r'[0-9a-f]{32}',receipt): raise ValueError('Invalid deletion receipt')
        initialize(path)
        with _connect(path) as conn:
            conn.execute('BEGIN IMMEDIATE')
            conn.execute('DELETE FROM deletions WHERE at < ?',(int(time.time())-RETENTION_SECONDS,))
            existing=conn.execute('SELECT 1 FROM deletions WHERE receipt=?',(receipt,)).fetchone()
            if not existing and conn.execute('SELECT count(*) FROM deletions').fetchone()[0]>=MAX_RECEIPTS:
                raise ValueError('Deletion ledger capacity reached')
            conn.execute('INSERT OR REPLACE INTO deletions VALUES (?,?)',(receipt,int(time.time())))
    except (sqlite3.Error,ValueError) as exc:
        raise OSError('Deletion ledger unavailable') from exc


def apply_deletions(conn,path,expected_identity):
    # Read existing authoritative journal only; missing/corrupt files fail closed.
    with _connect(path) as ledger:
        if ledger.execute('SELECT uuid FROM identity WHERE id=1').fetchone()[0]!=expected_identity:
            raise ValueError('Wrong authoritative deletion ledger')
        for receipt, in ledger.execute('SELECT receipt FROM deletions'):
            conn.execute('DELETE FROM events WHERE id=?',(receipt,))


def purge_ledger(path):
    if not Path(path).exists(): return
    with _connect(path) as conn:
        conn.execute('DELETE FROM deletions WHERE at < ?',(int(time.time())-RETENTION_SECONDS,))
