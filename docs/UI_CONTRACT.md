# UI ownership and integration contract

- `templates/public.html`: HTML foundation team. Renderer receives `body` (home, form, terms, receipt, error), contact and view-specific values. Form view receives kind, signed token, optional errors/values/receipt; never persist values in browser storage.
- `templates/admin.html`: backend/investigator team. Views login, overview and detail. Context is created by server routes; templates never infer authorization. Never expose admin credentials in a URL or HTML after login.
- `static/site.css`: shared UI team. Tokens define paper, foreground, muted text, borders and accent. Coordinate investigator styles here through reviewed UI requests, not parallel backend edits.
- `static/forms.js`: JavaScript team. Progressive enhancement only. `[data-research-form]`, `[data-character-count]`, `[data-submit-status]` connect form enhancements. Native POST and validation remain available without JS. Confirm actual hook presence before edits.
- `static/motion.css`: optional motion-team addition, not currently loaded. Include only after manager review; existing site.css already handles reduced motion. Do not hide content until animation executes.

Backend owns routes, state, escaping, validation, auth, CSRF and authoritative outcomes. Frontend never substitutes a client check for a server check. Use local static URLs compatible with the self-only CSP; no inline scripts/styles or remote fonts.

Manager handles script/stylesheet inclusion and cross-team hook changes in a dedicated integration pass. Teams never silently change another team's owned files. A proposed dependency/asset requires review.

Public successful submissions navigate to receipts. Recoverable validation responses retain escaped values in the response only and return a fresh token. Required consent is not pre-checked. Admin filters use GET; mutations use POST with a session CSRF token and explicit confirmation.

Visual acceptance requires actual rendered mobile/tablet/desktop review and keyboard/screen-reader tasks. CSS inspection and token contrast calculations alone do not satisfy this gate.
