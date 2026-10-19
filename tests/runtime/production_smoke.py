"""Exercise production readiness, retention, persistence and shutdown with synthetic data."""
import json
import os
import re
import secrets
import selectors
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def run(*args, **kwargs):
    return subprocess.run(list(args),check=True,timeout=kwargs.pop('timeout',180),**kwargs)


def bounded_diagnostic(command, limit=32768):
    process=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    selector=selectors.DefaultSelector();selector.register(process.stdout,selectors.EVENT_READ)
    data=bytearray(); deadline=time.monotonic()+10
    try:
        while len(data)<limit:
            remaining=deadline-time.monotonic()
            if remaining<=0 or not selector.select(remaining):break
            chunk=os.read(process.stdout.fileno(),min(4096,limit-len(data)))
            if not chunk:break
            data.extend(chunk)
        return data.decode('utf-8',errors='replace')
    finally:
        selector.close();process.stdout.close()
        if process.poll() is None:process.kill()
        process.wait(timeout=5)


def main():
    name='legit-production-'+secrets.token_hex(5); tag=name+':test'; volume=name+'-data'
    key=secrets.token_urlsafe(48); secret_key=secrets.token_urlsafe(48); network_key=secrets.token_urlsafe(48); output=Path('production-evidence');output.mkdir(exist_ok=True)
    created=False
    try:
        run('docker','build','-t',tag,'.',timeout=600)
        run('docker','volume','create',volume,stdout=subprocess.DEVNULL)
        run('docker','create','--name',name,'--cap-drop=ALL','--security-opt=no-new-privileges',
            '--memory=512m','--pids-limit=128','--cpus=2','--read-only','--tmpfs','/tmp:rw,size=64m',
            '--mount',f'type=volume,source={volume},target=/data',
            '-p','127.0.0.1::8000','-e','ADMIN_TOKEN='+key,'-e','SECRET_KEY='+secret_key,
            '-e','NETWORK_KEY='+network_key,'-e','PUBLIC_URL=https://study.example',
            '-e','PRIVACY_CONTACT=synthetic@example.com','-e','PURGE_INTERVAL_SECONDS=30',tag,stdout=subprocess.DEVNULL)
        created=True
        run('docker','start',name,stdout=subprocess.DEVNULL)
        base=''
        def refresh_address():
            nonlocal base
            address=subprocess.check_output(['docker','port',name,'8000/tcp'],text=True,timeout=10).strip()
            base='http://'+address
        refresh_address()
        def request(path,data=None,bearer=False):
            headers={'Host':'study.example'}
            if bearer: headers['Authorization']='Bearer '+key
            payload=urllib.parse.urlencode(data).encode() if data is not None else None
            return urllib.request.urlopen(urllib.request.Request(base+path,data=payload,headers=headers),timeout=5)
        def ready():
            for _ in range(45):
                try:
                    with request('/healthz') as response:
                        if response.status==200:return
                except (OSError,urllib.error.HTTPError):pass
                time.sleep(1)
            raise RuntimeError('Production readiness did not become healthy')
        ready()
        with request('/apply/contact') as response: html=response.read().decode()
        token=re.search(r'name="token" value="([^"]+)"',html).group(1)
        with request('/apply/contact',dict(token=token,name='Synthetic test',message='Fixture only',automation='human',consent='yes')) as response:
            assert response.status==200
        with request('/admin/events',bearer=True) as response: rows=json.load(response)
        assert len(rows)==1; receipt=rows[0]['receipt']
        run('docker','restart',name,stdout=subprocess.DEVNULL)
        # Docker may reassign an ephemeral host port on restart.
        refresh_address()
        ready()
        with request('/admin/events',bearer=True) as response: restarted=json.load(response)
        assert restarted[0]['receipt']==receipt
        # Insert an explicitly expired synthetic row directly; avoid any HTTP
        # request until the periodic service proves removal on its own.
        def container_python(code):
            return subprocess.check_output(['docker','exec',name,'python','-c',code],text=True,timeout=10)
        stale_id='synthetic-expired-retention-fixture'
        container_python("import os,sqlite3,time,json; db=sqlite3.connect(os.environ['DB_PATH']); "
            "db.execute('INSERT INTO events VALUES (?,?,?,?)', "
            "('synthetic-expired-retention-fixture',int(time.time())-400*86400,'synthetic',json.dumps({'fixture':True}))); db.commit()")
        first_time=json.loads(container_python("from pathlib import Path; print(Path('/data/retention-heartbeat.json').read_text())"))['last_success']
        purge_deadline=time.monotonic()+65
        while True:
            state=json.loads(container_python("import os,sqlite3,json; from pathlib import Path; "
                "db=sqlite3.connect(os.environ['DB_PATH']); "
                "print(json.dumps({'ids':[r[0] for r in db.execute('SELECT id FROM events')], "
                "'heartbeat':json.loads(Path('/data/retention-heartbeat.json').read_text())['last_success']}))"))
            if stale_id not in state['ids'] and state['heartbeat']>first_time:
                assert receipt in state['ids'], 'Retention removed an unexpired event'
                break
            if time.monotonic()>purge_deadline:
                raise AssertionError('Periodic retention failed to remove expired fixture')
            time.sleep(2)
        def container_state():
            return json.loads(subprocess.check_output(['docker','inspect',name,'--format','{{json .State}}'],text=True,timeout=10))
        # Normal SIGTERM must stop the supervisor and children cleanly, rather
        # than Docker having to SIGKILL the container after its grace period.
        run('docker','stop','--time=25',name,stdout=subprocess.DEVNULL,timeout=35)
        stopped=container_state()
        assert not stopped['Running'] and stopped['Pid']==0
        assert stopped['ExitCode']==0 and not stopped['OOMKilled'], stopped
        run('docker','start',name,stdout=subprocess.DEVNULL)
        refresh_address()
        ready()
        # A live-but-stuck maintenance child must trip heartbeat supervision.
        # SIGSTOP is synthetic fault injection, not a change to production code.
        hung=json.loads(container_python("import os,signal,json; from pathlib import Path; "
            "pids=[int(p.name) for p in Path('/proc').iterdir() if p.name.isdigit() "
            "and (p/'cmdline').exists() and (p/'cmdline').read_bytes().split(bytes([0]))[1:3] == [b'-m',b'deployment.maintenance']]; "
            "assert len(pids)==1, pids; os.kill(pids[0],signal.SIGSTOP); "
            "print(json.dumps({'pid':pids[0]}))"))
        watchdog_start=time.monotonic()
        watchdog_deadline=watchdog_start+150
        while True:
            failed=container_state()
            if not failed['Running']:
                break
            if time.monotonic()>watchdog_deadline:
                raise AssertionError('Hung maintenance was not stopped by heartbeat watchdog')
            time.sleep(2)
        assert failed['Pid']==0 and failed['ExitCode']!=0 and not failed['OOMKilled'], failed
        watchdog_seconds=round(time.monotonic()-watchdog_start,2)
        image_id=subprocess.check_output(['docker','image','inspect',tag,'--format','{{.Id}}'],text=True,timeout=10).strip()
        (output/'result.json').write_text(json.dumps(dict(commit=os.environ.get('GITHUB_SHA'),image=image_id,
            synthetic_only=True,startup=True,readiness=True,persistence_after_restart=True,
            periodic_retention_without_requests=True,expired_fixture_deleted=True,fresh_fixture_preserved=True,
            graceful_shutdown_exit_code=stopped['ExitCode'],hung_maintenance_watchdog=True,
            watchdog_exit_code=failed['ExitCode'],watchdog_seconds=watchdog_seconds,
            tls_verified=False,live_host_verified=False),indent=2))
        print('Production startup, persistence, actual retention, graceful shutdown and hung-maintenance watchdog passed (synthetic only).')
    except BaseException as failure:
        diagnostics={'failure_type':type(failure).__name__,'synthetic_only':True}
        if created:
            for label,command in [
                ('state',['docker','inspect',name,'--format',
                    '{{.State.Status}} running={{.State.Running}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} pid={{.State.Pid}}']),
                ('logs',['docker','logs','--tail','100',name]),
                ('ports',['docker','port',name,'8000/tcp'])]:
                try:
                    value=bounded_diagnostic(command)
                    for secret in (key,secret_key,network_key):value=value.replace(secret,'[REDACTED]')
                    diagnostics[label]=value
                except Exception as diagnostic_failure:
                    diagnostics[label]='Unavailable: '+type(diagnostic_failure).__name__
        (output/'failure.json').write_text(json.dumps(diagnostics,indent=2))
        raise
    finally:
        if created: subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,timeout=20)
        subprocess.run(['docker','volume','rm',volume],stdout=subprocess.DEVNULL,timeout=20)
        subprocess.run(['docker','image','rm',tag],stdout=subprocess.DEVNULL,timeout=20)

if __name__=='__main__':main()
