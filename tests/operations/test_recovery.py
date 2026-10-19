import json
import sqlite3
import tempfile
import time
import unittest
from pathlib import Path
from app import create_app
from deployment.backup import backup
from deployment.maintenance import purge_once
from wsgi import HealthMiddleware

class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.root=Path(self.temp.name)
        self.path=self.root/'events.sqlite3'
        self.app=create_app(dict(TESTING=True,SECRET_KEY='s'*48,ADMIN_TOKEN='a'*48,NETWORK_KEY='n'*48,DB_PATH=str(self.path)))
    def tearDown(self): self.temp.cleanup()
    def health(self):
        status=[]
        body=b''.join(HealthMiddleware(self.app)({'PATH_INFO':'/healthz'},lambda s,h:status.append(s)))
        return status[0],body
    def test_retention_and_heartbeat_recovery(self):
        self.assertEqual(self.health()[0],'503 Service Unavailable')
        with sqlite3.connect(self.path) as conn:
            conn.execute('INSERT INTO events VALUES (?,?,?,?)',('old',int(time.time())-31*86400,'synthetic','{}'))
        purge_once(self.app)
        self.assertEqual(self.health()[0],'200 OK')
        with sqlite3.connect(self.path) as conn: self.assertEqual(conn.execute('SELECT count(*) FROM events').fetchone()[0],0)
        (self.root/'retention-heartbeat.json').write_text(json.dumps({'last_success':time.time()-3601}))
        self.assertEqual(self.health()[0],'503 Service Unavailable')
    def test_online_backup_restore_and_restart(self):
        with sqlite3.connect(self.path) as conn:
            conn.execute('INSERT INTO events VALUES (?,?,?,?)',('fixture',int(time.time()),'synthetic','{}'))
        saved=self.root/'backup.sqlite3'; restored=self.root/'restored.sqlite3'
        backup(self.path,saved); backup(saved,restored)
        with sqlite3.connect(restored) as conn:
            self.assertEqual(conn.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(conn.execute('SELECT id FROM events').fetchone()[0],'fixture')
        self.assertEqual(saved.stat().st_mode & 0o777,0o600)
        with self.assertRaises(ValueError): backup(self.path,saved)
        restarted=create_app(dict(TESTING=True,SECRET_KEY='s'*48,ADMIN_TOKEN='a'*48,NETWORK_KEY='n'*48,DB_PATH=str(restored)))
        with restarted.test_client() as client:
            rows=client.get('/admin/events',headers={'Authorization':'Bearer '+'a'*48}).get_json()
            self.assertEqual(rows[0]['receipt'],'fixture')

if __name__=='__main__': unittest.main()
