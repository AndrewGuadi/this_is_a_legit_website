"""Generate disposable static QA pages from the real Flask templates. Never deploy this folder."""
import secrets
import shutil
import sys
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from app import create_app
output=ROOT/'dev_docs/city-preview'
with tempfile.TemporaryDirectory() as tmp:
    app=create_app(dict(SECRET_KEY=secrets.token_hex(32),NETWORK_KEY=secrets.token_hex(32),
                        ADMIN_TOKEN=secrets.token_hex(32),DB_PATH=tmp+'/synthetic.db',
                        PUBLIC_URL='http://localhost',CONTACT='preview@example.invalid'))
    with app.test_client() as client:
        for url in ['/','/games/cmd-city','/games/neon-breaker','/terms']:
            response=client.get(url)
            if response.status_code!=200: raise RuntimeError(url)
            destination=output/url.lstrip('/')/'index.html'
            destination.parent.mkdir(parents=True,exist_ok=True)
            destination.write_bytes(response.data)
shutil.copytree(ROOT/'static',output/'static',dirs_exist_ok=True)
print('Generated static QA pages from current Flask templates.')
