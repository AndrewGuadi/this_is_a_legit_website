# Controlled HTTP benchmark

Run from the repository root:

```sh
python tests/research/runner.py
```

The command writes `docs/benchmark-result.json` and exits nonzero if any expected HTTP/state trace fails. `--output PATH` writes a separate result. Each condition uses its own temporary SQLite database and independent ephemeral random keys. Temporary databases are deleted after inspection. The manifest retains task instructions, declared method, supplied fixture permission, timestamps, receipt identifiers, expected/observed statuses and event outcomes, client/package versions, policy digest, and application source digest. It contains no keys, raw network addresses, or entered form values.

## Executed result

Local execution on 2026-10-19: **9 of 9 tasks matched their specified HTTP and database outcomes**. Denominators: nine explicitly issued tasks, 39 POST attempts, 38 ordinary event records, and one rate-limited aggregate attempt. No-attempt is a measured zero POST trace from a deterministic guard; an exception/mismatch is retained separately as indeterminate.

| Condition | Tasks | POSTs | Expected HTTP trace | Final task classification |
|---|---:|---:|---|---|
| Manual declaration simulation | 1 | 1 | 200 | Successful submission |
| Authorized automation fixture | 1 | 1 | 200 | Successful submission |
| Permission denied guard | 1 | 0 | No POST | No attempt |
| Assisted declaration simulation | 1 | 1 | 200 | Successful submission |
| Missing token | 1 | 1 | 400 | Rejected attempt |
| Expired token | 1 | 1 | 400 | Rejected attempt |
| Replay | 1 | 2 | 200, 409 | Rejected attempt |
| Unchecked acceptance | 1 | 1 | 400 | Rejected attempt |
| Rate-limit stress | 1 | 31 | 30 × 400, then 429 | Rejected attempt |

Final classification counts: three successful-submission tasks, five rejected-attempt tasks, one no-attempt task, zero indeterminate tasks. Classification uses the final request; full traces preserve setup requests (for example the successful first request before a replay rejection). Task counts and event counts are deliberately distinct.

H2 is tested by checking exact stored outcomes, not just status codes: replay produces `replayed_form_token`, unchecked acceptance produces `missing_required_fields_or_acceptance`, and valid requests produce `recorded`. All stored authorization assertions remain `not_verified`; fixture permission is a separate controlled annotation.

## Interpretation limits

This runner tests deterministic HTTP behavior and research bookkeeping. It does not run an autonomous AI client or recruit humans. “Manual” and “assisted” are simulated declarations, not human participants. The permission guard is explicit program logic and does not establish that a model understands or obeys instructions. H1 remains an empirical question requiring actual versioned clients under allowed/denied task conditions. H3 requires separate investigator usability evidence.

One task per condition validates this fixture, not a population-wide success/compliance rate. Organic page exposure is not logged; this result cannot estimate what proportion of bots encountered the website. The application clock is fixed within each trial to avoid a slow runner crossing a rate window; no latency or cognition conclusions are justified. Infrastructure exceptions remain indeterminate issued tasks rather than being dropped from the denominator.
