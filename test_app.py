import json
import re
import sqlite3
import tempfile
import time
import unittest
from pathlib import Path
from app import create_app

class ObservationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name)/'events.db')
        self.app = create_app(dict(TESTING=True, SECRET_KEY='s'*48, NETWORK_KEY='n'*48,
                                  ADMIN_TOKEN='a'*48, DB_PATH=self.path, PUBLIC_URL='https://example.com'))
        self.client = self.app.test_client()
        self.auth = {'Authorization': 'Bearer '+'a'*48}
    def tearDown(self):
        self.temp.cleanup()
    def data(self):
        text = self.client.get('/apply/directory').get_data(as_text=True)
        token = re.search(r'name="token" value="([^"]+)"',text).group(1)
        return dict(token=token,name='SECRET_NAME',email='private@example.com',message='SECRET_CONTENT',consent='yes',automation='automated')
    def events(self):
        return self.client.get('/admin/events',headers=self.auth).get_json()
    def test_minimization_replay_and_auth(self):
        data = self.data()
        self.assertEqual(self.client.post('/apply/directory',data=data).status_code,200)
        self.assertEqual(self.client.post('/apply/directory',data=data).status_code,409)
        self.assertEqual(self.client.get('/admin/events').status_code,401)
        serialized = json.dumps(self.events())
        for secret in ('SECRET_NAME','private@example.com','SECRET_CONTENT','127.0.0.1'):
            self.assertNotIn(secret,serialized)
        self.assertEqual(len(self.events()),2)
        self.assertTrue(all(row['consent_asserted'] for row in self.events()))
    def test_acceptance_and_token_required(self):
        data = self.data(); data.pop('consent')
        self.assertEqual(self.client.post('/apply/directory',data=data).status_code,400)
        self.assertEqual(self.events()[0]['outcome'],'missing_required_fields_or_acceptance')
        self.assertFalse(self.events()[0]['consent_asserted'])
        self.assertEqual(self.client.post('/apply/directory',data={}).status_code,400)
    def test_delete_and_expiry(self):
        self.client.post('/apply/directory',data=self.data())
        receipt = self.events()[0]['receipt']
        self.assertEqual(self.client.delete('/admin/events/'+receipt).status_code,401)
        self.assertEqual(self.client.delete('/admin/events/'+receipt,headers=self.auth).status_code,204)
        self.assertEqual(self.events(),[])
        with sqlite3.connect(self.path) as conn:
            conn.execute('INSERT INTO events VALUES (?,?,?,?)',('old',int(time.time())-31*86400,'net','{}'))
        self.assertEqual(self.events(),[])
    def test_public_pages_and_sitemap(self):
        for path in ('/forms','/terms','/apply/directory','/apply/partner','/apply/contact'):
            result = self.client.get(path)
            self.assertEqual(result.status_code,200)
            self.assertIn(b'research demonstration', result.data.lower())
        self.assertIn(b'https://example.com/apply/directory',self.client.get('/sitemap.xml').data)
        self.assertEqual(self.client.get('/apply/unknown').status_code,404)
    def test_arcade_catalog_preserves_secondary_forms_without_recording_views(self):
        from game_catalog import GAMES
        home=self.client.get('/')
        self.assertEqual(home.status_code,200)
        self.assertIn(b'LEGIT',home.data)
        self.assertIn(b'href="/forms"',home.data)
        self.assertEqual(len(GAMES),8)
        self.assertEqual(GAMES[0]['status'],'playable')
        for game in GAMES:
            route='/games/'+game['slug']
            response=self.client.get(route)
            self.assertEqual(response.status_code,200)
            if game['slug'] == 'neon-breaker':
                self.assertIn(b'<canvas',response.data)
                self.assertIn(b'Nothing is sent to a server',response.data)
            else:
                self.assertIn(b'not a playable release',response.data)
                self.assertNotIn(b'<canvas',response.data)
            self.assertIn(route.encode(),self.client.get('/sitemap.xml').data)
        self.assertEqual(self.client.get('/games/unknown').status_code,404)
        self.assertEqual(self.events(),[])
        self.assertEqual(self.client.post('/apply/directory',data=self.data()).status_code,200)
        self.assertEqual(len(self.events()),1)

    def login(self):
        self.client.get('/admin/login')
        with self.client.session_transaction() as sess:
            csrf = sess['csrf_token']
        return self.client.post('/admin/login', data={'token':'a'*48,'csrf_token':csrf})
    def test_session_security_and_filter_export(self):
        self.assertEqual(self.client.get('/admin').status_code,302)
        self.assertEqual(self.client.post('/admin/login',data={'token':'a'*48}).status_code,400)
        self.assertEqual(self.login().status_code,302)
        self.client.post('/apply/directory',data=self.data())
        self.client.post('/apply/contact',data={})
        export = self.client.get('/admin/export?form=directory')
        self.assertEqual(export.status_code,200)
        self.assertEqual(len(export.get_json()),1)
        self.assertIn('attachment',export.headers['Content-Disposition'])
        receipt = export.get_json()[0]['receipt']
        self.assertEqual(self.client.post('/admin/record/'+receipt+'/delete').status_code,400)
        with self.client.session_transaction() as sess:
            csrf = sess['csrf_token']
        self.assertEqual(self.client.post('/admin/record/'+receipt+'/delete',data={'csrf_token':csrf}).status_code,400)
        self.assertEqual(len(self.events()),2)
        self.assertEqual(self.client.post('/admin/record/'+receipt+'/delete',data={'csrf_token':csrf,'confirm':'yes'}).status_code,302)
        self.assertEqual(len(self.events()),1)
        self.assertEqual(self.client.post('/admin/logout',data={'csrf_token':csrf}).status_code,302)
        self.assertEqual(self.client.get('/admin/export').status_code,302)
    def test_server_field_limits_and_whitespace(self):
        data=self.data(); data['name']='x'*121
        self.assertEqual(self.client.post('/apply/directory',data=data).status_code,400)
        data=self.data(); data['message']='   '
        self.assertEqual(self.client.post('/apply/directory',data=data).status_code,400)
    def test_login_throttle(self):
        self.client.get('/admin/login')
        with self.client.session_transaction() as sess:
            csrf=sess['csrf_token']
        for _ in range(5):
            self.assertEqual(self.client.post('/admin/login',data={'token':'wrong','csrf_token':csrf}).status_code,401)
        self.assertEqual(self.client.post('/admin/login',data={'token':'a'*48,'csrf_token':csrf}).status_code,429)

    def test_date_filter_and_policy_evidence(self):
        self.login()
        self.client.post('/apply/directory',data=self.data())
        rows=self.client.get('/admin/export?since=2000-01-01&until=2000-01-02').get_json()
        self.assertEqual(rows,[])
        self.assertEqual(self.client.get('/admin/export?since=nonsense').status_code,400)
        self.assertEqual(self.client.get('/admin/export?until=9999-12-31').status_code,400)
        row=self.events()[0]
        self.assertEqual(row['schema_version'],1)
        self.assertEqual(row['authorization_status'],'not_verified')
        self.assertEqual(len(row['terms_sha256']),64)
    def test_atomic_concurrent_submission_limit(self):
        from concurrent.futures import ThreadPoolExecutor
        def attempt(_):
            with self.app.test_client() as client:
                return client.post('/apply/contact',data={}).status_code
        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses=list(pool.map(attempt,range(36)))
        self.assertEqual(statuses.count(400),30)
        self.assertEqual(statuses.count(429),6)
        self.assertEqual(len(self.events()),30)
    def test_unicode_auth_is_rejected_without_crash(self):
        self.assertEqual(self.client.get('/admin/events',headers={'Authorization':'Bearer ☃'}).status_code,401)
        self.client.get('/admin/login')
        with self.client.session_transaction() as sess: csrf=sess['csrf_token']
        self.assertEqual(self.client.post('/admin/login',data={'token':'☃','csrf_token':csrf}).status_code,401)

    def test_export_cap_is_explicit(self):
        self.login()
        with sqlite3.connect(self.path) as conn:
            conn.executemany('INSERT INTO events VALUES (?,?,?,?)',[(str(i),int(time.time()),'net','{}') for i in range(1005)])
        result=self.client.get('/admin/export')
        self.assertEqual(len(result.get_json()),1000)
        self.assertEqual(result.headers['X-Export-Total'],'1005')
        self.assertEqual(result.headers['X-Export-Truncated'],'true')
    def test_invalid_form_preserves_escaped_values_and_reissues_token(self):
        data=self.data(); data['name']='<script>alert(1)</script>'; data['message']=''
        response=self.client.post('/apply/directory',data=data)
        self.assertEqual(response.status_code,400)
        html=response.get_data(as_text=True)
        self.assertNotIn('<script>alert(1)</script>',html)
        self.assertIn('&lt;script&gt;',html)
        token=re.search(r'name="token" value="([^"]+)"',html).group(1)
        self.assertNotEqual(token,data['token'])
        data.update(token=token,message='Recovered')
        self.assertEqual(self.client.post('/apply/directory',data=data).status_code,200)

    def test_blocked_attempt_counter_and_retention(self):
        for _ in range(33): self.client.post('/apply/contact',data={})
        with sqlite3.connect(self.path) as conn:
            self.assertEqual(conn.execute('SELECT SUM(count) FROM blocked_attempts').fetchone()[0],3)
            conn.execute('INSERT INTO blocked_attempts VALUES (?,?,?)',('old',int(time.time())-90000,4))
        self.login()
        response=self.client.get('/admin')
        self.assertEqual(response.status_code,200)
        with sqlite3.connect(self.path) as conn:
            self.assertEqual(conn.execute('SELECT SUM(count) FROM blocked_attempts').fetchone()[0],3)
    def test_errors_have_recovery_ui_and_correct_status(self):
        for path,method,expected in [('/unknown','get',404),('/admin/login','post',400)]:
            response=getattr(self.client,method)(path)
            self.assertEqual(response.status_code,expected)
            self.assertIn(b'Return home',response.data)
        response=self.client.post('/apply/contact',data={'message':'x'*20000})
        self.assertEqual(response.status_code,413)
        self.assertIn(b'Return home',response.data)
        self.login()
        response=self.client.get('/admin/export?since=bad')
        self.assertEqual(response.status_code,400)
        self.assertIn(b'Return home',response.data)
        for _ in range(30): self.client.post('/apply/contact',data={})
        response=self.client.post('/apply/contact',data={})
        self.assertEqual(response.status_code,429)
        self.assertEqual(response.headers['Retry-After'],'60')
        self.assertIn(b'Return home',response.data)

    def test_global_caps_fail_closed(self):
        self.app.config.update(MAX_EVENTS=2,MAX_RATE_ROWS=20,MAX_BLOCKED_ROWS=2,GLOBAL_SUBMISSIONS_PER_MINUTE=20)
        for i in range(5):
            response=self.client.post('/apply/contact',data={},environ_base={'REMOTE_ADDR':f'10.0.0.{i}'})
            self.assertEqual(response.status_code,400 if i<2 else 503)
        with sqlite3.connect(self.path) as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM events').fetchone()[0],2)
        self.assertIn(b'Return home',response.data)
        self.assertEqual(response.headers['Retry-After'],'60')
    def test_rate_and_counter_tables_are_bounded(self):
        self.app.config.update(MAX_RATE_ROWS=3,MAX_BLOCKED_ROWS=2,GLOBAL_SUBMISSIONS_PER_MINUTE=100)
        for i in range(8):
            self.client.post('/apply/contact',data={},environ_base={'REMOTE_ADDR':f'10.0.0.{i}'})
        with sqlite3.connect(self.path) as conn:
            self.assertLessEqual(conn.execute('SELECT COUNT(*) FROM rate_limits').fetchone()[0],3)
            self.assertLessEqual(conn.execute('SELECT COUNT(*) FROM blocked_attempts').fetchone()[0],2)
    def test_database_failure_is_safe_and_recoverable(self):
        from unittest.mock import patch
        with patch('app.sqlite3.connect',side_effect=sqlite3.OperationalError('secret filesystem detail')):
            response=self.client.post('/apply/contact',data={})
        self.assertEqual(response.status_code,503)
        self.assertNotIn(b'secret filesystem detail',response.data)
        self.assertIn(b'Return home',response.data)
    def test_production_config_fails_closed(self):
        base=dict(TESTING=True,SECRET_KEY='s'*48,NETWORK_KEY='n'*48,ADMIN_TOKEN='a'*48,DB_PATH=self.path,APP_ENV='production')
        with self.assertRaises(RuntimeError): create_app(base)
        base.update(PUBLIC_URL='https://example.com',CONTACT='privacy@example.com')
        production=create_app(base)
        self.assertEqual(production.test_client().get('/',headers={'Host':'evil.example'}).status_code,400)
        base['SESSION_COOKIE_SECURE']=False
        with self.assertRaises(RuntimeError): create_app(base)

    def test_logout_revokes_copied_session_cookie(self):
        self.login()
        copied=self.client.get_cookie('session').value
        with self.client.session_transaction() as sess: csrf=sess['csrf_token']
        self.client.post('/admin/logout',data={'csrf_token':csrf})
        attacker=self.app.test_client(); attacker.set_cookie('session',copied)
        self.assertEqual(attacker.get('/admin/export').status_code,302)
    def test_concurrent_event_capacity(self):
        from concurrent.futures import ThreadPoolExecutor
        self.app.config['MAX_EVENTS']=4
        def attempt(i):
            with self.app.test_client() as client:
                return client.post('/apply/contact',data={},environ_base={'REMOTE_ADDR':f'10.0.1.{i}'}).status_code
        with ThreadPoolExecutor(max_workers=8) as pool: statuses=list(pool.map(attempt,range(12)))
        self.assertEqual(statuses.count(400),4)
        self.assertEqual(statuses.count(503),8)

    def test_global_admission_and_nonce_caps(self):
        self.app.config['GLOBAL_SUBMISSIONS_PER_MINUTE']=2
        for i in range(3):
            response=self.client.post('/apply/contact',data={},environ_base={'REMOTE_ADDR':f'10.1.1.{i}'})
            self.assertEqual(response.status_code,400 if i<2 else 503)
        self.app.config['GLOBAL_SUBMISSIONS_PER_MINUTE']=100
        self.app.config['MAX_USED_TOKENS']=1
        self.assertEqual(self.client.post('/apply/directory',data=self.data()).status_code,200)
        self.assertEqual(self.client.post('/apply/directory',data=self.data()).status_code,503)
        with sqlite3.connect(self.path) as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM used_tokens').fetchone()[0],1)
    def test_blocked_counter_capacity_is_bounded(self):
        import hmac,hashlib
        self.app.config['MAX_BLOCKED_ROWS']=2
        with sqlite3.connect(self.path) as conn:
            for i in range(3):
                net=hmac.new(('n'*48).encode(),f'10.2.2.{i}'.encode(),hashlib.sha256).hexdigest()
                conn.executemany('INSERT INTO rate_limits VALUES (?,?)',[('submit:'+net,int(time.time()))]*30)
        for i in range(3):
            response=self.client.post('/apply/contact',data={},environ_base={'REMOTE_ADDR':f'10.2.2.{i}'})
            self.assertEqual(response.status_code,429 if i<2 else 503)
        with sqlite3.connect(self.path) as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM blocked_attempts').fetchone()[0],2)

    def test_deletion_ledger_failure_preserves_event(self):
        from unittest.mock import patch
        self.client.post('/apply/directory',data=self.data())
        receipt=self.events()[0]['receipt']
        with patch('app.record_deletion',side_effect=OSError('private storage failure')):
            response=self.client.delete('/admin/events/'+receipt,headers=self.auth)
        self.assertEqual(response.status_code,503)
        self.assertNotIn(b'private storage failure',response.data)
        self.assertEqual(len(self.events()),1)
    def test_deletion_ledger_precedes_delete_and_has_only_receipt_time(self):
        from unittest.mock import patch
        from app import record_deletion
        self.client.post('/apply/directory',data=self.data())
        receipt=self.events()[0]['receipt']
        def verify_before_delete(path,item):
            with sqlite3.connect(self.path) as conn:
                self.assertIsNotNone(conn.execute('SELECT 1 FROM events WHERE id=?',(item,)).fetchone())
            return record_deletion(path,item)
        with patch('app.record_deletion',side_effect=verify_before_delete):
            self.assertEqual(self.client.delete('/admin/events/'+receipt,headers=self.auth).status_code,204)
        self.assertEqual(self.events(),[])
        from app import default_ledger_path
        with sqlite3.connect(default_ledger_path(self.path)) as conn:
            self.assertEqual([r[1] for r in conn.execute('PRAGMA table_info(deletions)')],['receipt','at'])
            self.assertEqual(conn.execute('SELECT receipt FROM deletions').fetchone()[0],receipt)
    def test_concurrent_deletion_is_idempotent(self):
        from concurrent.futures import ThreadPoolExecutor
        from app import default_ledger_path
        self.client.post('/apply/directory',data=self.data())
        receipt=self.events()[0]['receipt']
        def erase(_):
            with self.app.test_client() as client:
                return client.delete('/admin/events/'+receipt,headers=self.auth).status_code
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(list(pool.map(erase,range(8))),[204]*8)
        with sqlite3.connect(default_ledger_path(self.path)) as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM deletions').fetchone()[0],1)
        self.assertEqual(self.events(),[])

    def test_rate_limit(self):
        for _ in range(30):
            self.client.post('/apply/directory',data={})
        self.assertEqual(self.client.post('/apply/directory',data={}).status_code,429)

if __name__ == '__main__':
    unittest.main()
