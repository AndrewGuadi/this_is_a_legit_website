"""Private local device QA preview. Synthetic database; never deploy this server."""
import hashlib
from pathlib import Path
import runpy
import sys
from flask import Response, request

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
app = runpy.run_path(str(ROOT / 'tests/browser/server.py'))['app']
source_paths = sorted((ROOT / 'static/neon-breaker').glob('*')) + [ROOT / 'templates/neon_breaker.html']
identity = hashlib.sha256(b''.join(path.relative_to(ROOT).as_posix().encode() + b'\0' + path.read_bytes() for path in source_paths)).hexdigest()

@app.get('/__fixture/neon-device')
def device_probe():
    html = (ROOT / 'tests/game/device-probe.html').read_text()
    return html.replace('__CANDIDATE__', identity)

@app.get('/__fixture/neon-device.<extension>')
def device_asset(extension):
    if extension not in ('css', 'js'):
        return '', 404
    body = (ROOT / f'tests/game/device-probe.{extension}').read_text().replace('__CANDIDATE__', identity)
    return Response(body, mimetype='text/css' if extension == 'css' else 'text/javascript')

@app.after_request
def private_fixture_headers(response):
    # Test fixture only. Production remains unframeable with its original CSP.
    if request.path.startswith('/__fixture/neon-device'):
        response.headers['Content-Security-Policy'] = "default-src 'none'; style-src 'self'; script-src 'self'; frame-src 'self'; base-uri 'none'"
    elif request.path == '/games/neon-breaker':
        response.headers['Content-Security-Policy'] = "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'self'"
    return response

app.after_request_funcs[None].remove(private_fixture_headers)
app.after_request_funcs[None].insert(0, private_fixture_headers)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5084, debug=False, use_reloader=False)
