"""First-party form observation. Run behind HTTPS; see README before deployment."""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path
from flask import Flask, abort, jsonify, make_response, render_template_string, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

VERSION = '2026-10-19-v1'
POLICY = '''This is a form-interaction research website operated by Authentic Dynamics LLC.
No employment, grant, purchase, or service is offered through these forms. Use synthetic test details only.
Public pages may be read and indexed. Automated submissions require prior written operator permission;
permission to read or index does not grant permission to submit. Do not submit another person's information.
We record submission attempts for abuse analysis: UTC time, form type, field lengths, declared automation,
consent checkbox state, terms version, elapsed time, HTTP outcome, and a pseudonymous network identifier.
The identifier is an HMAC of the server-observed address; raw addresses and submitted names, emails, and
messages are not stored by this application. The user-agent header is retained, limited to 300 characters.
We use no advertising trackers, cross-site cookies, or device fingerprinting. Records expire after 30 days.
Hosting providers may separately process access logs and IP addresses. No records are sold or published.
A checked box records a request's assertion, not proof of identity, human consent, operator authority, or a legal violation.
For privacy questions or deletion requests, use the operator contact configured on this page and include your receipt ID.
'''
POLICY_HASH = hashlib.sha256(POLICY.encode()).hexdigest()

def create_app(config=None):
    app = Flask(__name__)
    app.config.update(SECRET_KEY=os.environ.get('SECRET_KEY'), ADMIN_TOKEN=os.environ.get('ADMIN_TOKEN'),
        NETWORK_KEY=os.environ.get('NETWORK_KEY'), DB_PATH=os.environ.get('DB_PATH', str(Path(__file__).parent / 'instance/events.sqlite3')),
        PUBLIC_URL=os.environ.get('PUBLIC_URL', '').rstrip('/'), CONTACT=os.environ.get('PRIVACY_CONTACT', ''),
        MAX_CONTENT_LENGTH=16384)
    if config:
        app.config.update(config)
    for key in ('SECRET_KEY', 'NETWORK_KEY', 'ADMIN_TOKEN'):
        if not app.config.get(key) or len(app.config[key]) < 32:
            raise RuntimeError(f'{key} must be configured with at least 32 random characters')
    Path(app.config['DB_PATH']).parent.mkdir(parents=True, exist_ok=True)
    def db():
        conn = sqlite3.connect(app.config['DB_PATH'], timeout=10)
        conn.execute('PRAGMA secure_delete=ON')
        return conn
    with db() as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, at INTEGER, network TEXT, data TEXT)')
        conn.execute('CREATE INDEX IF NOT EXISTS events_at ON events(at)')
        conn.execute('CREATE TABLE IF NOT EXISTS used_tokens (nonce TEXT PRIMARY KEY, at INTEGER)')
    signer = URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='form-v1')
    def purge(conn):
        conn.execute('DELETE FROM events WHERE at < ?', (int(time.time())-30*86400,))
        conn.execute('DELETE FROM used_tokens WHERE at < ?', (int(time.time())-7200,))
    def network():
        # Deliberately do NOT trust arbitrary X-Forwarded-For headers.
        return hmac.new(app.config['NETWORK_KEY'].encode(), (request.remote_addr or 'unknown').encode(), hashlib.sha256).hexdigest()
    def record(kind, outcome, signals):
        receipt = secrets.token_hex(16)
        data = dict(form=kind, outcome=outcome, terms_version=VERSION, terms_sha256=POLICY_HASH,
                    user_agent=request.headers.get('User-Agent', '')[:300], **signals)
        with db() as conn:
            purge(conn)
            conn.execute('INSERT INTO events VALUES (?,?,?,?)', (receipt, int(time.time()), network(), json.dumps(data)))
        return receipt
    def page(body, **kwargs):
        return render_template_string(SHELL, body=body, contact=app.config['CONTACT'], **kwargs)
    @app.after_request
    def headers(response):
        response.headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cache-Control'] = 'no-store'
        if request.path.startswith('/admin'):
            response.headers['X-Robots-Tag'] = 'noindex, nofollow'
        return response
    @app.get('/')
    def home():
        return page('home')
    @app.get('/terms')
    def terms():
        return page('terms', policy=POLICY, version=VERSION, digest=POLICY_HASH)
    @app.route('/apply/<kind>', methods=['GET', 'POST'])
    def apply(kind):
        if kind not in ('directory', 'partner', 'contact'):
            abort(404)
        if request.method == 'GET':
            token = signer.dumps(dict(nonce=secrets.token_hex(24), issued=time.time(), kind=kind, version=VERSION))
            return page('form', kind=kind, token=token)
        now = int(time.time())
        with db() as conn:
            purge(conn)
            count = conn.execute('SELECT COUNT(*) FROM events WHERE network=? AND at>?', (network(), now-60)).fetchone()[0]
        if count >= 30:
            response = make_response('Rate limit reached. Try again in one minute.', 429)
            response.headers['Retry-After'] = '60'
            return response
        fields = request.form
        signals = dict(consent_asserted=fields.get('consent') == 'yes',
            automation_declared=fields.get('automation') if fields.get('automation') in ('human','automated','assisted') else 'unspecified',
            honeypot_filled=bool(fields.get('fax')), field_lengths={k:len(fields.get(k,'')) for k in ('name','email','message')})
        status, outcome = 200, 'recorded'
        try:
            payload = signer.loads(fields.get('token',''), max_age=3600)
            if payload['kind'] != kind or payload['version'] != VERSION:
                raise BadSignature('wrong form/version')
            signals['elapsed_seconds'] = round(max(0, time.time()-payload['issued']), 2)
            with db() as conn:
                conn.execute('INSERT INTO used_tokens VALUES (?,?)', (payload['nonce'], now))
        except (BadSignature, SignatureExpired, KeyError, TypeError):
            status, outcome = 400, 'invalid_or_expired_form_token'
        except sqlite3.IntegrityError:
            status, outcome = 409, 'replayed_form_token'
        if status == 200 and (not signals['consent_asserted'] or not fields.get('name') or not fields.get('message') or signals['automation_declared']=='unspecified'):
            status, outcome = 400, 'missing_required_fields_or_acceptance'
        receipt = record(kind, outcome, signals)
        return page('receipt', receipt=receipt, outcome=outcome), status
    def authenticate():
        expected = 'Bearer ' + app.config['ADMIN_TOKEN']
        if not hmac.compare_digest(request.headers.get('Authorization',''), expected):
            abort(401)
    @app.get('/admin/events')
    def events():
        authenticate()
        with db() as conn:
            purge(conn)
            rows = conn.execute('SELECT id,at,network,data FROM events ORDER BY at DESC LIMIT 1000').fetchall()
        return jsonify([dict(receipt=id, timestamp_utc=at, network_hmac=net, **json.loads(data)) for id,at,net,data in rows])
    @app.delete('/admin/events/<receipt>')
    def delete(receipt):
        authenticate()
        with db() as conn:
            conn.execute('DELETE FROM events WHERE id=?', (receipt,))
        return '', 204
    @app.get('/robots.txt')
    def robots():
        content='User-agent: *\nAllow: /\nDisallow: /admin/\n'
        if app.config['PUBLIC_URL']:
            content += 'Sitemap: '+app.config['PUBLIC_URL']+'/sitemap.xml\n'
        return content, 200, {'Content-Type':'text/plain'}
    @app.get('/sitemap.xml')
    def sitemap():
        from xml.sax.saxutils import escape
        if not app.config['PUBLIC_URL']:
            abort(503)
        urls=['/','/terms','/apply/directory','/apply/partner','/apply/contact']
        content='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        content+=''.join('<url><loc>'+escape(app.config['PUBLIC_URL']+p)+'</loc></url>' for p in urls)+'</urlset>'
        return content,200,{'Content-Type':'application/xml'}
    @app.cli.command('purge-events')
    def purge_events():
        with db() as conn:
            purge(conn)
        print('Expired records removed.')
    return app

