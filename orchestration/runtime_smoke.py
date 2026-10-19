"""Docker-only, offline synthetic worker verification. Never invokes an AI model."""
import argparse
import io
import json
import os
from pathlib import Path
import selectors
import subprocess
import tarfile
import tempfile
import time
import uuid

from run_task import MAX_ARCHIVE_BYTES, capture_baseline, review_candidate

IMAGE = 'python:3.12-slim-bookworm'
# Both scripts live in the immutable image, outside the writable candidate tree.
WORKER = r'''
import errno, json, os, pathlib, socket
status = dict(line.split(':', 1) for line in pathlib.Path('/proc/self/status').read_text().splitlines() if ':' in line)
assert os.getuid() == 10001
assert int(status['CapEff'].strip(), 16) == 0
assert status['NoNewPrivs'].strip() == '1'
assert status['Seccomp'].strip() == '2'
try:
    pathlib.Path('/rootfs-write-probe').write_text('blocked')
except OSError as exc:
    assert exc.errno in (errno.EROFS, errno.EACCES)
else:
    raise AssertionError('root filesystem writable')
assert not pathlib.Path('/var/run/docker.sock').exists()
assert not pathlib.Path('/run/secrets').exists()
assert not any(key.endswith('TOKEN') or key.endswith('API_KEY') for key in os.environ)
connection = socket.socket(); connection.settimeout(1)
try:
    connection.connect(('1.1.1.1', 443))
except OSError:
    pass
else:
    raise AssertionError('unexpected external network access')
finally:
    connection.close()
pathlib.Path('/work/app.py').write_text('value = 2\n')
pathlib.Path('/work/HANDOFF.md').write_text('Synthetic offline worker; no model invoked.\n')
print(json.dumps({'uid':os.getuid(),'cap_eff':status['CapEff'].strip(),
    'no_new_privs':status['NoNewPrivs'].strip(),'seccomp':status['Seccomp'].strip(),
    'rootfs_write_blocked':True,'external_connect_blocked':True}))
'''
COLLECTOR = r'''
import os, pathlib, stat, sys, tarfile
root = pathlib.Path('/work')
files = []
total = 0
for base, directories, names in os.walk(root, followlinks=False):
    for name in directories + names:
        path = pathlib.Path(base) / name
        info = path.lstat()
        if stat.S_ISLNK(info.st_mode): raise ValueError('symlink output')
        if stat.S_ISDIR(info.st_mode): continue
        if not stat.S_ISREG(info.st_mode): raise ValueError('nonregular output')
        total += info.st_size
        if info.st_size > 1024*1024 or total > 8*1024*1024 or len(files) >= 512:
            raise ValueError('output bound exceeded')
        files.append(path)
with tarfile.open(fileobj=sys.stdout.buffer, mode='w|', format=tarfile.USTAR_FORMAT) as archive:
    for path in sorted(files):
        archive.add(path, arcname=path.relative_to(root).as_posix(), recursive=False)
'''


def bounded_capture(command, limit=MAX_ARCHIVE_BYTES, timeout=30):
    """Terminate oversize/stalled transport without unbounded communicate buffers."""
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    chunks = []; size = 0; deadline = time.monotonic() + timeout
    selector = selectors.DefaultSelector(); selector.register(process.stdout, selectors.EVENT_READ)
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not selector.select(remaining):
                raise TimeoutError('Candidate transport timed out')
            chunk = os.read(process.stdout.fileno(), min(65536, limit + 1 - size))
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                raise ValueError('Candidate transport exceeds byte limit')
            chunks.append(chunk)
        if process.wait(timeout=max(0.1, deadline-time.monotonic())):
            raise RuntimeError('Candidate transport failed')
        return b''.join(chunks)
    finally:
        selector.close(); process.stdout.close()
        if process.poll() is None:
            process.kill(); process.wait(timeout=5)


