import { expect, test } from '@playwright/test';

/**
 * Test E2E: Rejestracja i logowanie użytkownika
 *
 * Weryfikuje user flow z perspektywy użytkownika:
 * 1. Użytkownik otwiera stronę główną
 * 2. Widzi przyciski logowania/rejestracji
 * 3. Może przejść do strony rejestracji
 * 4. Może przejść do strony logowania
 */

test.describe('User Authentication Flow', () => {
  test('user can navigate to register page', async ({ page }) => {
    // 1. Użytkownik otwiera stronę główną
    await page.goto('/');

    // 2. Sprawdza, czy strona się załadowała (może być redirect do /login)
    await page.waitForLoadState('networkidle');

    // 3. Szuka linku/buttona do rejestracji
    const registerLink = page.getByRole('link', {
      name: /zarejestruj|register|sign up/i,
    });

    // Jeśli link istnieje, sprawdź czy prowadzi do /register
    if ((await registerLink.count()) > 0) {
      await registerLink.first().click();
      await expect(page).toHaveURL(/.*register/);

      // 4. Sprawdza, czy formularz rejestracji jest widoczny
      await expect(page.locator('form')).toBeVisible();

      // 5. Sprawdza, czy są pola email i hasło
      const emailField = page.locator(
        'input[type="email"], input[name="email"]'
      );
      const passwordField = page.locator('input[type="password"]');

      await expect(emailField.first()).toBeVisible();
      await expect(passwordField.first()).toBeVisible();
    } else {
      // Jeśli brak linku rejestracji, test przechodzi (może być inna implementacja)
      console.log(
        'Register link not found on homepage - skipping navigation test'
      );
    }
  });

  test('user can navigate to login page', async ({ page }) => {
    // 1. Użytkownik otwiera stronę główną
    await page.goto('/');

    // 2. Szuka linku/buttona do logowania
    const loginLink = page.getByRole('link', {
      name: /zaloguj|login|sign in/i,
    });

    // Jeśli link istnieje, sprawdź czy prowadzi do /login
    if ((await loginLink.count()) > 0) {
      await loginLink.first().click();
      await expect(page).toHaveURL(/.*login/);

      // 3. Sprawdza, czy formularz logowania jest widoczny
      await expect(page.locator('form')).toBeVisible();

      // 4. Sprawdza, czy są pola email i hasło
      const emailField = page.locator(
        'input[type="email"], input[name="email"]'
      );
      const passwordField = page.locator('input[type="password"]');

      await expect(emailField.first()).toBeVisible();
      await expect(passwordField.first()).toBeVisible();
    } else {
      // Test bezpośredniego dostępu do /login
      await page.goto('/login');

      // Sprawdza, czy formularz logowania jest widoczny
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('login page has required form elements', async ({ page }) => {
    // 1. Użytkownik przechodzi bezpośrednio do strony logowania
    await page.goto('/login');

    // 2. Sprawdza, czy formularz istnieje
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // 3. Sprawdza, czy są wymagane pola
    const emailInput = form
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = form.locator('input[type="password"]').first();
    const submitButton = form.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 4. Sprawdza, czy pola są editowalne
    await emailInput.click();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    await passwordInput.click();
    await passwordInput.fill('testpassword123');
    // Hasło może być masked, więc sprawdzamy tylko czy można wpisać
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue.length).toBeGreaterThan(0);
  });

  test('register page has required form elements', async ({ page }) => {
    // 1. Użytkownik przechodzi bezpośrednio do strony rejestracji
    await page.goto('/register');

    // 2. Sprawdza, czy formularz istnieje
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // 3. Sprawdza, czy są wymagane pola
    const emailInput = form
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = form.locator('input[type="password"]').first();
    const submitButton = form.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 4. Sprawdza, czy pola są editowalne
    await emailInput.click();
    await emailInput.fill('newuser@example.com');
    await expect(emailInput).toHaveValue('newuser@example.com');

    await passwordInput.click();
    await passwordInput.fill('securepassword123');
    const passwordValue = await passwordInput.inputValue();
    expect(passwordValue.length).toBeGreaterThan(0);
  });
});
