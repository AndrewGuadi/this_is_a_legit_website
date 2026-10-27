const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Circuit Match starts, selects by keyboard, pauses and resumes', async ({ page }) => {
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('/games/circuit-match');
  const game=page.locator('#circuit-game');
  await expect(game).toHaveAttribute('data-state','ready');
  await page.getByRole('button',{name:'Start run',exact:true}).click();
  await expect(game).toHaveAttribute('data-state','playing');
  await page.locator('#playfield').press('Enter');
  await expect(page.locator('#game-status')).toContainText('Tile selected');
  await page.locator('#playfield').press('Enter');
  await expect(page.locator('#moves')).toHaveText('20');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await expect(game).toHaveAttribute('data-state','paused');
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.locator('#playfield').press('p');
  await expect(game).toHaveAttribute('data-state','paused');
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await expect(game).toHaveAttribute('data-state','playing');
  expect(errors).toEqual([]);
});

test('Circuit Match supports touch selection, denied storage and responsive layout', async ({ browser }, testInfo) => {
  const context=await browser.newContext({hasTouch:true,viewport:testInfo.project.use.viewport});
  const page=await context.newPage();
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied')}}));
  await page.goto('http://127.0.0.1:5081/games/circuit-match');
  await page.getByRole('button',{name:'Start run',exact:true}).tap();
  const box=await page.locator('canvas').boundingBox();
  await page.locator('canvas').tap({position:{x:80/720*box.width,y:130/800*box.height}});
  await expect(page.locator('#game-status')).toContainText('Tile selected');
  await page.getByLabel('Save best on this device').click();
  await expect(page.getByLabel('Save best on this device')).not.toBeChecked();
  await expect(page.locator('#storage-note')).toContainText('Storage unavailable');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  await context.close();
});
