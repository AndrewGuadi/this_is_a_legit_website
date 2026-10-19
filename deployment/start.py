"""Single-instance supervisor: WSGI and required retention service fail together."""
import os
import signal
import subprocess
import sys
import time
from preflight import check
from deployment.maintenance import heartbeat_fresh


def main():
    issues=check(os.environ)
    if issues: raise SystemExit('\n'.join(issues))
    os.umask(0o077)
    port=int(os.environ.get('PORT','8000'))
    if not 1<=port<=65535: raise SystemExit('Invalid PORT')
    children=[]
    stopping=False
    def stop(*_):
        nonlocal stopping
        stopping=True
        for child in children:
            if child.poll() is None: child.terminate()
    signal.signal(signal.SIGTERM,stop); signal.signal(signal.SIGINT,stop)
    try:
        # Register shutdown first; the tracked startup child has a bounded lifetime.
        startup=subprocess.Popen([sys.executable,'-c','from app import create_app; from deployment.maintenance import purge_once; purge_once(create_app())'])
        children.append(startup)
        try:
            if startup.wait(timeout=30)!=0: return 0 if stopping else 1
        except subprocess.TimeoutExpired:
            return 1
        if stopping: return 0
        children.clear()
        children.append(subprocess.Popen([sys.executable,'-m','deployment.maintenance']))
        children.append(subprocess.Popen([sys.executable,'-m','gunicorn','wsgi:build_application()',
            '--bind',f'0.0.0.0:{port}','--workers','2','--threads','2','--timeout','30','--limit-request-line','4094',
            '--limit-request-field_size','4094','--error-logfile','-']))
        while not stopping and all(child.poll() is None for child in children):
            if not heartbeat_fresh(os.environ["DB_PATH"]): break
            time.sleep(.5)
        return 0 if stopping else 1
    finally:
        stop()
        for child in children:
            try: child.wait(timeout=10)
            except subprocess.TimeoutExpired: child.kill(); child.wait()

if __name__=='__main__': raise SystemExit(main())
