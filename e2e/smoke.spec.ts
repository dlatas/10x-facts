import { expect, test } from '@playwright/test';

/**
 * Smoke Test: Podstawowy test sprawdzający, czy aplikacja odpowiada
 *
 * Ten test weryfikuje minimalne działanie aplikacji:
 * - Czy serwer odpowiada
 * - Czy strona główna się ładuje
 * - Czy zwraca poprawny status HTTP
 */

test.describe('Smoke Tests', () => {
  test('app responds on home page', async ({ page }) => {
    // Użytkownik otwiera stronę główną
    const response = await page.goto('/');

    // Sprawdź, czy otrzymano odpowiedź
    expect(response, 'Expected navigation response').toBeTruthy();

    // Sprawdź, czy status jest OK (2xx)
    expect(
      response?.ok(),
      `Expected 2xx status, got ${response?.status()}`
    ).toBeTruthy();

    // Sprawdź, czy strona ma jakąś zawartość
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);
  });

  test('app has valid HTML structure', async ({ page }) => {
    await page.goto('/');

    // Sprawdź, czy jest element <body>
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Sprawdź, czy strona ma tytuł
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('app responds to multiple pages without errors', async ({ page }) => {
    // Test kilku podstawowych ścieżek
    const paths = ['/', '/login', '/register'];

    for (const path of paths) {
      const response = await page.goto(path);

      // Każda strona powinna odpowiedzieć
      expect(response?.status()).toBeLessThan(500); // Nie może być błędu serwera

      // Strona powinna mieć zawartość
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    }
  });
});
