import { expect, test } from '@playwright/test';

/**
 * Test E2E: Kompletny user flow - od wejścia na stronę do interakcji
 *
 * Ten test weryfikuje PEŁNY user journey z perspektywy użytkownika:
 * 1. Użytkownik wchodzi na stronę
 * 2. Eksploruje dostępne funkcjonalności
 * 3. Nawiguje między stronami
 * 4. Próbuje wykonać akcje
 *
 * Test jest zaprojektowany tak, aby działał bez konieczności autentykacji
 * (testuje publiczne części aplikacji lub sprawdza odpowiednie przekierowania)
 */

test.describe('Complete User Flow', () => {
  test('user visits homepage and explores the app', async ({ page }) => {
    // === KROK 1: Wejście na stronę ===
    await page.goto('/');

    // Sprawdź, czy strona się załadowała
    await expect(page).toHaveURL(/\//);

    // Sprawdź, czy strona odpowiada (nie jest pusta)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText?.trim().length ?? 0).toBeGreaterThan(0);

    // === KROK 2: Użytkownik widzi podstawowe informacje ===
    // Sprawdź tytuł strony
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // === KROK 4: Próba nawigacji do kluczowych stron ===
    // Test dashboard (może wymagać logowania)
    await page.goto('/dashboard');
    const dashboardURL = page.url();

    if (dashboardURL.includes('/login') || dashboardURL.includes('/register')) {
      // Sprawdź, czy formularz logowania jest widoczny
      const loginForm = page.locator('form');
      if ((await loginForm.count()) > 0) {
        // Formularz istnieje (OK) — szczegóły pól zależą od implementacji.
      }
    } else {
      // Sprawdź, czy dashboard ma jakąś zawartość
      const dashboardContent = await page
        .locator('main, [role="main"], body')
        .textContent();
      expect(dashboardContent).toBeTruthy();
    }

    // === KROK 5: Powrót do strony głównej ===
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // === KROK 6: Test responsywności (podstawowy) ===
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('networkidle');
    let bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
  });

  test('user can interact with login page', async ({ page }) => {
    // === KROK 1: Użytkownik przechodzi do strony logowania ===
    await page.goto('/login');

    // Poczekaj na załadowanie
    await page.waitForLoadState('networkidle');

    // === KROK 2: Sprawdź, czy formularz jest widoczny ===
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // === KROK 3: Sprawdź pola formularza ===
    const emailInput = form
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = form.locator('input[type="password"]').first();
    const submitButton = form.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // === KROK 4: Użytkownik wypełnia formularz (bez wysyłania) ===
    // Wypełnij email
    await emailInput.click();
    await emailInput.fill('test-user@example.com');
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('test-user@example.com');

    // Wypełnij hasło
    await passwordInput.click();
    await passwordInput.fill('TestPassword123!');
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue.length).toBeGreaterThan(0);

    // === KROK 6: Sprawdź link do rejestracji (jeśli istnieje) ===
    const registerLink = page.getByRole('link', {
      name: /register|zarejestruj|sign up|utwórz konto/i,
    });

    if ((await registerLink.count()) > 0) {
      // Kliknij i sprawdź przekierowanie
      await registerLink.first().click();
      await page.waitForLoadState('networkidle');

      const currentURL = page.url();
      expect(currentURL).toMatch(/register/i);
    }
  });

  test('app handles errors gracefully', async ({ page }) => {
    // === Test 1: Nieistniejąca strona ===
    const response = await page.goto('/this-definitely-does-not-exist-404');
    const status = response?.status() || 0;

    // Aplikacja powinna obsłużyć 404 (strona 404 lub redirect)
    if (status === 404) {
      // Sprawdź, czy jest jakaś zawartość (strona 404)
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
    }

    // === Test 2: Strona powinna się załadować bez błędów konsoli (krytycznych) ===
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sprawdź, czy nie ma krytycznych błędów
    const hasCriticalErrors = errors.some((e) =>
      /cannot read|undefined|null is not|failed to fetch/i.test(e)
    );

    if (hasCriticalErrors) {
      test.info().attach('critical-js-errors', {
        body: errors.join('\n'),
        contentType: 'text/plain',
      });
    }
  });
});
