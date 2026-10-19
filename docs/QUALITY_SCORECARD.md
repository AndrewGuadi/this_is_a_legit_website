# Independent quality scorecard

Approval requires at least **85/100 in each of ten fronts**, with no open critical finding. No average can compensate for a failing front. This is project readiness, not a percentile or a claim of superiority over other companies.

Each front has five checks worth 20 points. Per check: 0 absent/contradicted; 5 written plan only; 10 implemented but unverified; 15 partially verified; 20 independently verified against its acceptance criteria. Award 15 only when the review names the specific acceptance criteria already verified and those still outstanding; it is not a discretionary rounding score. Score only the reviewed commit/source manifest. Missing evidence is missing credit, not presumed success. The reviewer may lower a score for relevant defects not explicitly listed, with rationale. The manager cannot award its own final approval.

| Front | Five equally weighted checks |
|---|---|
| 1. Purpose and research validity | Explicit hypotheses; correct observation/interpretation distinctions; controlled authorized benchmark; defined denominators and sampling limits; conclusions supported by measured outcomes |
| 2. Information architecture and public UX | Clear navigation; truthful understandable purpose; usable completion/receipt flow; recoverable error flow; keyboard/no-JS task completion |
| 3. Visual design and responsive polish | Consistent tokens/typography; rendered mobile composition; rendered desktop composition; verified states/layout stability; independent comparative visual critique |
| 4. Accessibility and motion | Semantic labels/headings; keyboard/focus; verified contrast; reduced-motion behavior; screen-reader task verification |
| 5. Investigator usefulness | Authenticated overview; tested filters/pagination; interpretable event detail; bounded export; authorized deletion and empty/error states |
| 6. Data quality and provenance | Versioned schema/policy; explicit source and unknowns; validated event outcomes; duplicate/rate-limit accounting; consistency checks on exported records |
| 7. Privacy and retention | Minimized payload; exact disclosure matching code; unauthorized-access tests; scheduled expiry/deletion and backup handling; verified host/proxy logging behavior |
| 8. Backend correctness and security | Red/green test evidence; auth/session/CSRF tests; hostile-input/rendering tests; atomic concurrency/limits; independent regression run |
| 9. Agent isolation and review integrity | Immutable input manifest; manager-owned diff; malicious artifact rejection; verified Docker/egress/resource controls; independent integration tests and no automatic publication |
| 10. Operations and release readiness | Reproducible setup; environment preflight; actual hosting/persistence checks; monitoring/retention scheduling; rollback/recovery exercise |

## Hard blockers

An exploitable authorization flaw, unauthorized disclosure, misleading research conclusion, untrusted patch applied automatically, or a materially unverified isolation boundary prevents release regardless of score. Docker or browser checks must not be replaced with source inspection and called verified. Production secrets must never be created merely to make a scorecard look complete.

## Review record

For each check, reviewer records evidence path/test command and result, points, limitations, and next acceptance step. Record overall verdict as APPROVE (named scope), REQUEST CHANGES, or BLOCK. Re-review affected fronts after any material change.
