"""City route integration; synthetic records only."""
import tempfile
import unittest
from app import create_app
from game_catalog import GAMES

class CityIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.app=create_app(dict(TESTING=True,SECRET_KEY='s'*48,NETWORK_KEY='n'*48,ADMIN_TOKEN='a'*48,DB_PATH=self.temp.name+'/events.db',PUBLIC_URL='https://example.com'))
        self.client=self.app.test_client()
    def tearDown(self): self.temp.cleanup()
    def test_city_route_catalog_sitemap_and_csp(self):
        response=self.client.get('/games/cmd-city')
        self.assertEqual(response.status_code,200)
        self.assertIn(b'id="city-map"',response.data)
        self.assertIn(b'/static/cmd-city/game.mjs',response.data)
        self.assertIn('script-src \'self\'',response.headers['Content-Security-Policy'])
        self.assertNotIn(b' style=',response.data)
        self.assertNotIn(b' onclick=',response.data)
        self.assertTrue(any(g['slug']=='cmd-city' for g in GAMES))
        self.assertIn(b'https://example.com/games/cmd-city',self.client.get('/sitemap.xml').data)
    def test_city_assets_are_local_and_views_do_not_collect_observations(self):
        self.assertEqual(self.client.get('/games/cmd-city').status_code,200)
        for name in ['core.mjs','content.mjs','save.mjs','clock.mjs','transit.mjs','region.mjs','civic.mjs','environment.mjs','households.mjs','services.mjs','game.mjs','view.mjs','game.css']:
            with self.client.get('/static/cmd-city/'+name) as response:
                self.assertEqual(response.status_code,200,name)
        response=self.client.get('/admin/events',headers={'Authorization':'Bearer '+'a'*48})
        self.assertEqual(response.get_json(),[])
    def test_other_public_and_protected_routes_remain_present(self):
        for path in ['/','/forms','/terms','/games/neon-breaker','/apply/directory','/apply/contact']:
            self.assertEqual(self.client.get(path).status_code,200,path)
        self.assertEqual(self.client.get('/admin/events').status_code,401)
        self.assertEqual(self.client.get('/games/missing-city').status_code,404)
