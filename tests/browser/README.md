# Browser verification

Run on a supported CI host:

```sh
python -m pip install -r requirements.txt
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

The runner starts a loopback-only Flask fixture with generated secrets, a temporary SQLite database, and 55 synthetic records. The fixed login credential exists solely for this test fixture. Never deploy `server.py` or expose it publicly. Real production environment secrets and visitor records are not required or read by the fixture configuration.

Every scenario runs at widths 360, 390, 768, and 1440 pixels. Coverage includes public forms, disclosure, terms, investigator login and dashboard, filters, pagination, export, detail, deletion, keyboard focus, server-validation recovery, no-JavaScript submission, reduced motion, document overflow, and axe WCAG A/AA automated checks.

Screenshots are attached to the HTML report, with traces retained on failure. They provide evidence for human visual review; screenshot capture alone is not a visual approval or regression baseline. Axe does not establish complete accessibility compliance. Manual keyboard/screen-reader and cross-browser checks remain separate release work.

CI artifacts: `playwright-report/` and `test-results/`.
