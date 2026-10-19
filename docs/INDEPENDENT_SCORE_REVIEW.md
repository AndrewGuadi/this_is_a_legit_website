# Independent candidate review — 2026-10-19

**Verdict: REQUEST CHANGES for the development candidate; BLOCK public release and autonomous worker execution.** The requirement of at least 85/100 in every front is not met. These scores measure evidence-backed readiness, not market percentile or company valuation. The reviewer is an independent AI review role, not a person claiming a 25-year career.

The strongest demonstrated improvements are useful investigator workflows, atomic submission limiting, privacy-conscious records, recoverable forms, and manager-owned artifact comparison. Premium rendering, accessible interaction, controlled agent behavior, isolated worker execution, and actual operations remain unverified. The disabled runner is the correct fail-closed behavior; it is not a working swarm.

## Evidence independently executed

- `python -m unittest -v`: **18 passed** on this candidate (application and configuration checks).
- `python -m unittest discover -s orchestration -p 'test_*.py' -v`: **8 passed**, including immutable-baseline comparison, worker Git tampering resistance, unsafe archive rejection, empty-file patch transport, and execution refusal.
- `node --check static/forms.js`: passed earlier in this review; JavaScript hash unchanged.
- Supplemental isolated Flask-client checks: expired form rejected; second page contains six of 31 records; hostile user-agent markup escaped in detail; session cookie has Secure/HttpOnly/SameSite=Strict; a session older than 1,800 seconds redirects to login. These were reviewer-executed checks, not browser tests.
- An authenticated export with `until=9999-12-31` independently reproduced `OverflowError` before the final fix; the final regression now asserts a styled 400 and passes. Missing deletion confirmation is also now rejected server-side.

No Docker/model run, browser screenshots, keyboard interaction, screen-reader task, production hosting, alert delivery, scheduled purge, restore or rollback exercise was executed. Four text-token contrast ratios reported by the manager (11.23, 5.64, 12.26, 6.77) are partial supporting evidence, not a complete contrast audit. The manager supplied observed red→green results for the two final review fixes (missing confirmation and extreme-date overflow); reviewer independently verified the original overflow and the final green suite. Earlier increments have no retained red-stage evidence, so full-project TDD chronology is not established.

## Scoring method

Each row below has the five checks from `docs/QUALITY_SCORECARD.md`, in its original order. Each check is worth 20. Bands: 0 absent/contradicted; 5 plan only; 10 implemented/unverified; 15 partially verified; 20 independently verified. Static criteria can be fully verified by reading their actual artifact; interaction criteria require execution. Missing runtime evidence is not awarded source-inspection credit beyond the implemented band.

| Front | Five check scores, in rubric order | Total | Result |
|---|---|---:|---|
| 1. Purpose and research validity | 20, 20, 5, 20, 10 | **75** | Below 85 |
| 2. Information architecture and public UX | 15, 20, 15, 15, 10 | **75** | Below 85 |
| 3. Visual design and responsive polish | 15, 10, 10, 10, 0 | **45** | Below 85 |
| 4. Accessibility and motion | 15, 10, 15, 10, 0 | **50** | Below 85 |
| 5. Investigator usefulness | 20, 20, 20, 20, 15 | **95** | Meets numeric threshold |
| 6. Data quality and provenance | 20, 20, 20, 15, 15 | **90** | Meets numeric threshold |
| 7. Privacy and retention | 20, 15, 20, 10, 5 | **70** | Below 85 |
| 8. Backend correctness and security | 15, 20, 15, 20, 20 | **90** | Meets numeric threshold |
| 9. Agent isolation and review integrity | 20, 20, 20, 5, 10 | **75** | Below 85 |
| 10. Operations and release readiness | 10, 20, 5, 5, 5 | **45** | Below 85 |

No averaging substitutes for a failed front. Meeting a numeric threshold does not override defects or release blockers.

## Item evidence and next acceptance steps

### 1. Purpose and research validity — 75

