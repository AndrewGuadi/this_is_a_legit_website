import unittest
from preflight import check

class PreflightTests(unittest.TestCase):
    def good(self):
        return dict(SECRET_KEY='s'*40,NETWORK_KEY='n'*40,ADMIN_TOKEN='a'*40,PUBLIC_URL='https://example.com',PRIVACY_CONTACT='research@example.com',DB_PATH='/srv/private/events.sqlite3')
    def test_valid_shape(self): self.assertEqual(check(self.good()),[])
    def test_unsafe_configuration(self):
        env=self.good(); env.update(PUBLIC_URL='http://user:password@example.com/path?secret=value',DB_PATH='/srv/static/events.sqlite3',FLASK_DEBUG='1',NETWORK_KEY='s'*40)
        issues=check(env)
        self.assertEqual(len(issues),4)
        self.assertNotIn('password',' '.join(issues))
    def test_missing_configuration(self): self.assertGreaterEqual(len(check({})),4)

if __name__=='__main__': unittest.main()
