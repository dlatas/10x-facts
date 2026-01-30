# 🧪 Testy E2E (End-to-End)

Testy E2E weryfikują działanie aplikacji z perspektywy użytkownika, symulując rzeczywiste interakcje.

## 📁 Struktura testów

```
e2e/
├── smoke.spec.ts                    # Podstawowe testy smoke (czy app odpowiada)
├── user-flow-auth.spec.ts          # Flow autentykacji (login/register)
├── user-flow-dashboard.spec.ts     # Flow dashboard i nawigacji
└── user-flow-complete.spec.ts      # Kompletny user journey
```

## 🎯 Co testujemy?

### 1. **smoke.spec.ts** - Smoke Tests

- ✅ Czy aplikacja odpowiada na żądania HTTP
- ✅ Czy strona główna się ładuje
- ✅ Czy podstawowe strony zwracają prawidłowy status

**Cel**: Szybkie sprawdzenie, czy aplikacja w ogóle działa.

---

### 2. **user-flow-auth.spec.ts** - Autentykacja

- ✅ Nawigacja do strony logowania
- ✅ Nawigacja do strony rejestracji
- ✅ Weryfikacja pól formularza (email, hasło, submit)
- ✅ Możliwość wypełnienia formularzy

**Cel**: Weryfikacja, że użytkownik może się zalogować/zarejestrować.

---

### 3. **user-flow-dashboard.spec.ts** - Dashboard i kolekcje

- ✅ Dostęp do dashboard (lub redirect do loginu)
- ✅ Wyświetlanie podstawowej struktury
- ✅ Nawigacja między stronami
- ✅ Obsługa błędów (404)

**Cel**: Sprawdzenie głównych funkcjonalności aplikacji.

---

### 4. **user-flow-complete.spec.ts** - Kompletny user journey

- ✅ Pełny flow od wejścia na stronę do interakcji
- ✅ Eksploracja nawigacji
- ✅ Próba dostępu do chronionych stron
- ✅ Test responsywności (desktop/mobile)
- ✅ Obsługa błędów

**Cel**: Symulacja rzeczywistego użycia aplikacji przez użytkownika.

---

## 🚀 Uruchamianie testów

### ⚠️ WAŻNE: Serwer dev musi działać!

Testy E2E wymagają działającego serwera na `http://127.0.0.1:4321`.

### Metoda 1: Automatyczna (zalecana)

Playwright automatycznie uruchomi serwer:

```bash
npm run test:e2e
```

### Metoda 2: Ręczna (bardziej niezawodna)

**Terminal 1** - Uruchom serwer dev:

```bash
npm run dev
```

**Terminal 2** - Uruchom testy:

```bash
npm run test:e2e
```

### Metoda 3: Skrypt PowerShell (Windows)

```powershell
.\test-e2e-with-server.ps1
```

Automatycznie uruchomi serwer, poczeka, uruchomi testy i zatrzyma serwer.

### W trybie UI (interaktywny)

```bash
npm run test:e2e:ui
```

### Tylko smoke tests

```bash
npx playwright test smoke.spec.ts
```

### Konkretny plik

```bash
npx playwright test user-flow-complete.spec.ts
```

### Z widokiem przeglądarki (headed mode)

```bash
npm run test:e2e:headed
```

### Debug mode

```bash
npm run test:e2e:debug
```

---

## 📊 Raport z testów

Po uruchomieniu testów, raport HTML jest automatycznie generowany:

```bash
npm run test:e2e:report
```

---

## ⚙️ Konfiguracja

Konfiguracja testów znajduje się w: **`playwright.config.ts`**

### Kluczowe ustawienia:

- **Port**: `4321` (Astro dev server)
- **Base URL**: `http://127.0.0.1:4321`
- **Timeout**: 120 sekund na uruchomienie serwera
- **Przeglądarki**: Chromium (domyślnie)

---

## 🐛 Troubleshooting

### Problem: Wszystkie testy failują (15 failed)

**Najczęstsza przyczyna**: Serwer dev nie jest uruchomiony!

