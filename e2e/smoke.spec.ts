import { expect, test } from '@playwright/test';

test('app responds on home page', async ({ page }) => {
  const response = await page.goto('/');
  expect(response, 'Expected navigation response').toBeTruthy();
  expect(
    response?.ok(),
    `Expected 2xx status, got ${response?.status()}`
  ).toBeTruthy();
});
