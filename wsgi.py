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
                capacity=conn.execute('SELECT count(*) FROM events').fetchone()[0]<self.app.config['MAX_EVENTS']
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
