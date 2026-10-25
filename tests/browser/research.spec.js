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
  await expect(page).toHaveURL(/\/admin\/?$/);
}
async function fillForm(page) {
  await page.getByLabel(/Fictional name or organization/).fill('Example Studio');
  await page.getByLabel(/Sample (application|message)/).fill('A fictional sample interaction.');
  await page.getByLabel(/How are you completing/).selectOption('human');
  await page.getByRole('checkbox', { name: /I have read and accept/ }).check();
}

for (const path of ['/', '/forms', '/games/neon-breaker', '/terms', '/apply/directory', '/apply/partner', '/apply/contact', '/admin/login']) {
  test(`public page ${path}: semantics, accessibility, layout`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('main')).toBeVisible();
    await noOverflow(page);
    for (const img of await page.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty('complete', true);
      expect(await img.evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
    }
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
  await expect(page).toHaveURL(/\/admin\/?$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

// Interaction helper deliberately uses only real Tab navigation, never DOM focus.
async function tabTo(page, selector, limit = 70) {
  for (let attempt = 0; attempt < limit; attempt += 1) {
    if (await page.evaluate(selector => document.activeElement?.matches(selector) || false, selector)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Keyboard navigation did not reach ${selector} after ${limit} Tab presses`);
}

test('keyboard-only public validation and successful submission', async ({ page }, testInfo) => {
  await page.goto('/apply/contact');
  await tabTo(page, '#name');
  await page.keyboard.type('Keyboard Example');
  await tabTo(page, 'form[data-research-form] button[type="submit"]');
  await page.keyboard.press('Enter');
  // Native required-field recovery must move focus to the first missing input.
  await expect(page.locator('#message')).toBeFocused();
  expect(await page.locator('#message').evaluate(el => el.validity.valueMissing)).toBe(true);
  await page.keyboard.type('Fictional keyboard-only sample.');
  await tabTo(page, '#automation');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#automation')).toHaveValue('human');
  await tabTo(page, 'input[name="consent"]');
  await page.keyboard.press('Space');
  await expect(page.locator('input[name="consent"]')).toBeChecked();
  await tabTo(page, 'form[data-research-form] button[type="submit"]');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Observation\s*recorded/ })).toBeVisible();
  await expect(page.locator('#receipt-id')).toHaveText(/^[a-f0-9]{32}$/);
  await screenshot(page, testInfo, 'keyboard-public-receipt');
});

test('keyboard-only investigator login filter deletion and logout', async ({ page, request }, testInfo) => {
  // Synthetic fixture isolation, not a production route or a rate-limit test.
  expect((await request.post('/__fixture/reset-rate-limits')).status()).toBe(204);
  await page.goto('/admin/login');
  await tabTo(page, '#admin-token');
  await page.keyboard.type(adminToken);
  await tabTo(page, 'button[type="submit"]');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/admin\/?$/);
  await tabTo(page, '#filter-form');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#filter-form')).toHaveValue('directory');
  await tabTo(page, '.filters button[type="submit"]');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/form=directory/);
  await tabTo(page, 'a[aria-label^="Inspect receipt"]');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Interaction record.' })).toBeVisible();
  const receipt = await page.locator('.receipt-card code').innerText();
  await tabTo(page, 'input[name="confirm"]');
  await page.keyboard.press('Space');
  await expect(page.locator('input[name="confirm"]')).toBeChecked();
  await tabTo(page, '.danger-zone button[type="submit"]');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.locator(`a[href="/admin/record/${receipt}"]`)).toHaveCount(0);
  await tabTo(page, 'form[action="/admin/logout"] button');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/admin\/login/);
  await screenshot(page, testInfo, 'keyboard-admin-signed-out');
});

// The arcade shell remains an honest catalog until the owner approves game one.
test('arcade catalog filters and secondary forms remain usable', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('[data-genre]')).toHaveCount(9);
  const filter = page.locator('[data-filter]').nth(1);
  const genre = await filter.getAttribute('data-filter');
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('[data-genre]:visible').count()).toBeGreaterThan(0);
  for (const card of await page.locator('[data-genre]:visible').all()) {
    await expect(card).toHaveAttribute('data-genre', genre);
  }
  await noOverflow(page);
  await page.getByRole('button', { name: 'All concepts', exact: true }).click();
  await expect(page.locator('[data-genre]:visible')).toHaveCount(9);
  await page.getByRole('link', { name: 'Form research', exact: true }).click();
  await expect(page).toHaveURL(/\/forms$/);
  await expect(page.getByText('This is a research demonstration.', { exact: true })).toBeVisible();
  await screenshot(page, testInfo, 'secondary-form-layer');
});
