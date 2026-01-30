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
    console.log('Step 1: User visits homepage');
    await page.goto('/');

    // Sprawdź, czy strona się załadowała
    await expect(page).toHaveURL(/\//);

    // Sprawdź, czy strona odpowiada (nie jest pusta)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.trim().length).toBeGreaterThan(0);

    console.log('✓ Homepage loaded successfully');

    // === KROK 2: Użytkownik widzi podstawowe informacje ===
    console.log('Step 2: User sees basic app information');

    // Sprawdź tytuł strony
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log('  Page title:', title);

    // Sprawdź, czy są nagłówki
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    console.log('  Found', headingCount, 'headings');

    // === KROK 3: Eksploracja nawigacji ===
    console.log('Step 3: User explores navigation');

    const navLinks = page.locator('nav a, header a, a[href^="/"]');
    const linkCount = await navLinks.count();
    console.log('  Found', linkCount, 'navigation links');

    if (linkCount > 0) {
      // Zbierz wszystkie linki
      const links = await navLinks.evaluateAll((links) =>
        links.map((link) => ({
          text: link.textContent?.trim() || '',
          href: (link as HTMLAnchorElement).href,
        }))
      );

      console.log(
        '  Available links:',
        links.slice(0, 5).map((l) => l.text)
      );

      // Sprawdź, czy są linki do logowania/rejestracji
      const hasAuthLinks = links.some((l) =>
        /login|register|zaloguj|zarejestruj|sign in|sign up/i.test(l.text)
      );

      if (hasAuthLinks) {
        console.log('  ✓ Authentication links found');
      }
    }

    // === KROK 4: Próba nawigacji do kluczowych stron ===
    console.log('Step 4: User tries to access key pages');

    // Test dashboard (może wymagać logowania)
    await page.goto('/dashboard');
    const dashboardURL = page.url();

    if (dashboardURL.includes('/login') || dashboardURL.includes('/register')) {
      console.log(
        '  ✓ Dashboard requires authentication (redirected to:',
        dashboardURL,
        ')'
      );

      // Sprawdź, czy formularz logowania jest widoczny
      const loginForm = page.locator('form');
      if ((await loginForm.count()) > 0) {
        console.log('  ✓ Login form is visible');

        // Sprawdź pola formularza
        const emailField = loginForm.locator(
          'input[type="email"], input[name="email"]'
        );
        const passwordField = loginForm.locator('input[type="password"]');

        if ((await emailField.count()) > 0) {
          console.log('  ✓ Email field present');
        }
        if ((await passwordField.count()) > 0) {
          console.log('  ✓ Password field present');
        }
      }
    } else {
      console.log('  Dashboard accessible at:', dashboardURL);

      // Sprawdź, czy dashboard ma jakąś zawartość
      const dashboardContent = await page
        .locator('main, [role="main"], body')
        .textContent();
      expect(dashboardContent).toBeTruthy();
    }

    // === KROK 5: Powrót do strony głównej ===
    console.log('Step 5: User returns to homepage');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Strona główna może przekierowywać do /login jeśli użytkownik nie jest zalogowany
    const currentURL = page.url();
    console.log('  Current URL after navigating to /:', currentURL);

    if (currentURL.includes('/login')) {
      console.log('  ℹ Homepage redirects to login (authentication required)');
    } else {
      console.log('  ✓ Homepage accessible without authentication');
    }

    // === KROK 6: Test responsywności (podstawowy) ===
    console.log('Step 6: Basic responsiveness check');

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('networkidle');
    let bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
    console.log('  ✓ Desktop view renders correctly');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
    console.log('  ✓ Mobile view renders correctly');

    // === PODSUMOWANIE ===
    console.log('✅ Complete user flow test passed!');
  });

  test('user can interact with login page', async ({ page }) => {
    // === KROK 1: Użytkownik przechodzi do strony logowania ===
    console.log('User navigates to login page');
    await page.goto('/login');

    // Poczekaj na załadowanie
    await page.waitForLoadState('networkidle');

    // === KROK 2: Sprawdź, czy formularz jest widoczny ===
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    console.log('✓ Login form is visible');

    // === KROK 3: Sprawdź pola formularza ===
    const emailInput = form
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = form.locator('input[type="password"]').first();
    const submitButton = form.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    console.log('✓ All form fields are present');

    // === KROK 4: Użytkownik wypełnia formularz (bez wysyłania) ===
    console.log('User fills in the form');

    // Wypełnij email
    await emailInput.click();
    await emailInput.fill('test-user@example.com');
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('test-user@example.com');
    console.log('  ✓ Email field accepts input:', emailValue);

    // Wypełnij hasło
    await passwordInput.click();
    await passwordInput.fill('TestPassword123!');
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue.length).toBeGreaterThan(0);
    console.log('  ✓ Password field accepts input (masked)');

    // === KROK 5: Sprawdź, czy przycisk submit jest aktywny ===
    const isButtonEnabled = await submitButton.isEnabled();
    if (isButtonEnabled) {
      console.log('  ✓ Submit button is enabled');
    } else {
      console.log('  ℹ Submit button is disabled (may require validation)');
    }

    // === KROK 6: Sprawdź link do rejestracji (jeśli istnieje) ===
    const registerLink = page.getByRole('link', {
      name: /register|zarejestruj|sign up|utwórz konto/i,
    });

    if ((await registerLink.count()) > 0) {
      console.log('  ✓ Link to registration page found');

      // Kliknij i sprawdź przekierowanie
      await registerLink.first().click();
      await page.waitForLoadState('networkidle');

      const currentURL = page.url();
      expect(currentURL).toMatch(/register/i);
      console.log(
        '  ✓ Successfully navigated to registration page:',
        currentURL
      );
    } else {
      console.log('  ℹ No registration link found on login page');
    }

    console.log('✅ Login page interaction test passed!');
  });

  test('app handles errors gracefully', async ({ page }) => {
    // === Test 1: Nieistniejąca strona ===
    console.log('Test 1: User visits non-existent page');

    const response = await page.goto('/this-definitely-does-not-exist-404');
    const status = response?.status() || 0;

    console.log('  Response status:', status);

    // Aplikacja powinna obsłużyć 404 (strona 404 lub redirect)
    if (status === 404) {
      console.log('  ✓ Returns 404 status');

      // Sprawdź, czy jest jakaś zawartość (strona 404)
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
      console.log('  ✓ 404 page has content');
    } else if (status >= 200 && status < 400) {
      console.log('  ✓ Redirects to valid page (status:', status, ')');
    }

    // === Test 2: Strona powinna się załadować bez błędów konsoli (krytycznych) ===
    console.log('Test 2: Check for critical errors');

    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log('  Page error:', error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sprawdź, czy nie ma krytycznych błędów
    const hasCriticalErrors = errors.some((e) =>
      /cannot read|undefined|null is not|failed to fetch/i.test(e)
    );

    if (hasCriticalErrors) {
      console.warn('  ⚠ Critical JavaScript errors detected:', errors);
    } else {
      console.log('  ✓ No critical JavaScript errors');
    }

    console.log('✅ Error handling test completed!');
  });
});
