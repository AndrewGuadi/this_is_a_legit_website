"""Host-side bounded transport tests; no Docker or external model required."""
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'orchestration'))
from runtime_smoke import bounded_capture, isolation_arguments

class TransportTests(unittest.TestCase):
    def test_bounded_success(self):
        self.assertEqual(bounded_capture([sys.executable,'-c',"print('ok')"],limit=3),b'ok\n')
    def test_oversize_terminates(self):
        with self.assertRaises(ValueError):
            bounded_capture([sys.executable,'-c',"import sys; sys.stdout.write('x'*1000000)"],limit=100)
    def test_stall_terminates(self):
        with self.assertRaises(TimeoutError):
            bounded_capture([sys.executable,'-c','import time; time.sleep(5)'],timeout=0.05)
    def test_failed_export_rejected(self):
        with self.assertRaises(RuntimeError):
            bounded_capture([sys.executable,'-c','raise SystemExit(3)'])
    def test_runtime_has_no_mounts_or_network(self):
        args = isolation_arguments('fixture','fixture:test')
        for required in ['--network=none','--read-only','--user=10001:10001',
                         '--cap-drop=ALL','--security-opt=no-new-privileges',
                         '--memory=128m','--pids-limit=64']:
            self.assertIn(required,args)
        self.assertNotIn('--volume',args)
        self.assertNotIn('--mount',args)

if __name__ == '__main__': unittest.main()
