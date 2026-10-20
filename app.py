"""First-party form observation. Run behind HTTPS; see README before deployment."""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path
from contextlib import contextmanager
from urllib.parse import urlsplit
from datetime import datetime, timezone, timedelta
from flask import Flask, abort, jsonify, make_response, render_template, request, session, redirect, url_for
from werkzeug.exceptions import SecurityError
from deployment.deletion_ledger import record_deletion, default_ledger_path
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from game_catalog import GAMES

VERSION = '2026-10-20-v6'
POLICY = '''Legit Arcade is a browser-game project with a secondary form-interaction research section, operated by Authentic Dynamics LLC.
The game catalog currently contains planned concepts, not playable releases. Browsing the catalog does not create a form observation.
No employment, grant, purchase, or service is offered through these forms. Use synthetic test details only.
Public pages may be read and indexed. Automated submissions require prior written operator permission;
permission to read or index does not grant permission to submit. Do not submit another person's information.
We record submission attempts for abuse analysis: UTC time, form type, field lengths, declared automation,
consent checkbox state, terms version, elapsed time, HTTP outcome, and a pseudonymous network identifier.
The identifier is an HMAC of the server-observed address; raw addresses and submitted names, emails, and
messages are not stored by this application. The user-agent header is retained, limited to 300 characters.
We use no advertising trackers, cross-site cookies, or device fingerprinting.
Observation records expire from investigator reads after 30 days. Rate-limited attempts are counted
per pseudonymous network and minute; these separate aggregate counts expire from reads after 24 hours.
Collection pauses at resource limits; observations are not a complete traffic census.
After operator deletion, a separate journal retains only the receipt identifier and deletion time to
prevent restoration of deleted records. Journal entries become eligible for cleanup after 48 hours;
the journal contains no submission or network metadata. Managed backups cannot be restored after their
configured expiry, which is at most 24 hours. They are physically removed by scheduled cleanup.
The production supervisor runs cleanup before serving traffic and then every 15 minutes by default
(configurable from 30 seconds to one hour). Physical cleanup of expired rows and managed backup files
occurs on the next successful cycle; downtime or failed maintenance can delay physical removal.
Cleanup is logical database/file deletion, not a guarantee of forensic erasure from storage media.
External exports, host snapshots, and provider access logs have separate operator/provider controls;
they are not automatically removed by application cleanup. Provider logs may contain raw addresses.
No records are sold or published.
A checked box records a request's assertion, not proof of identity, human consent, operator authority, or a legal violation.
For privacy questions or deletion requests, use the operator contact configured on this page and include your receipt ID.
'''
POLICY_HASH = hashlib.sha256(POLICY.encode()).hexdigest()

class CollectionCapacity(Exception):
    pass

