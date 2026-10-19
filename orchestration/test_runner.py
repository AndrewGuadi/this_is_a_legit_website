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

if __name__=='__main__': unittest.main()
