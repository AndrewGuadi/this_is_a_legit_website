"""Production WSGI entrypoint with health checks and fail-closed preflight."""
import json
import os
import sqlite3
import time
from pathlib import Path
from app import create_app
from preflight import check
from deployment.maintenance import heartbeat_fresh


class HealthMiddleware:
    def __init__(self, app): self.app=app
    def __call__(self,environ,start_response):
        if environ.get('PATH_INFO')!='/healthz':
            return self.app(environ,start_response)
        okay=False
        try:
            with sqlite3.connect(Path(self.app.config['DB_PATH']).resolve().as_uri()+'?mode=rw',uri=True,timeout=2) as conn:
                conn.execute('BEGIN IMMEDIATE')
                conn.execute('CREATE TABLE IF NOT EXISTS readiness_probe (value INTEGER)')
                conn.execute('INSERT INTO readiness_probe VALUES (1)')
                now=int(time.time())
                # Match rows remaining after request-time purge; expired rows do not
                # block readiness while waiting for the periodic maintenance tick.
                limits=(('events','MAX_EVENTS',30*86400),
                        ('used_tokens','MAX_USED_TOKENS',7200),
                        ('rate_limits','MAX_RATE_ROWS',3600))
                capacity=all(conn.execute(f'SELECT count(*) FROM {table} WHERE at >= ?',
                    (now-lifetime,)).fetchone()[0]<self.app.config[key]
                    for table,key,lifetime in limits)
                global_count=conn.execute("SELECT count(*) FROM rate_limits WHERE bucket LIKE 'submit:%' AND at>?",(now-60,)).fetchone()[0]
                capacity=capacity and global_count<self.app.config['GLOBAL_SUBMISSIONS_PER_MINUTE']
                conn.rollback()
            okay=capacity and heartbeat_fresh(self.app.config['DB_PATH'])
        except (OSError,ValueError,KeyError,sqlite3.Error,TypeError):
            pass
        body=b'{"status":"ok"}' if okay else b'{"status":"unavailable"}'
        start_response('200 OK' if okay else '503 Service Unavailable',[('Content-Type','application/json'),('Cache-Control','no-store'),('Content-Length',str(len(body)))])
        return [body]


def build_application():
    problems=check(os.environ)
    if problems:
        raise RuntimeError('Production preflight failed: '+' '.join(problems))
    return HealthMiddleware(create_app({'APP_ENV':'production'}))
