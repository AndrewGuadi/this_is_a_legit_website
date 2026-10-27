# Owner-authorized live alpha test

Deployed October 27, 2026. Owner explicitly requested live testing and main merge; the existing 20ms p95 acceptance target remains unchanged and unmet. PR6 merged as 3aa4062b56996509417c1dee1a4801ba3bfe94f6, tree c9880c35a83c938fa17f65b5bea5c33175e7ce8a. This is not final production-readiness or feature-equivalence approval.

Target: https://www.cmduniverse.com/games/cmd-city
PythonAnywhere account: authenticdynamics, US API host www.pythonanywhere.com.
Python3.12; source directory /home/authenticdynamics/this_is_a_legit_website; virtualenv /home/authenticdynamics/.virtualenvs/legit-arcade. Existing webapp enabled with HTTPS forced. No separate static mappings returned; Flask serves the static assets.

Uploaded 22 changed runtime files directly through the authenticated file API from exact Git source3aa4062, assets/templates first and app.py last, then reloaded the webapp (HTTP200, statusOK). No dependency, database, WSGI, secret or account-setting changes. This was a file deployment, not a remote git checkout; do not assume the server git HEAD matches deployed content. Prior known-release app.py, game_catalog.py and templates/arcade.html from1f43187 were preserved outside the public tree at /home/authenticdynamics/.cmd-city-release-backups/3aa4062/. They are known-release copies, not a snapshot of unverified host modifications.

Verification: all18 changed public assets matched exact SHA256 source hashes; CMD City, the four other playable games, forms and homepage returned200 with expected content. Actual live browser started paused, resumed, advanced January to August with changing population/treasury, then paused. Browser console showed extension-origin messages only; no game-origin errors observed. Browser screenshot inspected. These are bounded smoke checks, not performance acceptance.

Existing token recovered from the owner-designated PythonAnywhere integration chat; token values never included in source/logs/report. Temporary local credential file removed after deployment. Reading unrelated existing console output/remote Git metadata was blocked by automatic review; direct scoped file deployment proceeded without those reads.
