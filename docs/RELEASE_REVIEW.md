# Independent release review — 2026-10-19

**Verdict: APPROVE the tested synthetic staging candidate; REQUEST CHANGES before public production release. The requirement of 85/100 in every front is not met.** Accessibility and host-specific privacy verification remain below threshold. Passing CI is substantial progress, not a substitute for those checks. This review does not authorize merging or deploying.

## Candidate and verified evidence

- Feature commit: `89b314be1a039ce6e35a3662d67560f037ac0fc6`.
- CI tested its PR merge with base `40c32b892e662fa25e74ff1a91b42e828eb6c560`; logs identify merge prefix `0539912`.
- Reviewer independently checked all **35 source hashes** in `docs/CANDIDATE_MANIFEST.json`: no mismatches. Manifest file SHA-256: `26ddd653f50e177c6cb4c2da46f0083ae805aa2236113482984e75259f01dc4b`.
- [Run 39334188923](https://github.com/AndrewGuadi/this_is_a_legit_website/actions/runs/39334188923): reviewer directly retrieved final job statuses; **all four succeeded**.
- Browser job `118339428187`: independently retrieved log confirms **44/44 passed**, covering four widths, axe checks, native no-JS submission, server-error recovery, reduced motion, focus entry and investigator workflows. Eight final rendered captures were independently inspected, including mobile/desktop home, mobile form/receipt, investigator detail/overview/empty states.
- Application job `118339427986`: independently retrieved log confirms **29 application/preflight, 8 artifact-review, 5 transport and 33 operations test executions passed**. Operations count includes inherited duplicates; these are not 33 unique behaviors.
- Synthetic benchmark: **9/9 issued tasks matched**, with 3 final successful submissions, 5 rejected attempts, 1 no-attempt, 0 indeterminate. Reviewer also ran the benchmark independently. It explicitly tests scripted HTTP controls, not human or AI cognition.
- Isolation job `118339427730` succeeded. Reviewer also retrieved the complete previous unchanged isolation execution log: actual offline Docker constraints, bounded candidate collection and manager-owned comparison passed. This is an offline synthetic worker, not a model-connected OpenCode runtime.
- Production job `118339428011`: independently retrieved final log confirms actual production-image startup, submission/export, persistent restart, periodic expired-record removal without requests, preservation of fresh records, clean shutdown, and termination after a live maintenance process was frozen. [Production artifact 12226491353](https://github.com/AndrewGuadi/this_is_a_legit_website/actions/runs/39334188923/artifacts/12226491353), ZIP SHA-256 `11489daa3f67d703fbcdf72ed6ddd61e3c8d8a3029adeaa3171f2afcf21be880`.

## Scores against the unchanged rubric

Five item scores are listed in the original order of `docs/QUALITY_SCORECARD.md`. Each item is out of 20: 0 absent, 5 plan, 10 implemented, 15 partially verified, 20 independently verified within stated acceptance scope. No averages compensate for a failed front.

| Front | Five item scores | Total | Evidence and remaining limitation |
|---|---|---:|---|
| Purpose/research validity | 20,20,15,20,15 | **90** | Hypotheses, inference boundaries and denominators verified; nine controlled HTTP trials measured. Actual general-purpose-agent and investigator-comprehension trials remain outstanding. |
| Public UX | 20,20,20,20,15 | **95** | Clear navigation/disclosure, completion, receipt and recovery executed in browser; no-JS flow passes. Keyboard test verifies entry/skip/focus, not every task end-to-end by keyboard. |
| Visual/responsive design | 20,20,20,15,15 | **90** | Consistent rendered system; mobile and desktop compositions reviewed. States and overflow checked, but no measured layout-shift budget. Independent cross-viewport comparison completed; no competitor-superiority benchmark. |
| Accessibility/motion | 20,15,15,20,0 | **70** | Semantics/axe and reduced-motion checks pass. Keyboard coverage and rendered contrast checks are partial; no actual screen-reader task has been executed. |
| Investigator usefulness | 20,20,15,20,20 | **95** | Actual login, filters/pages, export, detail, deletion and logout pass; empty/detail states reviewed. Data labels and unknowns are explicit, but interpretation by a human investigator is not measured. |
| Data/provenance | 20,20,20,20,15 | **95** | Versioned policy/schema, sources, unknowns, outcome fixtures, duplicate/limit accounting verified. Export count/privacy/cap tests pass; independent comprehensive schema/invariant audit remains partial. |
| Privacy/retention | 20,15,20,20,5 | **80** | Minimized payload, auth negatives, scheduled expiry, session-revoking restore and authoritative deletion ledger verified. Exact physical cleanup delay versus public “up to” language needs final alignment; actual host/proxy logs remain checklist-only. |
| Backend correctness/security | 15,20,20,20,20 | **95** | Current auth/session/CSRF, hostile inputs, failure handling and atomic concurrency regressions pass. Red→green evidence exists for recent fixes, not every historical increment. |
| Agent isolation/review integrity | 20,20,20,15,15 | **90** | Immutable input, independent diff, malicious archive rejection and offline runtime tested. Model-connected egress and actual OpenCode candidate integration remain unverified; that runner stays disabled. |
| Operations/release readiness | 20,20,15,15,15 | **85** | Fresh CI build/preflight and production container lifecycle/fault tests pass. Actual public TLS/proxy/persistence, alert delivery and host code rollback are not exercised. Synthetic recovery is verified. |

## Independent visual judgment

Final captures show a coherent editorial style with clear typography, restrained color, sensible disclosure placement and useful success/empty/error states. Desktop and mobile preserve the same structure without obvious clipping. Investigator detail wraps identifiers instead of breaking the page. Mobile overview keeps its wide table inside a scroll region.

The mobile homepage spends substantial vertical space on decoration before the form choices; the primary jump link mitigates this. Mobile investigator detail is lengthy, and small navigation/auxiliary text merits usability review. These are identified tradeoffs, not proof of inaccessible behavior. No claim that this exceeds billion-dollar-company products is supported by the evidence.

## Gates still required for public approval

1. **Accessibility:** execute a real screen-reader task across form/error/receipt and investigator flows; complete keyboard-only submission, filtering, deletion and recovery. Review contrast/focus in all interactive states. Axe cannot substitute for assistive-technology task verification.
2. **Actual host privacy and security:** verify TLS, trusted reverse-proxy behavior, real observed client address, private persistent storage, raw access-log retention, external snapshots, and alert delivery. Verify the real privacy contact. Do not use fixture contact details in production.
3. **Precise retention language:** app rows logically expire at their policy boundary and are removed periodically; downtime and cleanup intervals can delay physical erasure. State these bounds accurately for events, blocked aggregates, deletion journal and backups, including external copies.
4. **Recovery discipline:** stop every writer before restore and keep them stopped through activation; use the current authoritative deletion ledger, never its stale snapshot. Missing/corrupt/wrong-identity ledger fails closed. Enforce the runbook on the actual host and exercise code rollback there.
5. **Research scope:** the site is a disclosed research demonstration and cannot guarantee agents fail to recognize it. Checkbox/token/header signals do not establish operator identity or legal violation. Before claims about AI compliance or investigator comprehension, run those actual trials; keep synthetic benchmark conclusions scoped to tested HTTP behavior.
6. **Agent execution:** keep online OpenCode execution disabled until actual approved-destination network controls and isolated candidate integration are verified. An offline Docker pass does not authorize source transfer or certify a networked swarm.

No critical exploitable authorization flaw was identified in this review. That is a bounded finding, not a security certification. Source changes affecting these guarantees invalidate the corresponding approval until rechecked. Historical findings and their fixes remain in `docs/PRODUCTION_REVIEW.md`; this is the current disposition for the named candidate.
