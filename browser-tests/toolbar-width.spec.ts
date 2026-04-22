import { expect, test } from '@playwright/test';

test('search composer is wider than the previous compact cap', async ({ page }) => {
  await page.goto('/toolbar-width.html');

  const width = await page.locator('.search-composer').evaluate((element) => {
    return Math.round(element.getBoundingClientRect().width);
  });

  expect(width).toBeGreaterThan(220);
});