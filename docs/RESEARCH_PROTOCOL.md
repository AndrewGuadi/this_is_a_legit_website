# Form interaction study — protocol v1

## Purpose

Study how clients interact with explicit form-submission rules, distinguishing what the server observed from what an investigator infers. This is not an identity attribution service, a legal-enforcement finding, or a claim to conceal the experiment from capable agents.

## Hypotheses

H1: A client that enforces a supplied instruction to obtain submission permission will not submit without that permission.
H2: Token replay and missing-acceptance requests are distinguished from accepted requests reliably.
H3: An investigator can find and correctly interpret a target event using the private interface.

## Controlled benchmark

Use an isolated synthetic database. Record the test client name/version, exact task instruction, permission condition, start/end time, and receipt identifiers in a separate benchmark manifest. Do not mix benchmark traffic with real collected events.

Conditions: manual synthetic submission; authorized automation; automation instructed not to submit without permission; assisted human submission; missing token; expired token; replay; unchecked acceptance; rate-limit stress. Automated tests simulate HTTP clients, not general-purpose AI cognition. Generalize only to clients actually tested.

The runtime cannot infer authorization from the user-agent or checkbox. Authorization is **unknown** for organic traffic unless a separate permission record establishes it. A benchmark permission condition is ground truth only inside the controlled benchmark. A hidden field or short timing is a signal, not proof of a bot.

## Denominators and outputs

For controlled trials, N is the number of explicitly issued benchmark tasks. Report successful submission, rejected attempt, no attempt, and indeterminate outcomes separately. Do not use received submissions as the denominator for all site visitors or bots that encountered the site. Public GET traffic is not collected by the application; organic exposure/compliance rates therefore cannot be estimated.

Report condition-specific counts with sample sizes; do not claim population-wide rates from a small convenience sample. Every summary should retain unknowns and failed trials. Set a priori target: deterministic HTTP outcome tests must match expected status/state for every case; investigator usability tests must complete the target workflow without a critical error. AI-client behavior is a measured outcome, not a pass condition to manipulate.

## Collection contract

Only submission metadata is stored: timestamp, receipt, form type, outcome, terms version/digest, user-agent (bounded and untrusted), HMAC network pseudonym, field lengths, acceptance assertion, declared automation, honeypot presence, and timing when a valid token provides it. No raw submitted name/email/message or raw IP is retained by the app. Hosting logs have a separate lifecycle and must be verified before public deployment.

Do not add identifiers, fingerprinting, external enrichment or cross-site tracking to improve attribution without a specific reviewed purpose and updated disclosure. Do not promise that terms acceptance creates legally enforceable authority over an operator.

## Limitations

Visible disclosures change who participates. Automated agents can read them. Unknown actors may lie in fields/headers; proxies and shared networks confound pseudonyms. Network HMACs can link requests but do not identify people. Token possession does not prove the terms were read. Clock measurements describe server processing, not cognition. SQLite records can be modified by an administrator and are not tamper-proof evidence.

### Rate-limit accounting (policy 2026-10-19-v2)

Requests blocked by the submission limit increment a bounded aggregate row per observed network HMAC/minute, retained for 24 hours. The dashboard shows this global count separately from its filtered event records; it is not a visitor denominator or proof of identity. Aggregates contain counts, timestamps and network HMAC only, no form bodies. Ordinary observation records retain the 30-day policy. Purge tasks handle both lifecycles.
