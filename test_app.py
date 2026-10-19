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
        for path in ('/','/terms','/apply/directory','/apply/partner','/apply/contact'):
            result = self.client.get(path)
            self.assertEqual(result.status_code,200)
            self.assertIn(b'Research demonstration', result.data)
        self.assertIn(b'https://example.com/apply/directory',self.client.get('/sitemap.xml').data)
        self.assertEqual(self.client.get('/apply/unknown').status_code,404)
    def test_rate_limit(self):
        for _ in range(30):
            self.client.post('/apply/directory',data={})
        self.assertEqual(self.client.post('/apply/directory',data={}).status_code,429)

if __name__ == '__main__':
    unittest.main()
