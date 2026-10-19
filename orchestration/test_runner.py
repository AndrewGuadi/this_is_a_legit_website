import tempfile
import unittest
from pathlib import Path
from run_task import selected_files, ENTRY, TASKS

class SnapshotTests(unittest.TestCase):
    def test_excludes_secrets_runtime_and_git(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for name in ['app.py','.env','.env.production','instance/events.sqlite3','.git/config','static/ui.css']:
                path=root/name; path.parent.mkdir(parents=True,exist_ok=True); path.write_text('test')
            self.assertEqual([str(p) for p in selected_files(root,['.'])],['app.py','static/ui.css'])
    def test_rejects_escape_and_symlink(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for name in ['../outside','/etc/passwd']:
                with self.assertRaises(ValueError): selected_files(root,[name])
            (root/'linked').symlink_to('/etc/passwd')
            with self.assertRaises(ValueError): selected_files(root,['linked'])
    def test_entry_compiles_and_tasks_have_ownership(self):
        compile(ENTRY,'container-entry','exec')
        for task in TASKS.values():
            self.assertTrue(task['inputs'])
            self.assertTrue(task['outputs'])
            self.assertTrue(task['directive'])


class CandidateReviewTests(unittest.TestCase):
    def archive(self, root, entries):
        import tarfile, io
        target = root / 'candidate.tar'
        with tarfile.open(target, 'w') as tar:
            for name, data, mode, kind in entries:
                item = tarfile.TarInfo(name); item.mode = mode; item.type = kind
                item.size = len(data) if kind == tarfile.REGTYPE else 0
                if kind == tarfile.SYMTYPE: item.linkname = '/etc/passwd'
                tar.addfile(item, io.BytesIO(data) if item.isfile() else None)
        return target

    def test_worker_staging_and_head_changes_cannot_hide_changes(self):
        import subprocess, tarfile
        from run_task import capture_baseline, review_candidate
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); source = root / 'source'; source.mkdir()
            (source / 'app.py').write_text('old\n')
            baseline = capture_baseline(source, ['app.py'])
            for command in [['git','init','-q'], ['git','config','user.name','Worker'],
                            ['git','config','user.email','worker@example.invalid'],
                            ['git','add','.'], ['git','commit','-qm','baseline']]:
                subprocess.run(command, cwd=source, check=True)
            (source / 'app.py').write_text('new\n')
            subprocess.run(['git','add','.'], cwd=source, check=True)
            subprocess.run(['git','commit','-qm','hide change'], cwd=source, check=True)
            self.assertEqual(subprocess.check_output(['git','diff'], cwd=source), b'')
            bundle = self.archive(root, [('app.py', b'new\n', 0o644, tarfile.REGTYPE)])
            result = review_candidate(baseline, bundle, ['app.py'])
            self.assertEqual(result['changed_files'], ['app.py'])
            self.assertIn('-old\n+new\n', result['proposal_patch'])
            self.assertEqual(baseline['app.py'], b'old\n')
            with self.assertRaises(TypeError): baseline['app.py'] = b'changed'

    def test_rejects_unsafe_archive_members(self):
        import tarfile
        from run_task import read_candidate
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name, mode, kind in [('../escape',0o644,tarfile.REGTYPE),
                ('/absolute',0o644,tarfile.REGTYPE), ('link',0o644,tarfile.SYMTYPE),
                ('hard',0o644,tarfile.LNKTYPE), ('device',0o644,tarfile.CHRTYPE),
                ('exec',0o755,tarfile.REGTYPE), ('.git/index',0o644,tarfile.REGTYPE),
                ('line\nname',0o644,tarfile.REGTYPE)]:
                with self.subTest(name=name):
                    bundle = self.archive(root, [(name,b'x',mode,kind)])
                    with self.assertRaises(ValueError): read_candidate(bundle)

    def test_bounds_duplicates_and_ownership(self):
        import tarfile
        from unittest.mock import patch
        from run_task import read_candidate, review_candidate
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            bundle = self.archive(root, [('app.py',b'12345',0o644,tarfile.REGTYPE)])
            for bound in ['MAX_FILE_BYTES','MAX_TOTAL_BYTES','MAX_ARCHIVE_BYTES']:
                with patch('run_task.'+bound, 4):
                    with self.assertRaises(ValueError): read_candidate(bundle)
            with patch('run_task.MAX_FILES',0):
                with self.assertRaises(ValueError): read_candidate(bundle)
            with self.assertRaises(ValueError): review_candidate({}, bundle, ['static/'])
            with self.assertRaises(ValueError): review_candidate({'other.py':b'x'}, bundle, ['app.py'])
            duplicate = self.archive(root, [('x',b'1',0o644,tarfile.REGTYPE)]*2)
            with self.assertRaises(ValueError): read_candidate(duplicate)

    def test_patch_transports_empty_creation_and_deletion(self):
        import subprocess, tarfile
        from run_task import review_candidate
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            fixture = root / 'fixture'; fixture.mkdir()
            (fixture / 'removed.txt').write_bytes(b'')
            bundle = self.archive(root, [('new empty.txt',b'',0o644,tarfile.REGTYPE)])
            result = review_candidate({'removed.txt':b''}, bundle, ['removed.txt','new empty.txt'])
            proposal = root / 'proposal.patch'; proposal.write_text(result['proposal_patch'])
            subprocess.run(['git','apply','--check',str(proposal)], cwd=fixture, check=True)
            subprocess.run(['git','apply',str(proposal)], cwd=fixture, check=True)
            self.assertFalse((fixture / 'removed.txt').exists())
            self.assertEqual((fixture / 'new empty.txt').read_bytes(), b'')
            self.assertEqual(result['changed_files'], ['new empty.txt','removed.txt'])

    def test_run_fails_closed_even_with_transfer_acknowledgement(self):
        import subprocess, sys
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('run_task.py')),
                                 next(iter(TASKS)), '--run', '--allow-source-transfer'],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Execution disabled',result.stderr)

if __name__=='__main__': unittest.main()
