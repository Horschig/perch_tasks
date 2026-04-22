import { expect, test } from '@playwright/test';

test('search composer visibly expands when search opens', async ({ page }) => {
  await page.goto('/toolbar-harness.html');

  const toolbar = page.locator('.toolbar-right');
  const closedWidth = await toolbar.evaluate((element) => element.getBoundingClientRect().width);

  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByLabel('Search todos')).toBeVisible();

  const openWidth = await toolbar.evaluate((element) => element.getBoundingClientRect().width);
  const composerWidth = await page.locator('.search-composer').evaluate((element) => element.getBoundingClientRect().width);

  expect(openWidth).toBeGreaterThan(closedWidth + 80);
  expect(composerWidth).toBeGreaterThan(220);
});