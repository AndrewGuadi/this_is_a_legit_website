"""Exercise production image, readiness and persistent restart using synthetic data only."""
import json
import os
import re
import secrets
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def run(*args, **kwargs):
    return subprocess.run(list(args),check=True,timeout=kwargs.pop('timeout',180),**kwargs)


def main():
    name='legit-production-'+secrets.token_hex(5); tag=name+':test'; volume=name+'-data'
    key=secrets.token_urlsafe(48); output=Path('production-evidence');output.mkdir(exist_ok=True)
    created=False
    try:
        run('docker','build','-t',tag,'.',timeout=600)
        run('docker','volume','create',volume,stdout=subprocess.DEVNULL)
        run('docker','create','--name',name,'--cap-drop=ALL','--security-opt=no-new-privileges',
            '--memory=512m','--pids-limit=128','--cpus=2','--read-only','--tmpfs','/tmp:rw,size=64m',
            '--mount',f'type=volume,source={volume},target=/data',
            '-p','127.0.0.1::8000','-e','ADMIN_TOKEN='+key,'-e','SECRET_KEY='+secrets.token_urlsafe(48),
            '-e','NETWORK_KEY='+secrets.token_urlsafe(48),'-e','PUBLIC_URL=https://study.example',
            '-e','PRIVACY_CONTACT=synthetic@example.com','-e','PURGE_INTERVAL_SECONDS=30',tag,stdout=subprocess.DEVNULL)
        created=True
        run('docker','start',name,stdout=subprocess.DEVNULL)
        address=subprocess.check_output(['docker','port',name,'8000/tcp'],text=True,timeout=10).strip()
        base='http://'+address
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
        # Port mapping is preserved on restart.
        ready()
        with request('/admin/events',bearer=True) as response: restarted=json.load(response)
        assert restarted[0]['receipt']==receipt
        # Retention runs without a public request and writes a newer heartbeat.
        first=subprocess.check_output(['docker','exec',name,'cat','/data/retention-heartbeat.json'],text=True,timeout=10)
        first_time=json.loads(first)['last_success']
        time.sleep(32)
        last=subprocess.check_output(['docker','exec',name,'cat','/data/retention-heartbeat.json'],text=True,timeout=10)
        assert json.loads(last)['last_success']>first_time
        image_id=subprocess.check_output(['docker','image','inspect',tag,'--format','{{.Id}}'],text=True,timeout=10).strip()
        (output/'result.json').write_text(json.dumps(dict(commit=os.environ.get('GITHUB_SHA'),image=image_id,
            synthetic_only=True,startup=True,readiness=True,persistence_after_restart=True,
            periodic_retention_without_requests=True,tls_verified=False,live_host_verified=False),indent=2))
        print('Production image startup, readiness, persistent restart and periodic retention passed (synthetic only).')
    finally:
        if created: subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,timeout=20)
        subprocess.run(['docker','volume','rm',volume],stdout=subprocess.DEVNULL,timeout=20)
        subprocess.run(['docker','image','rm',tag],stdout=subprocess.DEVNULL,timeout=20)

if __name__=='__main__':main()