SHELL = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>This Is a Legit Website | Form interaction research</title><meta name="description" content="An open form-interaction research project. Explore directory, partnership and contact demonstration forms using synthetic details."><style>
:root{color-scheme:light;--ink:#142c2a;--paper:#f4f3ec;--line:#d0d6cd;--accent:#d4ed8c}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.6 system-ui,sans-serif}a{color:inherit}header,main,footer{max-width:1180px;margin:auto;padding:28px 32px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);gap:20px}.brand{font-weight:800;text-decoration:none;letter-spacing:-.04em}.tag{font:12px monospace;text-transform:uppercase;letter-spacing:.14em}nav{display:flex;gap:22px}h1{font-size:clamp(42px,7vw,92px);line-height:1.03;letter-spacing:-.065em;max-width:900px;font-weight:650;margin:26px 0}h2{font-size:26px;line-height:1.2;letter-spacing:-.035em}p{max-width:690px}.intro{font-size:21px;color:#4d625c;max-width:620px}.hero{padding:42px 0 52px}.notice{border-left:4px solid #668544;padding:16px 20px;background:#e7ecd9;font-size:14px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:36px 0}.card{padding:28px;border:1px solid var(--line);border-radius:14px;background:#fffefa;display:flex;flex-direction:column}.card p{flex:1;color:#4d625c}.button,button{display:inline-block;background:var(--ink);color:white;border:0;border-radius:8px;padding:13px 22px;text-decoration:none;font:600 15px system-ui;cursor:pointer}.button:hover,button:hover{background:#315d4e}form{max-width:680px;background:#fffefa;border:1px solid var(--line);border-radius:16px;padding:30px;margin:30px 0}label{display:block;font-weight:600;margin:18px 0 6px}input,textarea,select{width:100%;padding:13px;border:1px solid #879c91;border-radius:6px;background:white;color:var(--ink);font:inherit}input[type=checkbox]{width:auto;margin-right:8px}input:focus,textarea:focus,select:focus,a:focus,button:focus{outline:3px solid #89a64b;outline-offset:3px}.trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}footer{font-size:13px;color:#52645b;border-top:1px solid var(--line);margin-top:55px}.policy{white-space:pre-wrap;max-width:850px;font:inherit}.small{font-size:13px;overflow-wrap:anywhere}.receipt{padding:28px;background:var(--accent);border-radius:14px;overflow-wrap:anywhere}@media(max-width:720px){header,main,footer{padding:22px}.cards{grid-template-columns:1fr}nav{font-size:13px}form{padding:20px}}
</style></head><body><header><a class="brand" href="/">this is a legit website<span aria-hidden="true"> ↗</span></a><nav><a href="/apply/directory">Apply</a><a href="/terms">Terms & privacy</a></nav></header><main>
{% if body == 'home' %}<section class="hero"><div class="tag">Independent web research / 001</div><h1>A little less friction.<br>A lot more understanding.</h1><p class="intro">Simple forms. Open pages. A closer look at how people and automated systems interact with the web.</p><a class="button" href="/apply/directory">Explore the application →</a></section>{% endif %}
<aside class="notice"><strong>Research demonstration.</strong> These forms do not offer jobs, funding, or services. Use synthetic details only. Submission metadata is recorded for 30 days. <a href="/terms">Read the research notice and rules</a>.</aside>
{% if body == 'home' %}<div class="cards"><article class="card"><div class="tag">01 / Directory</div><h2>Submit a listing</h2><p>A familiar business-directory application, with a short profile and an area of interest.</p><a href="/apply/directory">Open directory form →</a></article><article class="card"><div class="tag">02 / Partnerships</div><h2>Start a conversation</h2><p>Try a partnership inquiry with a fictional organization and a sample introduction.</p><a href="/apply/partner">Open partnership form →</a></article><article class="card"><div class="tag">03 / Contact</div><h2>Send a test inquiry</h2><p>A straightforward contact flow for studying form interaction and submission patterns.</p><a href="/apply/contact">Open contact form →</a></article></div><h2>Open to reading. Clear about submitting.</h2><p>Our public pages are available for browsing and indexing. Automated submissions require prior written permission from the operator. All visitors see the same content.</p>
{% elif body == 'form' %}<h1 style="font-size:52px">{{ kind|capitalize }} application.</h1><p>Use a fictional name and test content. No application will be processed as a commercial request.</p><form method="post"><input type="hidden" name="token" value="{{ token }}"><label for="name">Test name / organization</label><input id="name" name="name" maxlength="120" required autocomplete="off" placeholder="Example Company"><label for="email">Test email (optional)</label><input type="email" id="email" name="email" maxlength="254" placeholder="example@example.com" autocomplete="off"><label for="message">Sample application</label><textarea id="message" name="message" maxlength="2000" rows="5" required placeholder="Describe a fictional request."></textarea><label for="automation">How are you completing this form?</label><select name="automation" id="automation" required><option value="">Select one</option><option value="human">Manually</option><option value="assisted">With an assistant</option><option value="automated">Automatically</option></select><div class="trap" aria-hidden="true"><label for="fax">Leave blank</label><input id="fax" name="fax" tabindex="-1" autocomplete="off"></div><label><input type="checkbox" name="consent" value="yes" required>I have read and accept the <a href="/terms">terms and privacy notice</a>, including submission metadata logging.</label><p class="small">Automation requires prior written permission. Acceptance is recorded; it does not independently verify identity or authority.</p><button type="submit">Submit test application →</button></form>
{% elif body == 'terms' %}<h1 style="font-size:52px">Terms & privacy.</h1><p>Version {{ version }}</p><div class="policy">{{ policy }}</div><p class="small">Policy SHA-256: {{ digest }}</p>
{% elif body == 'receipt' %}<h1 style="font-size:52px">Submission receipt.</h1><div class="receipt"><strong>{{ outcome|replace('_',' ')|capitalize }}</strong><p>Receipt: {{ receipt }}</p></div><p>This is a research record, not confirmation of a real application. Submitted names, email addresses and message contents were not retained by this application.</p><a href="/">Return home →</a>{% endif %}
</main><footer>© Authentic Dynamics LLC · Form-interaction research · <a href="/terms">Terms & privacy</a>{% if contact %}<p>Privacy contact: {{ contact }}</p>{% else %}<p>Preview configuration — operator contact must be set before public launch.</p>{% endif %}</footer></body></html>'''
