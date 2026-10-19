"""Production WSGI entrypoint with health checks and fail-closed preflight."""
import json
import os
import sqlite3
import time
from pathlib import Path
from app import create_app
from preflight import check


class HealthMiddleware:
    def __init__(self, app): self.app=app
    def __call__(self,environ,start_response):
        if environ.get('PATH_INFO')!='/healthz':
            return self.app(environ,start_response)
        okay=False
        try:
            with sqlite3.connect(Path(self.app.config['DB_PATH']).resolve().as_uri()+'?mode=ro',uri=True,timeout=2) as conn:
                conn.execute('SELECT 1 FROM events LIMIT 1').fetchall()
            heartbeat=Path(self.app.config['DB_PATH']).parent/'retention-heartbeat.json'
            age=time.time()-json.loads(heartbeat.read_text())['last_success']
            okay=0<=age<=3600
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
