const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5081',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [360, 390, 768, 1440].map(width => ({
    name: `chromium-${width}`,
    use: { viewport: { width, height: 1000 } },
  })),
  webServer: {
    command: 'python tests/browser/server.py',
    url: 'http://127.0.0.1:5081',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
