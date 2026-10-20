# Independent arcade scope review — 2026-10-20

**Disposition: concept-site scope accepted on source inspection; rendered/browser and production-image CI verification pending. No game implementation is approved or present.** This is a bounded review of the arcade pivot, not a carry-forward of the previous production-readiness scores.

## Scope and authorization

`game_catalog.py` contains eight concepts. Neon Breaker remains `awaiting_approval`; the other seven remain `planned`. `docs/FIRST_GAME_BRIEF.md` and `docs/GAME_ROADMAP.md` expressly require user approval before implementing the first game or installing an engine. Approval of the site redesign does not approve any playable game.

The homepage and concept pages clearly say nothing is playable yet. Links open concept information, not a deceptive Play action. The first featured game/title/art/link now derive from the catalog, and its visitor-facing label maps awaiting approval to “First release planned.” The detail notice uses catalog status. Static generic “Coming soon” card badges are accompanied by explicit concept-only language and do not imply gameplay exists. Keep internal roadmap terminology consistent with this public mapping.

## Privacy and preserved research

The arcade footer links to `/forms` and `/terms` and states the form research is separate. `/forms` and application pages retain the visible research disclosure, fictional-input instructions and acceptance flow. Catalog browsing does not call the submission-recording path; no visitor-dependent or bot-dependent disclosure rules were found. Research is secondary navigation, not hidden through cloaking.

Inspected `static/arcade.js` only shows/hides catalog cards, updates button state and announces the count. It adds no fetch, beacon, storage, identifiers, analytics or gameplay event collection. No engine, simulation, scoring loop, playable canvas or game dependency was introduced in the inspected assets. SVG illustrations are static concept art, not game implementations. Existing administrator, collection, retention and deletion protections remain governed by the application regressions.

## Verification actually performed

- `python -m unittest -q`: **30 tests passed** on the inspected working tree.
- `node --check static/arcade.js`: passed.
- Parsed all eight catalog SVGs as XML; no script elements, foreignObject elements or external hrefs found.
- Confirmed every catalog slug has its expected SVG file.
- Confirmed `Dockerfile` copies the newly imported `game_catalog.py`; an earlier missing-copy concern is resolved.
- Inspected restored research navigation and source declarations; no added third-party tracking found.

These checks do not establish responsive appearance, contrast, actual filter accessibility, or production image startup. Those require the new candidate's CI/browser evidence. Previous research-site scores must not be presented as scores for this redesign.

## Remaining bounded checks

1. Verify new arcade homepage, all concept routes, genre filtering, no-JS catalog visibility and footer research navigation in browser CI at the supported widths.
2. Confirm preserved form/admin workflows still pass after the longer form-lab navigation and homepage-route changes.
3. Review actual rendered arcade captures and verify the production image imports the catalog and serves all eight SVGs.
4. Keep Neon Breaker implementation blocked until the user explicitly approves its brief. This review provides no game-building authorization.

No scope-breaking gameplay implementation or tracking expansion was found. Source inspection supports continuing the concept-site candidate to CI and user review; it does not certify public hosting or accessibility beyond the executed checks.