**Rozwiązanie**:

**Terminal 1**:

```bash
npm run dev
```

Poczekaj, aż zobaczysz: `Local http://127.0.0.1:4321/`

**Terminal 2**:

```bash
npm run test:e2e
```

### Problem: Port 4321 jest zajęty

**Rozwiązanie**: Zatrzymaj proces używający portu:

```powershell
# Znajdź proces
netstat -ano | findstr :4321

# Zatrzymaj (zastąp <PID> numerem z poprzedniej komendy)
taskkill /PID <PID> /F
```

### Problem: Testy nie mogą połączyć się z serwerem

**Rozwiązanie**: Sprawdź, czy serwer odpowiada:

```powershell
# Powinno zwrócić status 200
Invoke-WebRequest -Uri "http://127.0.0.1:4321" -UseBasicParsing
```

Jeśli nie odpowiada, uruchom serwer ręcznie:

```bash
npm run dev
```

---

### Problem: Testy timeout

**Rozwiązanie**: Zwiększ timeout w `playwright.config.ts`:

```typescript
use: {
  timeout: 60000, // 60 sekund
}
```

---

### Problem: Testy przechodzą lokalnie, ale nie na CI

**Rozwiązanie**: Sprawdź logi CI, możliwe przyczyny:

- Brakujące zmienne środowiskowe (`.env`)
- Port zajęty
- Wolniejsza maszyna CI (zwiększ timeout)

---

## 📝 Pisanie nowych testów

### Struktura testu:

```typescript
import { expect, test } from '@playwright/test';

test.describe('Feature Name', () => {
  test('user can do something', async ({ page }) => {
    // 1. Arrange - przygotuj
    await page.goto('/some-page');

    // 2. Act - wykonaj akcję
    await page.click('button');

    // 3. Assert - sprawdź wynik
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Best practices:

1. **Używaj descriptive names**: `user can create a collection`
2. **Test z perspektywy użytkownika**: "user clicks", "user sees"
3. **Nie testuj implementacji**: testuj zachowanie, nie kod
4. **Używaj data-testid**: dla stabilnych selektorów
5. **Dokumentuj**: dodaj komentarze wyjaśniające DLACZEGO testujemy

---

## 🎯 Wymagania certyfikacji 10xDevs

**Wymaganie**: Co najmniej jeden test weryfikujący działanie z perspektywy użytkownika.

**Status**: ✅ **SPEŁNIONE**

### Które testy spełniają wymaganie?

Wszystkie poniższe testy weryfikują działanie z perspektywy użytkownika:

1. ✅ **user-flow-auth.spec.ts**
   - Test: `user can navigate to login page`
   - Test: `user can interact with login form`

2. ✅ **user-flow-complete.spec.ts**
   - Test: `user visits homepage and explores the app`
   - Test: `user can interact with login page`

3. ✅ **user-flow-dashboard.spec.ts**
   - Test: `dashboard page loads and displays basic structure`
   - Test: `navigation between pages works`

**Najbardziej kompleksowy**: `user-flow-complete.spec.ts` - testuje pełny user journey od wejścia na stronę do interakcji z formularzami.

---

## 📚 Dokumentacja

- **Playwright Docs**: https://playwright.dev/
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Selectors**: https://playwright.dev/docs/selectors
- **Assertions**: https://playwright.dev/docs/test-assertions

---

## ✅ Checklist dla nowych testów

Przed dodaniem nowego testu E2E, sprawdź:

- [ ] Test ma opisową nazwę (z perspektywy użytkownika)
- [ ] Test jest niezależny (może działać sam)
- [ ] Test używa `expect` do weryfikacji
- [ ] Test ma komentarze wyjaśniające kroki
- [ ] Test obsługuje timeout (await)
- [ ] Test jest dodany do odpowiedniego pliku lub nowego `.spec.ts`

---

**Sukces!** 🎉 Masz kompletne testy E2E weryfikujące działanie aplikacji z perspektywy użytkownika.
