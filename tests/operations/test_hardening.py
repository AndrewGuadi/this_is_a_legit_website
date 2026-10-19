import json
import sqlite3
import time
from unittest.mock import patch
from tests.operations.test_recovery import OperationsTests
from deployment import backup as backups
from deployment import maintenance

class HardeningTests(OperationsTests):
    def test_restore_revokes_sessions(self):
        with sqlite3.connect(self.path) as db:
            db.execute('INSERT INTO admin_sessions VALUES (?,?)',('revoked',int(time.time())+3600))
        saved=self.root/'copy.db'; restored=self.root/'restored.db'
        backups.backup(self.path,saved)
        backups.restore(saved,restored,ledger_path=self.root/"deletion-ledger.sqlite3")
        with sqlite3.connect(restored) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM admin_sessions').fetchone()[0],0)
    def test_full_database_is_not_ready(self):
        purge_once=maintenance.purge_once
        purge_once(self.app)
        self.app.config['MAX_EVENTS']=1
        with sqlite3.connect(self.path) as db:
            db.execute('INSERT INTO events VALUES (?,?,?,?)',('full',int(time.time()),'test','{}'))
        self.assertEqual(self.health()[0],'503 Service Unavailable')
    def test_expired_backup_cannot_restore_and_is_purged(self):
        saved=self.root/'copy.db'; backups.backup(self.path,saved,retention_seconds=60)
        with patch('deployment.backup.time.time',return_value=time.time()+61):
            with self.assertRaises(ValueError): backups.restore(saved,self.root/'restored.db')
            backups.purge_expired(self.root)
        self.assertFalse(saved.exists())
    def test_heartbeat_threshold_tracks_interval(self):
        (self.root/'retention-heartbeat.json').write_text(json.dumps({'last_success':time.time()-121}))
        with patch.dict('os.environ',{'PURGE_INTERVAL_SECONDS':'30'}):
            self.assertEqual(self.health()[0],'503 Service Unavailable')

class SupervisorTests(__import__('unittest').TestCase):
    def test_startup_timeout_kills_and_reaps_child(self):
        import subprocess
        from unittest.mock import MagicMock
        from deployment.start import main
        child=MagicMock(); child.poll.return_value=None
        child.wait.side_effect=[subprocess.TimeoutExpired('purge',30),subprocess.TimeoutExpired('purge',10),0]
        with patch('deployment.start.check',return_value=[]),patch('deployment.start.signal.signal'),patch('deployment.start.subprocess.Popen',return_value=child):
            self.assertEqual(main(),1)
        child.terminate.assert_called(); child.kill.assert_called(); self.assertEqual(child.wait.call_count,3)
    def test_hung_maintenance_stops_both_children(self):
        from unittest.mock import MagicMock
        from deployment.start import main
        initial=MagicMock(); initial.wait.return_value=0
        workers=[MagicMock(),MagicMock()]
        for child in workers: child.poll.return_value=None
        with patch('deployment.start.check',return_value=[]),patch('deployment.start.signal.signal'),patch.dict('os.environ',{'DB_PATH':'/tmp/test.db'}),patch('deployment.start.subprocess.Popen',side_effect=[initial,*workers]),patch('deployment.start.heartbeat_fresh',return_value=False):
            self.assertEqual(main(),1)
        for child in workers: child.terminate.assert_called_once(); child.wait.assert_called_once()

class ProbeTests(OperationsTests):
    def test_readiness_write_is_rolled_back(self):
        maintenance.purge_once(self.app)
        self.assertEqual(self.health()[0],'200 OK')
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM sqlite_master WHERE name='readiness_probe'").fetchone()[0],0)
    def test_maintenance_removes_expired_backup_before_heartbeat(self):
        folder=self.root/'backups'; saved=folder/'old.db'
        backups.backup(self.path,saved,retention_seconds=1)
        data=json.loads(backups.manifest_path(saved).read_text()); data['created_at']-=10; data['expires_at']-=10
        backups.manifest_path(saved).write_text(json.dumps(data))
        maintenance.purge_once(self.app)
        self.assertFalse(saved.exists()); self.assertEqual(self.health()[0],'200 OK')

