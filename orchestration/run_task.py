"""Create a source-only Docker task and collect an UNTRUSTED proposed patch.
This script never applies patches, commits to the source repo, or pushes.
"""
import argparse
import difflib
import io
import tarfile
import stat
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASKS = json.loads((Path(__file__).parent / 'tasks.json').read_text())
DENY_PARTS = {'.git', '.env', '.venv', 'venv', 'instance', 'node_modules', '__pycache__', '.agent-results', '.ssh'}
DENY_SUFFIXES = {'.db', '.sqlite', '.sqlite3', '.pem', '.key', '.log', '.pyc'}


def selected_files(root, inputs):
    """Explicit relative paths only. Symlinks and runtime/secret filenames excluded."""
    root = root.resolve()
    selected = []
    for item in inputs:
        relative = Path(item)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe source path')
        candidate = root / relative
        if any((root / Path(*relative.parts[:i])).is_symlink() for i in range(1, len(relative.parts) + 1)):
            raise ValueError('Symlink input is forbidden')
        paths = candidate.rglob('*') if candidate.is_dir() else [candidate]
        for path in paths:
            rel = path.relative_to(root)
            if path.is_symlink():
                raise ValueError('Symlink input is forbidden')
            if not path.is_file():
                continue
            if any(p in DENY_PARTS or p.startswith('.env') for p in rel.parts):
                continue
            if path.suffix in DENY_SUFFIXES:
                continue
            if not path.resolve().is_relative_to(root):
                raise ValueError('Source escapes repository')
            selected.append(rel)
    return sorted(set(selected))


DOCKERFILE = '''FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g opencode-ai@1.19.3 && python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install Flask==3.1.3
RUN useradd --uid 10001 --create-home worker && mkdir /output && chown 10001:10001 /output
COPY source/ /opt/source/
COPY prompt.txt /opt/prompt.txt
COPY entry.py /opt/entry.py
USER 10001:10001
WORKDIR /work
ENTRYPOINT ["python", "/opt/entry.py"]
'''
# Worker output is a candidate tree, never an authoritative Git patch. Runtime is
# disabled until a verified egress policy and bounded artifact transport exist.
ENTRY = """raise SystemExit('Worker execution disabled pending isolation verification')"""
MAX_FILES = 512
MAX_FILE_BYTES = 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024
MAX_ARCHIVE_BYTES = 12 * 1024 * 1024


def checked_path(name):
    path = Path(name)
    if (not name or path.is_absolute() or '..' in path.parts
            or any(ord(c) < 32 or ord(c) == 127 for c in name)
            or '\\' in name or path.as_posix() != name
            or any(part in DENY_PARTS or part.startswith('.env') for part in path.parts)
            or path.suffix in DENY_SUFFIXES):
        raise ValueError('Unsafe candidate path: ' + repr(name))
    return path


def read_candidate(archive):
    """Inspect untrusted uncompressed tar in memory; never extract onto the host.

    Git metadata is rejected, so a worker must export only its candidate source.
    Hardlinks, symlinks, devices, executable/special modes and duplicate paths
    are rejected rather than normalized. Candidate text is bounded and UTF-8.
    """
    archive = Path(archive)
    if archive.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError('Candidate archive exceeds size limit')
    tree = {}
    seen = set()
    total = 0
    with tarfile.open(fileobj=io.BytesIO(archive.read_bytes()), mode='r:') as bundle:
        for member in bundle:
            name = member.name.rstrip('/') if member.isdir() else member.name
            checked_path(name)
            if name in seen or len(seen) >= MAX_FILES:
                raise ValueError('Duplicate path or too many archive entries')
            seen.add(name)
            if member.isdir():
                if member.mode & 0o7000:
                    raise ValueError('Unsafe directory mode')
                continue
            if not member.isfile() or member.mode not in (0o644, 0o600):
                raise ValueError('Candidate must contain ordinary non-executable files')
            total += member.size
            if member.size > MAX_FILE_BYTES or total > MAX_TOTAL_BYTES:
                raise ValueError('Candidate exceeds file or total size limit')
            data = bundle.extractfile(member).read(MAX_FILE_BYTES + 1)
            if len(data) != member.size or b'\x00' in data:
                raise ValueError('Invalid candidate content')
            data.decode('utf-8')
            tree[name] = data
    for name in tree:
        if any(parent.as_posix() in tree for parent in Path(name).parents if parent != Path('.')):
            raise ValueError('File collides with parent path')
    return tree


