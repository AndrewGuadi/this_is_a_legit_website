"""Read-only deployment configuration checks. Never prints secret values."""
import os
from pathlib import Path
from urllib.parse import urlsplit


def check(env):
    issues=[]
    secrets=[env.get(name,'') for name in ('SECRET_KEY','NETWORK_KEY','ADMIN_TOKEN')]
    if any(len(value)<32 for value in secrets):
        issues.append('Set three independent random secrets of at least 32 characters.')
    if len(set(secrets))!=3:
        issues.append('Signing, network-HMAC and administrator secrets must differ.')
    origin=urlsplit(env.get('PUBLIC_URL',''))
    if origin.scheme!='https' or not origin.hostname or origin.username or origin.password or origin.query or origin.fragment or origin.path not in ('','/'):
        issues.append('PUBLIC_URL must be a plain HTTPS origin without credentials, query or path.')
    if not env.get('PRIVACY_CONTACT','').strip():
        issues.append('Set a monitored privacy contact.')
    db=env.get('DB_PATH','')
    if not db or not Path(db).is_absolute():
        issues.append('DB_PATH must name an absolute persistent database path outside public assets.')
    elif any(part in ('static','public','dist') for part in Path(db).parts):
        issues.append('The database must not be in a public asset directory.')
    if env.get('FLASK_DEBUG','').lower() in ('1','true','yes'):
        issues.append('Disable Flask debug mode for deployment.')
    return issues

if __name__=='__main__':
    problems=check(os.environ)
    for problem in problems:
        print('FAIL:',problem)
    if not problems:
        print('Configuration shape passes. Hosting, TLS, retention schedule, proxy identity and backups still require operational verification.')
    raise SystemExit(bool(problems))
