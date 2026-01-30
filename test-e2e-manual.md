# 🧪 Uruchamianie testów E2E - Instrukcja

## Problem: Testy E2E failują

Jeśli wszystkie 15 testów failuje, **najprawdopodobniej serwer dev nie jest uruchomiony**.

---

## ✅ Rozwiązanie 1: Ręczne uruchomienie (NAJBARDZIEJ NIEZAWODNE)

### Krok 1: Otwórz pierwszy terminal

```bash
npm run dev
```

Poczekaj, aż zobaczysz:

```
🚀 astro  v5.13.7 started in XXXms

  ┃ Local    http://127.0.0.1:4321/
  ┃ Network  use --host to expose
```

**Zostaw ten terminal otwarty!**

### Krok 2: Otwórz drugi terminal

W nowym terminalu uruchom testy:

```bash
npm run test:e2e
```

Teraz powinno działać! ✅

---

## ✅ Rozwiązanie 2: Skrypt PowerShell (Windows)

Użyj przygotowanego skryptu:

```powershell
.\test-e2e-with-server.ps1
```

Skrypt automatycznie:

1. Sprawdzi, czy port 4321 jest wolny
2. Uruchomi serwer dev
3. Poczeka 30 sekund
4. Uruchomi testy
5. Zatrzyma serwer po zakończeniu

---

## ✅ Rozwiązanie 3: Playwright automatycznie (powinno działać)

```bash
npm run test:e2e
```

Playwright próbuje automatycznie uruchomić serwer zgodnie z `playwright.config.ts`:

```typescript
webServer: {
  command: 'npm run dev -- --host 127.0.0.1 --port 4321',
  url: 'http://127.0.0.1:4321',
  reuseExistingServer: !isCI,
  timeout: 120_000,
}
```

Jeśli to nie działa, użyj Rozwiązania 1 (ręczne).

---

## 🐛 Diagnostyka problemów

### Sprawdź, czy port 4321 jest zajęty:

```powershell
netstat -ano | findstr :4321
```

Jeśli coś tam jest:

- Znajdź PID (ostatnia kolumna)
- Zatrzymaj proces: `taskkill /PID <numer> /F`

### Sprawdź, czy serwer odpowiada:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:4321" -UseBasicParsing
```

Powinno zwrócić status 200.

---

## 📋 Checklist troubleshootingu

- [ ] Serwer dev uruchomiony (`npm run dev`)
- [ ] Port 4321 wolny (nie zajęty)
- [ ] Strona działa w przeglądarce: http://127.0.0.1:4321
- [ ] Przeglądarki Playwright zainstalowane (`npx playwright install`)
- [ ] Zależności zainstalowane (`npm install`)
- [ ] Node.js wersja >= 18 (`node --version`)

---

## 🆘 Nadal nie działa?

### Sprawdź szczegółowe logi:

```bash
npm run test:e2e -- --debug
```

### Uruchom pojedynczy test:

```bash
npx playwright test smoke.spec.ts --headed
```

Zobaczysz przeglądarkę i co dokładnie się dzieje.

### Sprawdź logi CI:

Jeśli testy działają lokalnie, ale nie na CI, sprawdź `.github/workflows/ci.yml`.

---

## 💡 Pro tip: VS Code

Zainstaluj rozszerzenie **Playwright Test for VS Code**:

1. Extensions → Szukaj "Playwright Test"
2. Zainstaluj
3. Zobaczysz testy w sidebarze
4. Możesz uruchamiać je jednym kliknięciem!

---

## 📞 Jeśli nic nie pomaga

Wyślij mi output z:

```bash
npm run dev
```

I:

```bash
npm run test:e2e
```

Zobaczę dokładny błąd i pomogę!