def isolation_arguments(name, tag):
    return ['docker','create','--name',name,'--network=none','--read-only',
            '--user=10001:10001','--cap-drop=ALL','--security-opt=no-new-privileges',
            '--pids-limit=64','--memory=128m','--memory-swap=128m','--cpus=0.5',
            '--tmpfs','/work:rw,noexec,nosuid,nodev,size=16m,uid=10001,gid=10001,mode=0700',
            '--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=8m,uid=10001,gid=10001,mode=0700',
            '--log-driver=none',tag,'python','-I','-c','import time; time.sleep(120)']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    run_id = 'legit-offline-' + uuid.uuid4().hex[:12]; tag = run_id + ':test'
    subprocess.run(['docker','info'], check=True, stdout=subprocess.DEVNULL, timeout=30)
    created = False
    try:
        with tempfile.TemporaryDirectory(prefix='offline-worker-') as folder:
            context = Path(folder)
            (context/'worker.py').write_text(WORKER)
            (context/'collector.py').write_text(COLLECTOR)
            (context/'Dockerfile').write_text('FROM '+IMAGE+'\nCOPY worker.py collector.py /opt/\n')
            subprocess.run(['docker','build','--network=none','-t',tag,str(context)],check=True,timeout=180)
            baseline_dir = context/'baseline'; baseline_dir.mkdir()
            (baseline_dir/'app.py').write_text('value = 1\n')
            baseline = capture_baseline(baseline_dir,['app.py'])
            subprocess.run(isolation_arguments(run_id,tag),check=True,stdout=subprocess.DEVNULL,timeout=30)
            created = True
            subprocess.run(['docker','start',run_id],check=True,stdout=subprocess.DEVNULL,timeout=30)
            # Seed only manager-selected synthetic source; no host mounts or credentials.
            subprocess.run(['docker','exec',run_id,'python','-I','-c',
                "from pathlib import Path; Path('/work/app.py').write_text('value = 1\\n')"],check=True,timeout=10)
            probe = json.loads(bounded_capture(['docker','exec',run_id,'python','-I','/opt/worker.py'],limit=4096))
            inspect = json.loads(bounded_capture(['docker','inspect',run_id],limit=65536))[0]
            host = inspect['HostConfig']
            assert host['NetworkMode'] == 'none' and host['ReadonlyRootfs']
            assert host['PidsLimit'] == 64 and host['Memory'] == 128*1024*1024
            assert host['MemorySwap'] == host['Memory'] and host['NanoCpus'] == 500000000
            assert host['CapDrop'] == ['ALL'] and inspect['Config']['User'] == '10001:10001'
            assert not host.get('Binds') and not host.get('Privileged')
            archive = args.output/'candidate.tar'
            archive.write_bytes(bounded_capture(['docker','exec',run_id,'python','-I','/opt/collector.py']))
            result = review_candidate(baseline,archive,['app.py','HANDOFF.md'])
            assert result['changed_files'] == ['HANDOFF.md','app.py']
            (args.output/'proposal.patch').write_text(result.pop('proposal_patch'))
            result.update({'worker_kind':'synthetic_offline','model_invoked':False,'probe':probe,
                           'image_id':inspect['Image'], 'runtime_constraints_verified':True})
            (args.output/'result.json').write_text(json.dumps(result,indent=2)+'\n')
        subprocess.run(['docker','stop','--time=1',run_id],check=True,stdout=subprocess.DEVNULL,timeout=15)
        assert review_candidate(baseline,args.output/'candidate.tar',['app.py','HANDOFF.md'])['changed_files'] == ['HANDOFF.md','app.py']
        print('Offline runtime checks passed; manager artifacts survive container stop:',args.output)
    finally:
        if created:
            subprocess.run(['docker','rm','-f',run_id],stdout=subprocess.DEVNULL,timeout=20)
        subprocess.run(['docker','image','rm',tag],stdout=subprocess.DEVNULL,timeout=20)


if __name__ == '__main__':
    main()
