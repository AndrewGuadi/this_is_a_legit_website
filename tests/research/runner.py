"""Controlled synthetic HTTP benchmark; no human or AI-agent cognition is tested."""
import argparse
import hashlib
import importlib.metadata
import json
import re
import secrets
import sqlite3
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from app import create_app, VERSION, POLICY_HASH
from itsdangerous import URLSafeTimedSerializer


def utc():
    return datetime.now(timezone.utc).isoformat()


CONDITIONS = [
    ('manual_simulation', 'Simulate one manual form submission with synthetic values and acceptance.', True, 'human', [200]),
    ('authorized_automation', 'Submit one synthetic application; written permission is supplied in this controlled fixture.', True, 'automated', [200]),
    ('permission_guard', 'Do not submit unless this fixture supplies written permission. Permission is not supplied.', False, 'automated', []),
    ('assisted_simulation', 'Simulate an assisted submission with synthetic values and acceptance.', True, 'assisted', [200]),
    ('missing_token', 'Submit synthetic values with acceptance but omit the form token.', True, 'automated', [400]),
    ('expired_token', 'Submit synthetic values with a token signed 3601 seconds before the trial.', True, 'automated', [400]),
    ('replay', 'Submit a valid synthetic application, then repeat the same token once.', True, 'automated', [200, 409]),
    ('unchecked_acceptance', 'Submit a fresh valid form token and synthetic values without asserting acceptance.', True, 'automated', [400]),
    ('rate_limit_stress', 'Submit 31 tokenless synthetic requests from one observed network within a single rate window.', True, 'automated', [400]*30+[429]),
]


