# Managed OpenCode build brief

## Outcome
Turn the Flask form-observation prototype into a useful, polished research application. Preserve the feature branch october2026/bot-observation and PR #1; do not merge main.

## Manager workflow
Run bounded OpenCode sessions in sequence, inspect each diff, run meaningful checks, and return failures to the responsible role. Repository code and task briefs are the model inputs. No production records, environment secrets, credentials, or private customer data may enter model prompts. Do not grant unrestricted shell access or allow agents to publish, push, merge, send communications, or purchase services.

OpenCode is installed in the current workspace. The first product session was blocked by automatic approval review before a plan was produced: review requires explicit approval to transmit repository source to OpenCode's external model service. No OpenCode-generated work is claimed.

## Pass 1 — Product strategy and feasibility
Deliver PRODUCT_PLAN.md with user journeys, prioritization, acceptance criteria and a data dictionary.
Business review: identify the actual operator decision supported by each screen. Primary value is inspecting and comparing form-submission behavior, not assuming every anomalous visit is misconduct.
Technical review: trace each metric to existing stored data, consent state, retention and a credible host configuration. Veto metrics that require invented attribution or undisclosed tracking.
Keep a distinction between authorized research clients, declared automation, suspected automation, and rejected requests.

## Pass 2 — Public experience and visual system
Implement reusable Jinja templates and local CSS assets. Maintain a restrained editorial visual identity: warm paper, dark evergreen, lime accents, generous spacing, strong type hierarchy and clear form progression.
Create a polished home page, three form flows, terms/privacy, accessible error states and receipt pages.
Acceptance: mobile layout at 360px, visible keyboard focus, explicit labels, inline validation plus error summary, preservation of non-sensitive entries on recoverable validation failures, and clear success versus rejection outcomes.
Preserve equal truthful research disclosure for all clients. Do not invent jobs, grants, commercial offers, customers or results. Do not use Google-only disclosures or claims that bots cannot detect the project.

## Pass 3 — Investigator workflow
Build a private dashboard with authenticated session login, secure cookies, expiry, logout and CSRF protection. Keep credentials out of URLs and browser localStorage.
Include overview counts, paginated events, UTC/local display clarity, date/form/outcome/declared-automation filters, and event detail with plain-language signal explanations.
Support filtered JSON export and event deletion with a confirmation and server authorization. Clarify export limits and retention.
Use a separate explicit demo mode/database with visibly labeled synthetic events. Never mix demo events with real evidence or fabricate activity.
Every displayed value must trace to actual stored records. Avoid a numerical bot-confidence score without validation.

## Pass 4 — Security and operational usefulness
Review validation, duplicate handling, retention, database concurrency, body limits, authorization, safe rendering, rate limiting and trusted proxy configuration.
Review the stored policy hash/version and event consistency. Define which records represent acceptance versus attempts.
Do not retain form contents, raw IP addresses or new identifying fields without a separately reviewed purpose and disclosure change.
Provide deployment preflight checks, a reproducible setup, a retention task, backup/deletion guidance, and PythonAnywhere WSGI instructions. Fail clearly when required production configuration is missing.
Do not promise legal enforceability, attribution, tamper-proof evidence, or Google indexing.

## Pass 5 — Independent QA and manager acceptance
Have a fresh OpenCode session examine the implementation against this brief, with findings prioritized by actual impact.
Run backend tests covering login/logout/CSRF, filters and pagination, exports, deletion, retention, replay, rejection logging and payload minimization.
Check responsive layout and keyboard/form interactions in an available approved browser. If unavailable, explicitly record that limit.
Manager reviews final diff, dependencies, unresolved risks and checks; push only reviewed source to the feature branch. Keep PR draft until implementation and required checks are complete.

## Done means
A visitor can understand the project and complete a synthetic form without confusion. An operator can sign in, investigate submissions, understand each signal, filter/export records and delete them. Required production setup is explicit. No placeholder data masquerades as evidence. Main remains untouched.