1. **20 — Explicit hypotheses:** `docs/RESEARCH_PROTOCOL.md` states H1–H3 and scope; inspected directly.
2. **20 — Observation/interpretation:** protocol, public template, admin notice and `authorization_status=not_verified` consistently distinguish claims and evidence; regression asserts the unknown authorization field.
3. **5 — Controlled benchmark:** only the protocol exists. Execute and retain a synthetic trial manifest with client/version, instructions, permission condition and receipts, including no-attempt outcomes.
4. **20 — Denominators/limits:** protocol explicitly defines issued tasks as N and disclaims organic exposure rates; this documentary criterion is verified.
5. **10 — Measured conclusions:** deterministic HTTP outcomes are measured, but no H1 agent trial or H3 investigator usability outcome exists. Run those trials without generalizing HTTP tests to agent cognition.

### 2. Information architecture and public UX — 75

1. **15 — Navigation:** actual templates and successful route tests support the structure; browser navigation remains untested.
2. **20 — Truthful purpose:** disclosure and no-real-offer language appear on actual public responses.
3. **15 — Completion/receipt:** Flask POST and receipt flow pass; perceived usability is untested.
4. **15 — Error recovery:** escaped values, fresh token and resubmission pass; common status handlers render recovery UI. Browser focus/recovery and oversized-request value loss need testing.
5. **10 — Keyboard/no-JS:** native forms, labels and skip link exist. HTTP test clients do not verify keyboard or browser-native no-JS completion.

### 3. Visual design and responsive polish — 45

1. **15 — Tokens/typography:** coherent shared CSS and token usage inspected; real font/layout rendering unverified.
2. **10 — Mobile:** breakpoints implemented; obtain 360/390/768 px rendered evidence and inspect overflow.
3. **10 — Desktop:** composition implemented; inspect 1440 px and wider rendering.
4. **10 — States/stability:** error, receipt, hover, empty and focus styles exist; capture states and measure layout stability.
5. **0 — Comparative critique:** no named comparison set or rendered independent comparison supplied. Choose actual reference experiences and judge specific tasks and visual criteria.

### 4. Accessibility and motion — 50

1. **15 — Semantics:** labels, headings, descriptions and table headers inspected; full accessibility-tree behavior unverified.
2. **10 — Keyboard/focus:** focus CSS and skip link implemented; execute complete keyboard flows including error recovery and admin table scrolling.
3. **15 — Contrast:** partial token calculations supplied; audit all rendered text, controls, placeholders, focus and error states.
4. **10 — Reduced motion:** media query disables smooth scrolling/transitions/transforms; exercise actual browser preference.
5. **0 — Screen reader:** no task verification exists. Test form completion, error announcement, receipt, filters and deletion with a screen reader.

### 5. Investigator usefulness — 95

1. **20 — Authenticated overview:** unauthenticated redirect, login, logout and session protection independently exercised.
2. **20 — Filters/pagination:** automated date/form filtering and independent second-page check pass; final extreme-date regression returns 400.
3. **20 — Event detail:** detail response inspected and hostile header escaping independently exercised; source fields and unknowns are explicit.
4. **20 — Bounded export:** 1,005-record fixture exports 1,000 with explicit total/truncation headers; filtered export is tested.
5. **15 — Deletion/empty/errors:** authorization and CSRF deletion tests pass; empty state and errors implemented. Server-side confirmation now enforced and tested; actual user interaction remains untested.

### 6. Data quality and provenance — 90

1. **20 — Schema/policy:** schema version, v2 policy/hash and record assertions tested and inspected.
2. **20 — Source/unknowns:** bounded self-reported header, network HMAC and unverified authorization explicitly identified in protocol/UI.
3. **20 — Outcomes:** replay, missing token/acceptance, oversized fields and rejected outcomes independently rerun; supplemental expiry check passed.
4. **15 — Duplicates/limits:** replay and concurrent 30/36 reservation tests pass; separate 24-hour blocked counters and purge tests pass. Aggregation loses form detail and is not atomically coupled to event insertion; injected crash behavior remains untested.
5. **15 — Export consistency:** tested counts, privacy exclusions, policy hash and cap are useful; add an independent schema/type/invariant audit covering old schema records, all outcomes and aggregate reconciliation.