def capture_baseline(root, inputs):
    """Manager captures immutable bytes BEFORE handing a source copy to a worker."""
    from types import MappingProxyType
    root = Path(root)
    tree = {}
    total = 0
    for relative in selected_files(root, inputs):
        checked_path(relative.as_posix())
        source = root / relative
        if stat.S_IMODE(source.stat().st_mode) not in (0o644, 0o600):
            raise ValueError('Unsupported baseline file mode')
        if source.stat().st_size > MAX_FILE_BYTES or len(tree) >= MAX_FILES:
            raise ValueError('Baseline exceeds bounds')
        data = source.read_bytes()
        data.decode('utf-8')
        if b'\x00' in data:
            raise ValueError('Binary baseline unsupported')
        total += len(data)
        if total > MAX_TOTAL_BYTES:
            raise ValueError('Baseline exceeds total bound')
        tree[relative.as_posix()] = data
    return MappingProxyType(tree)


def review_candidate(baseline, archive, allowed):
    """Manager-owned diff and inventory; never consult worker index, HEAD or logs."""
    candidate = read_candidate(archive)
    changed = sorted(p for p in baseline.keys() | candidate.keys()
                     if baseline.get(p) != candidate.get(p))
    outside = [p for p in changed if not any(p == a or
               (a.endswith('/') and p.startswith(a)) for a in allowed)]
    if outside:
        raise ValueError('Out-of-scope candidate changes: ' + ', '.join(outside))
    patch = []
    for name in changed:
        # Unified hunks alone cannot represent creation/deletion of empty files.
        # Git's extended headers carry those operations without synthetic content.
        if name not in baseline and candidate[name] == b'':
            patch.extend(['diff --git ' + json.dumps('a/' + name) + ' ' + json.dumps('b/' + name) + '\n',
                          'new file mode 100644\n',
                          'index 0000000..e69de29\n'])
            continue
        if name not in candidate and baseline[name] == b'':
            patch.extend(['diff --git ' + json.dumps('a/' + name) + ' ' + json.dumps('b/' + name) + '\n',
                          'deleted file mode 100644\n',
                          'index e69de29..0000000\n'])
            continue
        before = baseline.get(name, b'').decode('utf-8').splitlines(keepends=True)
        after = candidate.get(name, b'').decode('utf-8').splitlines(keepends=True)
        for line in difflib.unified_diff(before, after,
                fromfile='a/' + name if name in baseline else '/dev/null',
                tofile='b/' + name if name in candidate else '/dev/null'):
            patch.append(line if line.endswith('\n') else line + '\n\\ No newline at end of file\n')
    return {'changed_files': changed, 'manager_review_required': True,
            'baseline_sha256': {p: hashlib.sha256(v).hexdigest() for p, v in baseline.items()},
            'candidate_sha256': {p: hashlib.sha256(v).hexdigest() for p, v in candidate.items()},
            'proposal_patch': ''.join(patch)}



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('task', choices=TASKS)
    parser.add_argument('--model', default='opencode/deepseek-v4.1-flash-free')
    parser.add_argument('--run', action='store_true', help='Actually build/run Docker; default only prepares source manifest')
    parser.add_argument('--allow-source-transfer', action='store_true', help='Acknowledge selected code/prompts are sent to external OpenCode model service')
    args = parser.parse_args()
    task = TASKS[args.task]
    files = selected_files(ROOT, task['inputs'])
    run_id = args.task+'-'+uuid.uuid4().hex[:10]
    output = ROOT/'.agent-results'/run_id
    output.mkdir(parents=True)
    manifest = {str(p):hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in files}
    (output/'source-manifest.json').write_text(json.dumps({'files':manifest,'task':task,'model':args.model},indent=2))
    print('Review source manifest:', output/'source-manifest.json', flush=True)
    if not args.run:
        print('Dry run. No container built; no source sent to a model.')
        return
    if not args.allow_source_transfer:
        raise SystemExit('External source transfer acknowledgement is required.')
    raise SystemExit('Execution disabled: verified model-only egress, bounded candidate transport, '
                     'and Docker isolation integration tests are not configured. '
                     'Source-transfer acknowledgement alone does not satisfy these gates.')

if __name__ == '__main__':
    main()
