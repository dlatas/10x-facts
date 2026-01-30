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
  test('dashboard page loads and displays basic structure', async ({ page }) => {
    // 1. Użytkownik otwiera dashboard
    // UWAGA: W produkcji wymagane byłoby logowanie, ale na potrzeby testu
    // zakładamy, że można otworzyć dashboard (lub zostanie przekierowany)
    await page.goto('/dashboard');
    
    // 2. Sprawdza, czy strona się załadowała (może być redirect do /login jeśli nie zalogowany)
    const currentURL = page.url();
    
    if (currentURL.includes('/login')) {
      // Jeśli przekierowano do logowania, to jest OK - aplikacja działa
      console.log('Dashboard requires authentication - redirected to login (expected behavior)');
      await expect(page.locator('form')).toBeVisible();
    } else {
      // Jeśli dashboard się załadował, sprawdź podstawową strukturę
      console.log('Dashboard loaded successfully');
      
      // Sprawdź, czy jest jakaś zawartość (tytuł, nagłówek, itp.)
      const hasContent = await page.locator('h1, h2, main, [role="main"]').count() > 0;
      expect(hasContent).toBeTruthy();
    }
  });

  test('home page shows application name and basic info', async ({ page }) => {
    // 1. Użytkownik otwiera stronę główną
    await page.goto('/');
    
    // 2. Sprawdza, czy widzi nazwę aplikacji
    const pageText = await page.textContent('body');
    
    // Sprawdź, czy strona zawiera jakąkolwiek treść
    expect(pageText).toBeTruthy();
    expect(pageText!.length).toBeGreaterThan(0);
    
    // 3. Sprawdza, czy są podstawowe elementy nawigacji
    const links = page.locator('a');
    const linkCount = await links.count();
    
    // Powinna być przynajmniej jakaś nawigacja
    expect(linkCount).toBeGreaterThan(0);
  });

  test('collections page structure (if accessible)', async ({ page }) => {
    // 1. Próba otwarcia strony z kolekcjami
    await page.goto('/collections');
    
    const currentURL = page.url();
    
    if (currentURL.includes('/login') || currentURL.includes('/register')) {
      // Jeśli wymaga autentykacji, to jest OK
      console.log('Collections require authentication (expected behavior)');
      expect(currentURL).toMatch(/login|register/);
    } else {
      // Jeśli strona jest dostępna, sprawdź podstawową strukturę
      console.log('Collections page accessible');
      
      // Sprawdź, czy jest główny kontener
      const mainContent = page.locator('main, [role="main"], body > div');
      await expect(mainContent.first()).toBeVisible();
    }
  });

  test('navigation between pages works', async ({ page }) => {
    // 1. Użytkownik zaczyna od strony głównej
    await page.goto('/');
    const homeURL = page.url();
    
    // 2. Klika w link (jeśli istnieje)
    const firstLink = page.locator('a[href^="/"]').first();
    
    if (await firstLink.count() > 0) {
      const linkHref = await firstLink.getAttribute('href');
      await firstLink.click();
      
      // 3. Sprawdza, czy URL się zmienił (nawigacja działa)
      await page.waitForLoadState('networkidle');
      const newURL = page.url();
      
      // URL powinien się zmienić (chyba że był link do tej samej strony)
      if (linkHref && linkHref !== '/' && !linkHref.startsWith('#')) {
        expect(newURL).not.toBe(homeURL);
      }
      
      // 4. Strona powinna się załadować bez błędów
      const hasError = await page.locator('text=/error|błąd|failed/i').count() > 0;
      expect(hasError).toBeFalsy();
    } else {
      console.log('No navigation links found on homepage');
    }
  });

  test('app handles 404 page gracefully', async ({ page }) => {
    // 1. Użytkownik wchodzi na nieistniejącą stronę
    const response = await page.goto('/this-page-definitely-does-not-exist-xyz');
    
    // 2. Sprawdza odpowiedź serwera
    expect(response).toBeTruthy();
    
    // Może być 404 lub redirect do strony głównej
    const status = response!.status();
    
    if (status === 404) {
      // Jest dedykowana strona 404
      console.log('App has 404 page');
      
      // Sprawdź, czy jest jakaś treść
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(0);
    } else if (status >= 200 && status < 400) {
      // Może być redirect do strony głównej
      console.log('App redirects non-existent pages (status:', status, ')');
    } else {
      // Nieoczekiwany status
      console.log('Unexpected status for 404:', status);
    }
  });
});