### 7. Privacy and retention — 70

1. **20 — Minimization:** payload exclusion tested and storage writes inspected; raw input contents are not persisted by app logic.
2. **15 — Disclosure/code match:** v2 discloses blocked aggregates; UI explains unknowns. One-hour rate-reservation data and operational expiry timing deserve precise documentation; retain scheduling evidence before promising an exact retention maximum.
3. **20 — Unauthorized access:** bearer/session/CSRF negative tests independently rerun; no bypass found in this review.
4. **10 — Scheduled expiry/backups:** deletion and on-access purges verified, but actual schedule, backup expiry and exported-copy handling remain a runbook rather than exercised controls.
5. **5 — Host/proxy logs:** documented checklist only. Verify actual REMOTE_ADDR behavior, trusted proxy configuration and log retention on chosen host.

### 8. Backend correctness and security — 90

1. **15 — Red/green evidence:** manager reported failing-test-first results for both final fixes; reviewer independently reproduced the date failure and reran final green tests. This partial increment evidence does not establish TDD for earlier work; retain full artifacts for future increments.
2. **20 — Auth/session/CSRF:** suite and independent session-expiry/cookie checks pass in Flask client scope.
3. **15 — Hostile input/rendering:** Unicode credential rejection, escaped reflected input and hostile header checks pass; date boundary regression now passes; browser execution and wider adversarial cases remain untested.
4. **20 — Atomic limits:** `BEGIN IMMEDIATE` reservation and independent 36-request concurrency test confirm the intended limit in this SQLite test environment.
5. **20 — Regression:** reviewer independently reran all 18 app/preflight tests. This is a verified test run, not exhaustive correctness proof.

### 9. Agent isolation and review integrity — 75

1. **20 — Immutable inputs:** manager-owned immutable bytes and hashes verified by tests; source filtering inspected.
2. **20 — Manager diff:** mutable worker Git index/HEAD cannot hide candidate changes; empty-file transport test passes.
3. **20 — Malicious artifacts:** archive checks reject tested traversal, links, devices, executable modes, duplicates, oversize data and ownership violations without extraction.
4. **5 — Docker/egress/resources:** requirements are documented, not implemented/exercised as a runnable system. Execution refuses even with transfer acknowledgment.
5. **10 — Integration/publication:** comparator unit tests and no-auto-publication behavior verified; isolated integration of an actual worker candidate has not occurred.

### 10. Operations and release readiness — 45

1. **10 — Reproducible setup:** app runs here, but `requirements.txt` is a broad Flask range and no clean locked build was tested.
2. **20 — Environment preflight:** independent valid/invalid shape tests pass; the script explicitly disclaims proving hosting correctness.
3. **5 — Hosting/persistence:** runbook only; verify TLS, WSGI, persistent private DB, restart persistence and proxy behavior.
4. **5 — Monitoring/scheduling:** runbook only; demonstrate alerts and purge execution during inactivity.
5. **5 — Recovery:** runbook only; restore a synthetic online backup, verify integrity and counts, and exercise rollback.

## Remaining concrete defects and constraints

- **Resolved during review — extreme date overflow:** final `app.py:event_rows` catches overflow; independent regression confirms export returns 400.
- **Resolved during review — deletion confirmation:** final `app.py:admin_delete` requires `confirm=yes`; regression verifies missing confirmation returns 400 and explicit confirmation deletes.
- **Operational — bounded-per-network is not globally bounded:** blocked rows aggregate by network/minute, but many networks can still grow storage and every attempt writes. Host-level rate/body/disk protections remain essential and unverified.
- **Research — no verified operator attribution or concealment:** visible disclosures are readable by agents. Signed token possession/acceptance cannot prove comprehension or operator authority. Existing app cannot produce a defensible organic compliance rate without a denominator.

