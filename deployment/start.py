"""Single-instance supervisor: WSGI and required retention service fail together."""
import os
import signal
import subprocess
import sys
import time
from preflight import check


def main():
    issues=check(os.environ)
    if issues: raise SystemExit('\n'.join(issues))
    os.umask(0o077)
    # Purge/heartbeat before accepting traffic.
    subprocess.run([sys.executable,'-c','from app import create_app; from deployment.maintenance import purge_once; purge_once(create_app())'],check=True)
    port=int(os.environ.get('PORT','8000'))
    if not 1<=port<=65535: raise SystemExit('Invalid PORT')
    children=[]
    def stop(*_):
        for child in children:
            if child.poll() is None: child.terminate()
    signal.signal(signal.SIGTERM,stop); signal.signal(signal.SIGINT,stop)
    try:
        children.append(subprocess.Popen([sys.executable,'-m','deployment.maintenance']))
        children.append(subprocess.Popen([sys.executable,'-m','gunicorn','wsgi:build_application()',
            '--bind',f'0.0.0.0:{port}','--workers','2','--threads','2','--timeout','30','--limit-request-line','4094',
            '--limit-request-field_size','4094','--error-logfile','-']))
        while all(child.poll() is None for child in children): time.sleep(.5)
        return 1
    finally:
        stop()
        for child in children:
            try: child.wait(timeout=10)
            except subprocess.TimeoutExpired: child.kill(); child.wait()

if __name__=='__main__': raise SystemExit(main())