class CapacityReadinessTests(OperationsTests):
    def test_used_token_capacity_unready(self):
        maintenance.purge_once(self.app)
        self.app.config['MAX_USED_TOKENS']=1
        with sqlite3.connect(self.path) as db: db.execute('INSERT INTO used_tokens VALUES (?,?)',('nonce',int(time.time())))
        self.assertEqual(self.health()[0],'503 Service Unavailable')
    def test_rate_row_capacity_unready(self):
        maintenance.purge_once(self.app)
        self.app.config['MAX_RATE_ROWS']=1
        with sqlite3.connect(self.path) as db: db.execute('INSERT INTO rate_limits VALUES (?,?)',('other',int(time.time())))
        self.assertEqual(self.health()[0],'503 Service Unavailable')
    def test_global_submission_capacity_unready(self):
        maintenance.purge_once(self.app)
        self.app.config['GLOBAL_SUBMISSIONS_PER_MINUTE']=1
        with sqlite3.connect(self.path) as db: db.execute('INSERT INTO rate_limits VALUES (?,?)',('submit:test',int(time.time())))
        self.assertEqual(self.health()[0],'503 Service Unavailable')

class GracefulShutdownTests(__import__('unittest').TestCase):
    def test_sigterm_exits_successfully_and_reaps_children(self):
        import signal
        from unittest.mock import MagicMock
        from deployment.start import main
        handlers={}
        initial=MagicMock(); initial.wait.return_value=0
        workers=[MagicMock(),MagicMock()]
        for child in workers: child.poll.return_value=None
        def register(sig,fn): handlers[sig]=fn
        def signal_during_sleep(_): handlers[signal.SIGTERM](signal.SIGTERM,None)
        with patch('deployment.start.check',return_value=[]),patch('deployment.start.signal.signal',side_effect=register),patch.dict('os.environ',{'DB_PATH':'/tmp/test.db'}),patch('deployment.start.subprocess.Popen',side_effect=[initial,*workers]),patch('deployment.start.heartbeat_fresh',return_value=True),patch('deployment.start.time.sleep',side_effect=signal_during_sleep):
            self.assertEqual(main(),0)
        for child in workers: child.terminate.assert_called(); child.wait.assert_called_once()

class DeletionRestoreTests(OperationsTests):
    def test_restore_applies_authoritative_deletion_receipts(self):
        from deployment.deletion_ledger import default_ledger_path, record_deletion
        receipt='a'*32
        with sqlite3.connect(self.path) as db:
            db.execute('INSERT INTO events VALUES (?,?,?,?)',(receipt,int(time.time()),'test','{}'))
        saved=self.root/'saved.db'; restored=self.root/'restored.db'
        backups.backup(self.path,saved)
        ledger=default_ledger_path(self.path)
        record_deletion(ledger,receipt)
        backups.restore(saved,restored,ledger_path=ledger)
        with sqlite3.connect(restored) as db: self.assertEqual(db.execute('SELECT count(*) FROM events').fetchone()[0],0)
    def test_restore_missing_ledger_rejected(self):
        saved=self.root/'saved.db'; backups.backup(self.path,saved)
        with self.assertRaises(ValueError): backups.restore(saved,self.root/'restored.db')

class LedgerIdentityTests(OperationsTests):
    def test_wrong_journal_rejected_and_partial_restore_removed(self):
        from deployment.deletion_ledger import initialize
        saved=self.root/'saved.db'; restored=self.root/'restored.db'
        backups.backup(self.path,saved)
        wrong=self.root/'wrong.db'; initialize(wrong)
        with self.assertRaises(ValueError): backups.restore(saved,restored,ledger_path=wrong)
        self.assertFalse(restored.exists())
    def test_journal_prunes_after_48_hours_and_repeated_delete_at_capacity(self):
        from deployment import deletion_ledger as ledger
        path=ledger.default_ledger_path(self.path); receipt='b'*32
        ledger.record_deletion(path,receipt)
        with patch.object(ledger,'MAX_RECEIPTS',1): ledger.record_deletion(path,receipt)
        with sqlite3.connect(path) as db: db.execute('UPDATE deletions SET at=?',(int(time.time())-ledger.RETENTION_SECONDS-1,))
        ledger.purge_ledger(path)
        with sqlite3.connect(path) as db: self.assertEqual(db.execute('SELECT count(*) FROM deletions').fetchone()[0],0)

class OfflineRestoreTests(OperationsTests):
    def test_absent_and_corrupt_authoritative_ledger_fail_closed(self):
        saved=self.root/'saved.db'; backups.backup(self.path,saved)
        for name,content in [('missing.db',None),('corrupt.db',b'not a sqlite database')]:
            with self.subTest(name=name):
                ledger=self.root/name
                if content: ledger.write_bytes(content)
                restored=self.root/'restored.db'
                with self.assertRaises(sqlite3.Error): backups.restore(saved,restored,ledger_path=ledger)
                self.assertFalse(restored.exists())