def create_app(config=None):
    app = Flask(__name__)
    app.config.update(SECRET_KEY=os.environ.get('SECRET_KEY'), ADMIN_TOKEN=os.environ.get('ADMIN_TOKEN'),
        NETWORK_KEY=os.environ.get('NETWORK_KEY'), DB_PATH=os.environ.get('DB_PATH', str(Path(__file__).parent / 'instance/events.sqlite3')),
        PUBLIC_URL=os.environ.get('PUBLIC_URL', '').rstrip('/'), CONTACT=os.environ.get('PRIVACY_CONTACT', ''),
        APP_ENV=os.environ.get("APP_ENV","development"),
        MAX_EVENTS=int(os.environ.get("MAX_EVENTS","100000")),
        MAX_USED_TOKENS=int(os.environ.get("MAX_USED_TOKENS","100000")),
        MAX_RATE_ROWS=int(os.environ.get("MAX_RATE_ROWS","50000")),
        MAX_BLOCKED_ROWS=int(os.environ.get("MAX_BLOCKED_ROWS","10000")),
        GLOBAL_SUBMISSIONS_PER_MINUTE=int(os.environ.get("GLOBAL_SUBMISSIONS_PER_MINUTE","1000")),
        MAX_CONTENT_LENGTH=16384, MAX_FORM_MEMORY_SIZE=16384, MAX_FORM_PARTS=20, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Strict",
        SESSION_COOKIE_SECURE=True, PERMANENT_SESSION_LIFETIME=timedelta(minutes=30))
    if config:
        app.config.update(config)
    for key in ('SECRET_KEY', 'NETWORK_KEY', 'ADMIN_TOKEN'):
        if not app.config.get(key) or len(app.config[key]) < 32:
            raise RuntimeError(f'{key} must be configured with at least 32 random characters')
    for key in ('MAX_EVENTS','MAX_USED_TOKENS','MAX_RATE_ROWS','MAX_BLOCKED_ROWS','GLOBAL_SUBMISSIONS_PER_MINUTE'):
        if not isinstance(app.config[key],int) or not 1 <= app.config[key] <= 1000000:
            raise RuntimeError(f'{key} must be between 1 and 1000000')
    if len({app.config[key] for key in ('SECRET_KEY','NETWORK_KEY','ADMIN_TOKEN')}) != 3:
        raise RuntimeError('Use distinct secrets for sessions, network identifiers, and operator access')
    if app.config['APP_ENV'] == 'production':
        public=urlsplit(app.config['PUBLIC_URL'])
        if public.scheme != 'https' or not public.hostname or public.username or public.password or public.path not in ('','/') or public.query or public.fragment:
            raise RuntimeError('Production PUBLIC_URL must be an HTTPS origin')
        if not app.config['CONTACT'].strip() or not app.config['SESSION_COOKIE_SECURE'] or app.config['DEBUG']:
            raise RuntimeError('Production requires operator contact, secure cookies, and DEBUG disabled')
        app.config['TRUSTED_HOSTS']=[public.hostname]
    Path(app.config['DB_PATH']).parent.mkdir(parents=True, exist_ok=True)
    @contextmanager
    def db():
        conn = sqlite3.connect(app.config['DB_PATH'], timeout=3)
        try:
            conn.execute('PRAGMA secure_delete=ON')
            with conn:
                yield conn
        finally:
            conn.close()
    with db() as conn:
        conn.execute('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, at INTEGER, network TEXT, data TEXT)')
        conn.execute('CREATE INDEX IF NOT EXISTS events_at ON events(at)')
        conn.execute('CREATE TABLE IF NOT EXISTS admin_sessions (digest TEXT PRIMARY KEY, expires INTEGER)')
        conn.execute('CREATE TABLE IF NOT EXISTS used_tokens (nonce TEXT PRIMARY KEY, at INTEGER)')
        conn.execute('CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT, at INTEGER)')
        conn.execute('CREATE INDEX IF NOT EXISTS rates_bucket_at ON rate_limits(bucket, at)')
        conn.execute('CREATE TABLE IF NOT EXISTS blocked_attempts (network TEXT, window INTEGER, count INTEGER, PRIMARY KEY(network,window))')
    signer = URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='form-v1')
    def purge(conn):
        conn.execute('DELETE FROM admin_sessions WHERE expires <= ?', (int(time.time()),))
        conn.execute('DELETE FROM events WHERE at < ?', (int(time.time())-30*86400,))
        conn.execute('DELETE FROM used_tokens WHERE at < ?', (int(time.time())-7200,))
        conn.execute('DELETE FROM rate_limits WHERE at < ?', (int(time.time())-3600,))
        conn.execute('DELETE FROM blocked_attempts WHERE window < ?', (int(time.time())-86400,))
    def network():
        # Deliberately do NOT trust arbitrary X-Forwarded-For headers.
        return hmac.new(app.config['NETWORK_KEY'].encode(), (request.remote_addr or 'unknown').encode(), hashlib.sha256).hexdigest()
    def record(kind, outcome, signals):
        receipt = secrets.token_hex(16)
        data = dict(schema_version=1, authorization_status="not_verified", form=kind, outcome=outcome, terms_version=VERSION, terms_sha256=POLICY_HASH,
                    user_agent=request.headers.get('User-Agent', '')[:300], **signals)
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            purge(conn)
            if conn.execute('SELECT COUNT(*) FROM events').fetchone()[0] >= app.config['MAX_EVENTS']:
                raise CollectionCapacity()
            conn.execute('INSERT INTO events VALUES (?,?,?,?)', (receipt, int(time.time()), network(), json.dumps(data)))
        return receipt
    def page(body, **kwargs):
        return render_template('public.html', body=body, contact=app.config['CONTACT'], **kwargs)
    @app.after_request
    def headers(response):
        response.headers['Content-Security-Policy'] = "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cache-Control'] = 'no-store'
        if request.path.startswith('/admin'):
            response.headers['X-Robots-Tag'] = 'noindex, nofollow'
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response
    def limited(bucket, maximum, seconds):
        # Serialize reservation, not just counting: concurrent requests cannot overshoot.
        with db() as conn:
            conn.execute('BEGIN IMMEDIATE')
            purge(conn)
            now = int(time.time())
            if conn.execute('SELECT COUNT(*) FROM rate_limits').fetchone()[0] >= app.config['MAX_RATE_ROWS']:
                raise CollectionCapacity()
            if bucket.startswith('submit:'):
                if conn.execute('SELECT COUNT(*) FROM events').fetchone()[0] >= app.config['MAX_EVENTS']:
                    raise CollectionCapacity()
                global_count=conn.execute("SELECT COUNT(*) FROM rate_limits WHERE bucket LIKE 'submit:%' AND at>?",(now-60,)).fetchone()[0]
                if global_count >= app.config['GLOBAL_SUBMISSIONS_PER_MINUTE']:
                    raise CollectionCapacity()
            count = conn.execute('SELECT COUNT(*) FROM rate_limits WHERE bucket=? AND at>?', (bucket, now-seconds)).fetchone()[0]
            if count >= maximum:
                if bucket.startswith('submit:'):
                    exists=conn.execute('SELECT 1 FROM blocked_attempts WHERE network=? AND window=?',(bucket[7:],now//60*60)).fetchone()
                    if not exists and conn.execute('SELECT COUNT(*) FROM blocked_attempts').fetchone()[0] >= app.config['MAX_BLOCKED_ROWS']:
                        raise CollectionCapacity()
                    conn.execute('INSERT INTO blocked_attempts VALUES (?,?,1) ON CONFLICT(network,window) DO UPDATE SET count=count+1', (bucket[7:],now//60*60))
                return True
            conn.execute('INSERT INTO rate_limits VALUES (?,?)', (bucket, now))
        return False
    def unavailable(error):
        # Never include SQL/path/request details in user-visible output or logs.
        response=make_response(page('error',title='Collection is temporarily paused.',message='This request could not be saved. Please wait and try again later. No receipt has been issued.'),503)
        response.headers['Retry-After']='60'
        return response
    app.register_error_handler(sqlite3.Error,unavailable)
    app.register_error_handler(OSError,unavailable)
    app.register_error_handler(CollectionCapacity,unavailable)
    app.register_error_handler(503,unavailable)
    def request_error(error):
        if isinstance(error,SecurityError):
            return 'Invalid request host.',400,{'Content-Type':'text/plain; charset=utf-8'}
        messages={400:('Check this request.','The request could not be verified. Refresh the form or check your date filters and try again.'),
            401:('Authentication required.','An operator credential is required to access this resource.'),
            403:('Access unavailable.','This request is not permitted.'),
            404:('Page not found.','That page or observation is not available. Return home to continue.'),
            405:('Request method unavailable.','Please use the controls on the page to perform this action.'),
            413:('This submission is too large.','Please shorten your test content and submit a smaller form.'),
            429:('A short pause.','Too many attempts. Please wait one minute before trying again.')}
        title,message=messages[error.code]
        response=make_response(page('error',title=title,message=message),error.code)
        if error.code==429: response.headers['Retry-After']='60'
        return response
    for code in (400,401,403,404,405,413,429):
        app.register_error_handler(code,request_error)
    @app.get('/')
    def home():
        return render_template('arcade.html', view='home', games=GAMES, game=GAMES[0])
    @app.get('/forms')
    def forms():
        return page('home')
    @app.get('/games/<slug>')
    def game_concept(slug):
        game = next((item for item in GAMES if item['slug'] == slug), None)
        if game is None: abort(404)
        return render_template('arcade.html', view='game', games=GAMES, game=game)
    @app.get('/terms')
    def terms():
        return page('terms', policy=POLICY, version=VERSION, digest=POLICY_HASH)
    @app.route('/apply/<kind>', methods=['GET', 'POST'])
    def apply(kind):
        if kind not in ('directory', 'partner', 'contact'):
            abort(404)
        if request.method == 'GET':
            token = signer.dumps(dict(nonce=secrets.token_hex(24), issued=time.time(), kind=kind, version=VERSION))
            return page('form', kind=kind, token=token, values={}, error=None)
        now = int(time.time())
        if limited('submit:'+network(), 30, 60):
            response = make_response(page('error',title='A short pause.',message='Too many submission attempts. Please wait one minute before trying again.'), 429)
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
                conn.execute('BEGIN IMMEDIATE')
                if conn.execute('SELECT COUNT(*) FROM used_tokens').fetchone()[0] >= app.config['MAX_USED_TOKENS']:
                    raise CollectionCapacity()
                conn.execute('INSERT INTO used_tokens VALUES (?,?)', (payload['nonce'], now))
        except (BadSignature, SignatureExpired, KeyError, TypeError):
            status, outcome = 400, 'invalid_or_expired_form_token'
        except sqlite3.IntegrityError:
            status, outcome = 409, 'replayed_form_token'
        if status == 200 and (not signals['consent_asserted'] or not fields.get('name','').strip() or not fields.get('message','').strip() or signals['automation_declared']=='unspecified'):
            status, outcome = 400, 'missing_required_fields_or_acceptance'
        if status == 200 and any(signals['field_lengths'][k] > limit for k,limit in [('name',120),('email',254),('message',2000)]):
            status, outcome = 400, 'field_length_exceeded'
        receipt = record(kind, outcome, signals)
        if status != 200:
            token = signer.dumps(dict(nonce=secrets.token_hex(24), issued=time.time(), kind=kind, version=VERSION))
            errors = {
                'invalid_or_expired_form_token':'This form expired or could not be verified. Please review your entries and submit again.',
                'replayed_form_token':'This form was already submitted. A new form token is ready if you intend another test.',
                'missing_required_fields_or_acceptance':'Complete the test name, sample application, method, and terms acceptance.',
                'field_length_exceeded':'Keep the name under 121 characters, email under 255, and application under 2001.',
            }
            # Reflect values only into this escaped response; never store them in logs or session.
            values={key:fields.get(key,'') for key in ('name','email','message','automation','consent')}
            return page('form',kind=kind,token=token,values=values,error=errors[outcome],receipt=receipt,outcome=outcome),status
        return page('receipt', receipt=receipt, outcome=outcome), status
    def authenticate():
        expected = 'Bearer ' + app.config['ADMIN_TOKEN']
        if not hmac.compare_digest(request.headers.get('Authorization','').encode(), expected.encode()):
            abort(401)
    def csrf():
        if 'csrf_token' not in session:
            session['csrf_token'] = secrets.token_urlsafe(32)
        return session['csrf_token']
    def check_csrf():
        if not session.get('csrf_token') or not hmac.compare_digest(session['csrf_token'].encode(),request.form.get('csrf_token','').encode()):
            abort(400)
    def signed_in():
        sid=session.get('admin_sid')
        if session.get('admin') is not True or not isinstance(sid,str): return False
        with db() as conn:
            return conn.execute('SELECT 1 FROM admin_sessions WHERE digest=? AND expires>?',
                (hashlib.sha256(sid.encode()).hexdigest(),int(time.time()))).fetchone() is not None
    def event_rows(page_number=None):
        filters = {key:request.args.get(key,'') for key in ('form','outcome','since','until')}
        where, args = [], []
        for key in ('form','outcome'):
            if filters[key]:
                where.append("json_extract(data, '$."+key+"')=?")
                args.append(filters[key])
        for key,op in [('since','>='),('until','<')]:
            if filters[key]:
                try:
                    date=datetime.strptime(filters[key],'%Y-%m-%d').replace(tzinfo=timezone.utc)
                except ValueError:
                    abort(400)
                if key=='until':
                    try: date += timedelta(days=1)
                    except OverflowError: abort(400)
                where.append('at'+op+'?'); args.append(int(date.timestamp()))
        clause = ' WHERE '+' AND '.join(where) if where else ''
        with db() as conn:
            purge(conn)
            counts=conn.execute("SELECT COUNT(*),COALESCE(SUM(json_extract(data,'$.outcome')='recorded'),0),COALESCE(SUM(json_extract(data,'$.automation_declared')='automated'),0) FROM events"+clause,args).fetchone()
            total,recorded,automated=counts
            total_pages=max(1,(total+24)//25)
            page_number=min(page_number,total_pages) if page_number is not None else None
            limit=' LIMIT 25 OFFSET ?' if page_number is not None else ' LIMIT 1000'
            row_args=args+[(page_number-1)*25] if page_number is not None else args
            rows=conn.execute('SELECT id,at,network,data FROM events'+clause+' ORDER BY at DESC,id DESC'+limit,row_args).fetchall()
        with db() as conn:
            blocked=conn.execute('SELECT COALESCE(SUM(count),0) FROM blocked_attempts').fetchone()[0]
        summary=dict(total=total,recorded=recorded,rejected=total-recorded,automated=automated,rate_limited=blocked)
        return [dict(receipt=id,timestamp_utc=at,timestamp_display=datetime.fromtimestamp(at,timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),network_hmac=net,**json.loads(data)) for id,at,net,data in rows], filters, summary, page_number, total_pages
    @app.route('/admin/login',methods=['GET','POST'])
    def admin_login():
        error=None
        status=200
        if request.method=='POST':
            check_csrf()
            if limited('login:'+network(),5,900):
                return render_template('admin.html',view='login',csrf_token=csrf(),error='Too many attempts. Try again in 15 minutes.'),429,{'Retry-After':'900'}
            if hmac.compare_digest(request.form.get('token','').encode(),app.config['ADMIN_TOKEN'].encode()):
                sid=secrets.token_urlsafe(32)
                with db() as conn:
                    conn.execute('BEGIN IMMEDIATE'); purge(conn)
                    if conn.execute('SELECT COUNT(*) FROM admin_sessions').fetchone()[0] >= 1000:
                        raise CollectionCapacity()
                    conn.execute('INSERT INTO admin_sessions VALUES (?,?)',
                        (hashlib.sha256(sid.encode()).hexdigest(),int(time.time())+1800))
                session.clear(); session['admin']=True; session['admin_sid']=sid; session.permanent=True; csrf()
                return redirect(url_for('admin_overview'))
            error='The operator credential was not accepted.'; status=401
        return render_template('admin.html',view='login',csrf_token=csrf(),error=error),status
    @app.post('/admin/logout')
    def admin_logout():
        check_csrf()
        sid=session.get('admin_sid')
        if isinstance(sid,str):
            with db() as conn:
                conn.execute('DELETE FROM admin_sessions WHERE digest=?',(hashlib.sha256(sid.encode()).hexdigest(),))
        session.clear()
        return redirect(url_for('admin_login'))
    @app.get('/admin')
    @app.get('/admin/')
    def admin_overview():
        if not signed_in(): return redirect(url_for('admin_login'))
        try: page_number=max(1,int(request.args.get('page','1')))
        except ValueError: abort(400)
        rows,filters,summary,page_number,total_pages=event_rows(page_number)
        return render_template('admin.html',view='overview',csrf_token=csrf(),rows=rows,
            total=summary['total'],page_number=page_number,total_pages=total_pages,filters=filters,summary=summary)
    @app.get('/admin/record/<receipt>')
    def admin_detail(receipt):
        if not signed_in(): return redirect(url_for('admin_login'))
        with db() as conn:
            purge(conn)
            row=conn.execute('SELECT id,at,network,data FROM events WHERE id=?',(receipt,)).fetchone()
        if not row: abort(404)
        id,at,net,data=row
        event=dict(receipt=id,timestamp_utc=at,timestamp_display=datetime.fromtimestamp(at,timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),network_hmac=net,**json.loads(data))
        return render_template('admin.html',view='detail',csrf_token=csrf(),event=event)
    def erase_event(receipt):
        # Journal commits before event deletion. No application write lock is held
        # while acquiring the separate ledger lock, avoiding cross-file deadlocks.
        with db() as conn:
            exists=conn.execute('SELECT 1 FROM events WHERE id=?',(receipt,)).fetchone()
        if exists:
            record_deletion(default_ledger_path(app.config['DB_PATH']),receipt)
            with db() as conn:
                conn.execute('DELETE FROM events WHERE id=?',(receipt,))
    @app.post('/admin/record/<receipt>/delete')
    def admin_delete(receipt):
        if not signed_in(): return redirect(url_for('admin_login'))
        check_csrf()
        if request.form.get('confirm') != 'yes': abort(400)
        erase_event(receipt)
        return redirect(url_for('admin_overview'))
    @app.get('/admin/export')
    def admin_export():
        if not signed_in(): return redirect(url_for('admin_login'))
        rows,_,summary,*_=event_rows()
        response=jsonify(rows)
        response.headers['X-Export-Total']=str(summary['total'])
        response.headers['X-Export-Truncated']='true' if summary['total']>len(rows) else 'false'
        response.headers['Content-Disposition']='attachment; filename="observation-events.json"'
        return response
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
        erase_event(receipt)
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
        urls=['/','/forms','/terms','/apply/directory','/apply/partner','/apply/contact'] + ['/games/'+game['slug'] for game in GAMES]
        content='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        content+=''.join('<url><loc>'+escape(app.config['PUBLIC_URL']+p)+'</loc></url>' for p in urls)+'</urlset>'
        return content,200,{'Content-Type':'application/xml'}
    @app.cli.command('purge-events')
    def purge_events():
        with db() as conn:
            purge(conn)
        print('Expired records removed.')
    return app
