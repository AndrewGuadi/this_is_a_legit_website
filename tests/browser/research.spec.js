const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const adminToken = 'browser-fixture-only-' + 'x'.repeat(40);

async function noOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
}
async function accessible(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
}
async function screenshot(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}
async function login(page) {
  await page.goto('/admin/login');
  await page.getByLabel('Administrator access token').fill(adminToken);
  await page.getByRole('button', { name: /Enter workspace/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function fillForm(page) {
  await page.getByLabel(/Fictional name or organization/).fill('Example Studio');
  await page.getByLabel(/Sample (application|message)/).fill('A fictional sample interaction.');
  await page.getByLabel(/How are you completing/).selectOption('human');
  await page.getByRole('checkbox', { name: /I have read and accept/ }).check();
}

for (const path of ['/', '/terms', '/apply/directory', '/apply/partner', '/apply/contact', '/admin/login']) {
  test(`public page ${path}: semantics, accessibility, layout`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('main')).toBeVisible();
    await noOverflow(page);
    await accessible(page);
    await screenshot(page, testInfo, path.replace(/\W+/g, '-') || 'home');
    expect(errors).toEqual([]);
  });
}

test('keyboard navigation reaches main and visible focus', async ({ page }) => {
  await page.goto('/apply/directory');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  for (let count = 0; count < 12; count += 1) {
    await page.keyboard.press('Tab');
    if (await page.locator('#name').evaluate(el => el === document.activeElement)) break;
  }
  await expect(page.locator('#name')).toBeFocused();
  const outline = await page.locator('#name').evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('invalid server submission preserves escaped input and can recover', async ({ page }, testInfo) => {
  await page.goto('/apply/directory');
  await page.locator('#name').fill('<script>synthetic</script>');
  await page.locator('#message').fill('Synthetic recovery scenario');
  // Bypass browser-required checks deliberately to exercise server validation.
  await page.locator('form[data-research-form]').evaluate(form => form.submit());
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#name')).toHaveValue('<script>synthetic</script>');
  await expect(page.getByRole('alert')).toContainText('receipt');
  await accessible(page);
  await screenshot(page, testInfo, 'validation-recovery');
  await page.getByLabel(/How are you completing/).selectOption('human');
  await page.getByRole('checkbox', { name: /I have read and accept/ }).check();
  await page.getByRole('button', { name: /Submit test/ }).click();
  await expect(page.getByRole('heading', { name: /Observation\s*recorded/ })).toBeVisible();
  await expect(page.locator('#receipt-id')).toHaveText(/^[a-f0-9]{32}$/);
  await noOverflow(page);
  await accessible(page);
  await screenshot(page, testInfo, 'receipt');
});

test('public submission works without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5081/apply/contact');
  await fillForm(page);
  await page.getByRole('button', { name: /Submit test/ }).click();
  await expect(page.getByRole('heading', { name: /Observation\s*recorded/ })).toBeVisible();
  await screenshot(page, testInfo, 'no-js-receipt');
  await context.close();
});

test('reduced motion disables transitions and smooth scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const values = await page.locator('.card').first().evaluate(el => ({
    transition: getComputedStyle(el).transitionDuration,
    animation: getComputedStyle(el).animationName,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  expect(values).toEqual({ transition: '0s', animation: 'none', scroll: 'auto' });
});

test('investigator filters, pagination, export, detail, delete, logout', async ({ page }, testInfo) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Research overview.' })).toBeVisible();
  await noOverflow(page);
  await accessible(page);
  await screenshot(page, testInfo, 'admin-overview');
  await page.getByRole('link', { name: 'Next →', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole('link', { name: 'Reset', exact: true }).click();
  await page.getByLabel('Form', { exact: true }).selectOption('partner');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('heading', { name: 'A clean slate.' })).toBeVisible();
  await screenshot(page, testInfo, 'admin-empty');
  await page.getByRole('link', { name: 'Reset', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: /Download filtered JSON/ }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await page.getByRole('link', { name: /^Inspect receipt/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Interaction record.' })).toBeVisible();
  await noOverflow(page);
  await accessible(page);
  await screenshot(page, testInfo, 'admin-detail');
  await page.getByRole('checkbox', { name: /permanently delete this record/ }).check();
  await page.getByRole('button', { name: 'Permanently delete record' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});
