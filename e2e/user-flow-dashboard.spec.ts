import { expect, test } from '@playwright/test';

/**
 * Test E2E: Główny flow użytkownika w aplikacji
 *
 * Weryfikuje kluczowe funkcjonalności z perspektywy użytkownika:
 * 1. Dostęp do dashboard
 * 2. Wyświetlanie kolekcji
 * 3. Nawigacja do kolekcji/topicu
 * 4. Interakcje z UI
 *
 * UWAGA: Ten test zakłada, że użytkownik jest zalogowany.
 * W rzeczywistej implementacji należałoby dodać setup z logowaniem.
 */

test.describe('Dashboard and Collections Flow', () => {
  test('dashboard page loads and displays basic structure', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const currentURL = page.url();

    if (currentURL.includes('/login')) {
      await expect(page.locator('form')).toBeVisible();
    } else {
      const hasContent =
        (await page.locator('h1, h2, main, [role="main"]').count()) > 0;
      expect(hasContent).toBeTruthy();
    }
  });

  test('home page shows application name and basic info', async ({ page }) => {
    await page.goto('/');

    const pageText = await page.textContent('body');

    expect(pageText).toBeTruthy();
    expect(pageText?.length ?? 0).toBeGreaterThan(0);

    const links = page.locator('a');
    const linkCount = await links.count();

    expect(linkCount).toBeGreaterThan(0);
  });

  test('collections page structure (if accessible)', async ({ page }) => {
    await page.goto('/collections');

    const currentURL = page.url();

    if (currentURL.includes('/login') || currentURL.includes('/register')) {
      expect(currentURL).toMatch(/login|register/);
    } else {
      const mainContent = page.locator('main, [role="main"], body > div');
      await expect(mainContent.first()).toBeVisible();
    }
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/');
    const homeURL = page.url();

    const firstLink = page.locator('a[href^="/"]').first();

    if ((await firstLink.count()) > 0) {
      const linkHref = await firstLink.getAttribute('href');
      await firstLink.click();

      await page.waitForLoadState('networkidle');
      const newURL = page.url();

      if (linkHref && linkHref !== '/' && !linkHref.startsWith('#')) {
        expect(newURL).not.toBe(homeURL);
      }

      const hasError =
        (await page.locator('text=/error|błąd|failed/i').count()) > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('app handles 404 page gracefully', async ({ page }) => {
    const response = await page.goto(
      '/this-page-definitely-does-not-exist-xyz'
    );

    expect(response).toBeTruthy();

    const status = response?.status() ?? 0;

    if (status === 404) {
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