def run_condition(spec):
    name,instruction,permission,declared,expected=spec
    started=utc()
    statuses=[]
    records=[]
    blocked=0
    error=None
    with tempfile.TemporaryDirectory(prefix='legit-benchmark-') as directory:
        database=Path(directory)/'observations.sqlite3'
        config=dict(TESTING=True,APP_ENV='development',DB_PATH=str(database),
                    SECRET_KEY=secrets.token_urlsafe(48),NETWORK_KEY=secrets.token_urlsafe(48),
                    ADMIN_TOKEN=secrets.token_urlsafe(48),PUBLIC_URL='https://benchmark.invalid',
                    CONTACT='synthetic@example.invalid')
        application=create_app(config)
        client=application.test_client()
        epoch=int(time.time())
        try:
            # Freeze the relevant application clock so the 31-request stress trial
            # cannot accidentally cross a minute/window boundary on a slow machine.
            with patch('app.time.time',return_value=epoch):
                html=client.get('/apply/directory').get_data(as_text=True)
                token=re.search(r'name="token" value="([^"]+)"',html).group(1)
                data=dict(token=token,name='Synthetic Fixture',email='fixture@example.invalid',
                          message='Controlled benchmark; not a real application.',consent='yes',automation=declared)
                if name=='permission_guard':
                    # This is an explicit deterministic program branch, not a
                    # measurement of whether an AI model understands instructions.
                    assert not permission
                else:
                    if name in ('missing_token','rate_limit_stress'): data.pop('token')
                    if name=='unchecked_acceptance': data.pop('consent')
                    if name=='expired_token':
                        signer=URLSafeTimedSerializer(config['SECRET_KEY'],salt='form-v1')
                        with patch('itsdangerous.timed.TimestampSigner.get_timestamp',return_value=epoch-3601):
                            data['token']=signer.dumps(dict(nonce=secrets.token_hex(24),issued=epoch-3601,kind='directory',version=VERSION))
                    for _ in expected:
                        result=client.post('/apply/directory',data=data,headers={'User-Agent':'LegitSyntheticBenchmark/1.0'})
                        statuses.append(result.status_code)
            with sqlite3.connect(database) as conn:
                for receipt,at,payload in conn.execute('SELECT id,at,data FROM events ORDER BY rowid'):
                    event=json.loads(payload)
                    records.append(dict(receipt=receipt,timestamp_utc=at,outcome=event['outcome'],
                                        automation_declared=event['automation_declared'],authorization_status=event['authorization_status']))
                blocked=conn.execute('SELECT COALESCE(SUM(count),0) FROM blocked_attempts').fetchone()[0]
        except Exception as exc:
            # Keep failed trials without copying exception messages that could
            # include local paths, credentials, or other incidental data.
            error=type(exc).__name__
    expected_outcomes={
        'manual_simulation':['recorded'],'authorized_automation':['recorded'],'permission_guard':[],
        'assisted_simulation':['recorded'],'missing_token':['invalid_or_expired_form_token'],
        'expired_token':['invalid_or_expired_form_token'],'replay':['recorded','replayed_form_token'],
        'unchecked_acceptance':['missing_required_fields_or_acceptance'],
        'rate_limit_stress':['invalid_or_expired_form_token']*30,
    }[name]
    matched=error is None and statuses==expected and [r['outcome'] for r in records]==expected_outcomes and blocked==(1 if name=='rate_limit_stress' else 0)
    classification='indeterminate' if not matched else ('no_attempt' if not statuses else ('successful_submission' if statuses[-1]==200 else 'rejected_attempt'))
    return dict(condition=name,task_instruction=instruction,client='deterministic Flask/Werkzeug HTTP simulator',
        permission_supplied_in_fixture=permission,declared_method=declared,started_utc=started,ended_utc=utc(),
        expected_statuses=expected,observed_statuses=statuses,expected_record_outcomes=expected_outcomes,
        records=records,rate_limited_aggregate=blocked,matched_expected=matched,task_classification=classification,error_type=error)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'docs/benchmark-result.json')
    args=parser.parse_args()
    started=utc()
    trials=[]
    for spec in CONDITIONS:
        try:
            trials.append(run_condition(spec))
        except Exception as exc:
            # Initialization/infrastructure failures still count as issued tasks.
            name,instruction,permission,declared,expected=spec
            trials.append(dict(condition=name,task_instruction=instruction,
                permission_supplied_in_fixture=permission,declared_method=declared,
                expected_statuses=expected,observed_statuses=[],records=[],
                matched_expected=False,task_classification='indeterminate',error_type=type(exc).__name__))
    counts={name:sum(t['task_classification']==name for t in trials) for name in
            ('successful_submission','rejected_attempt','no_attempt','indeterminate')}
    result=dict(benchmark_version='1.0',protocol='RESEARCH_PROTOCOL.md v1 / H2 deterministic HTTP controls',
        started_utc=started,ended_utc=utc(),scope='Synthetic HTTP simulator only; no real humans or autonomous AI clients tested.',
        versions=dict(python=sys.version.split()[0],flask=importlib.metadata.version('flask'),
                      werkzeug=importlib.metadata.version('werkzeug'),itsdangerous=importlib.metadata.version('itsdangerous'),
                      policy=VERSION,policy_sha256=POLICY_HASH,app_sha256=hashlib.sha256((ROOT/'app.py').read_bytes()).hexdigest()),
        denominator=dict(issued_tasks=len(trials),post_attempts=sum(len(t['observed_statuses']) for t in trials),
                         received_event_records=sum(len(t['records']) for t in trials)),
        task_classification_rule='Classify by final expected request; preceding requests remain in each full trace. A mismatch or exception is indeterminate.',
        task_counts=counts,matched_tasks=sum(t['matched_expected'] for t in trials),trials=trials,
        limitations=['Each condition has one issued task; this is not a population sample.',
                     'Manual and assisted labels are simulated declarations, not human trials.',
                     'The permission guard is coded explicitly; no AI instruction-following claim follows.',
                     'Controlled permission is fixture ground truth, while recorded authorization remains not_verified.',
                     'Public GET exposure is not collected; no organic compliance rate can be inferred.',
                     'A fixed application clock stabilizes rate-window testing; latency/cognition are not measured.'])
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(dict(matched_tasks=result['matched_tasks'],issued_tasks=len(trials),task_counts=counts)))
    return 0 if all(t['matched_expected'] for t in trials) else 1


if __name__=='__main__':
    raise SystemExit(main())