No critical authorization bypass was identified, but this limited review is not a security certification. The material unverified isolation boundary and live-host/browser gaps prevent release approval regardless of score.

## Approval scope and next decision

Approve continued development/review of this candidate only; no automatic merge, public deployment, or external-model execution is authorized by this report. To reach 85 in every front, collect the missing rendered/assistive-technology, controlled-agent, isolated-runtime and hosting evidence and address the remaining operational constraints. Re-review affected fronts after material changes. A score update must identify new evidence, not only revised wording.

## Reviewed source identity

Manager identifies publication candidate commit as `e221d635a6850bf5d6537b4b4a27c11d7f4e1ab0`. The local checkout still reports base HEAD `364ef51ceeff9e6eeebf7bbba6e20070c71ad5b1`; I did not independently verify the remote commit mapping. The following independently calculated content hashes are authoritative for this review. Generated manifests and this report are excluded to avoid self-reference. Any material changed file requires appropriate re-review.

Canonical source-manifest SHA-256: `0262cd782886f3e3600afd02a70201dd0a6900bc877123c3cdd402dd137908bc`

```json
{
  "LICENSE": "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4",
  "README.md": "d7090f60744b81b64b67c3f86c014ad2364a2cfee4dec7e030b0ba7ad9cc622b",
  "app.py": "68c094d69bea096e96a1dea6340c80f7d94dc2660ab940d01c54175661fd33d9",
  "docs/OPERATIONS.md": "c74cbc08a9c0644e1b20d2520bc074b8690f710db08893fc9881b6201ee9a33b",
  "docs/QUALITY_SCORECARD.md": "8fd4d8ea1a109a02e137a171dffd22c4d2f39b5de3e3a8e090b50d547f8fe8ca",
  "docs/RESEARCH_PROTOCOL.md": "d163199c1991ee69cc496c3a0da7fbb8ebd0bd54a7b9b3da8eb0631296e62345",
  "docs/UI_CONTRACT.md": "d1c551f8f5d800d13587380416d4c53d8070dc3c5c32042023d41ff1fe08a5e1",
  "orchestration/README.md": "4a7d0d18a6cf4e520f83b3ae42d8f0987f4078e58a88fd14549d38c74fdbbd14",
  "orchestration/run_task.py": "4068bfed0aa211b7064a0d33d28b3eab4f0c9015cd14dbec0c34d99da7d3beb7",
  "orchestration/tasks.json": "843ec676d46c1833856b20e5962dbe2d8988b51214a934dd7ca49dacbc4a00e4",
  "orchestration/test_runner.py": "a48f4d71ed46b127b44408f21382aa031431d724a34dbf50e2bb91953e6e63c5",
  "preflight.py": "c6bc07a1011f7ab018b916fe9c3af5241ce519e5e76f4badbc0969eeff2f672b",
  "requirements.txt": "e9eae9074f097c101b125118dcd281694b2df5425064ab983bb2ca54cf50bea3",
  "static/forms.js": "c413c183b1cd95e733935ab311a6ad2763eb5ffc4bc1445b6804b9f3f3b04353",
  "static/site.css": "d0966828cc42ad3da1ce4c2bf0963ae7dc828b86bb2ef67bdef9ea6a5dc7b656",
  "templates/admin.html": "0c71f3742dd4acfeb1c2a38a86faf8455e7f5b469896ead23d8b0a85c939a049",
  "templates/public.html": "1ae50be5fa76f2515b8827e7f567f766af61811d27a618e6c4a61d5f2f94cf4d",
  "test_app.py": "38a24878c0ad493221c43d9aa757de61c356042181f86849e52f4b93d9e5a18f",
  "test_preflight.py": "d3d24309a0275a23cdff24cb26dabb601c000f233e15d8498edb437cdcc8f403"
}
```
