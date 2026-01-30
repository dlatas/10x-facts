
<plan_testów>

## 1. Wprowadzenie i cele testowania

Aplikacja **10xFacts** to web app (Astro 5 + React 19) do tworzenia i przeglądania fiszek w modelu: **Kolekcja → Temat → Fiszki**, z kluczową funkcją **AI (OpenRouter)** generującą **dokładnie 1** propozycję fiszki na akcję oraz z backendem opartym o **Supabase (PostgreSQL + Auth + RLS)**.

**Cele testów:**
- Potwierdzenie poprawności funkcjonalnej CRUD dla kolekcji/tematów/fiszek oraz ulubionych.
- Potwierdzenie bezpieczeństwa dostępu: **izolacja danych per użytkownik (RLS)**, poprawna autoryzacja (cookies/Bearer).
- Walidacja i stabilność funkcji AI: generacja, akceptacja/odrzucenie/pominięcie, limity dzienne UTC, odporność na błędy dostawcy.
- Zapewnienie jakości UX i niezawodności: obsługa błędów, stany pustych list, paginacja, wyszukiwanie „strict”.
- Ograniczenie ryzyk produkcyjnych: brak wycieków sekretów, stabilność endpointów, regresje w migracjach DB.

## 2. Zakres testów

### W zakresie (MVP)
- **API v1 (Astro endpoints)**:
  - Auth: `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`
  - Collections: `GET/POST /api/v1/collections`, `DELETE /api/v1/collections/:collectionId`
  - Topics: `GET/POST /api/v1/collections/:collectionId/topics`, `PATCH/DELETE /api/v1/topics/:topicId`
  - Flashcards: `GET/POST /api/v1/topics/:topicId/flashcards`, `PATCH/DELETE /api/v1/flashcards/:flashcardId`, `GET /api/v1/flashcards/favorites/random`
  - AI: `POST /api/v1/ai/generate`, `POST /api/v1/ai/accept`, `POST /api/v1/ai/reject`, `POST /api/v1/ai/skip`, `POST /api/v1/ai/generate-topic-description`
  - Debug (tylko DEV): `GET /api/v1/debug/env`
- **DB (Supabase migrations)**:
  - Tabele: `profiles`, `collections`, `topics`, `flashcards`, `ai_generation_events`
  - RLS/polityki, indeksy, triggery (immutability/system delete protection, edited_by_user, walidacja właściciela topic w `ai_generation_events`)
  - RPC: `get_random_favorite_flashcards(p_limit int)` + fallback losowania w pamięci
- **Frontend (Astro + React)**:
  - Widoki: dashboard, collections, topics, topic, favorites, auth flows (login/register/forgot/reset), nawigacja
  - Integracja z API i obsługa błędów (m.in. `HttpError`, odpowiedzi JSON z `{ error: { message } }`)
  - Wyszukiwanie i filtrowanie (q, favorites, source) + paginacja

### Poza zakresem (na później / jeśli powstanie implementacja)
- Zaawansowane metryki i panel admina (jeśli brak endpointów/UI w bieżącej wersji).
- Zaawansowane wyszukiwanie (diakrytyki, tolerancja literówek) – MVP ma „strict search”.
- Testy mobilne natywne (MVP web-only).

## 3. Typy testów do przeprowadzenia

### 3.1 Testy jednostkowe (Unit)
**Cel:** szybka walidacja logiki bez realnej sieci/DB.
- Walidacje Zod: `src/lib/validation/*` (limity długości, UUID, query preprocessing, `.strict()`, refine “min. jedno pole”)
- Serwisy domenowe: `src/lib/services/*` (np. `escapeLikePattern`, mapowanie błędów, fallback RPC)
- Logika AI: `computeDailyLimit`, `toUtcDayString`, `pickRandomTopicDomain`, parser/obcinanie tekstu (`clampTextAtBoundary`, `extractJsonObject`, `stripCodeFences`)
- HTTP helpers: `fetchJson` (mapowanie błędów, 401 → `HttpError`, parsowanie JSON/text)

### 3.2 Testy integracyjne API (Integration)
**Cel:** potwierdzenie zachowania endpointów z walidacją + (lokalnym) Supabase.
- Uruchomienie Supabase lokalnie (CLI) + migracje.
- Testy endpointów z realnym DB i RLS (cookies/Bearer).
- Testy kontraktów: statusy HTTP, kształt odpowiedzi, komunikaty błędów.

### 3.3 Testy integracyjne DB (Database)
**Cel:** potwierdzenie niezmienności i bezpieczeństwa w bazie (nie tylko w API).
- Migracje: poprawność tworzenia schematu i idempotencja
- RLS: separacja tenantów (user_id), poprawność polityk select/insert/update/delete
- Triggery: blokada usuwania rekordów systemowych, blokada zmiany pól immutable, ustawianie `edited_by_user`
- RPC `get_random_favorite_flashcards`: poprawność, limit, brak wycieku cudzych danych, działanie po włączeniu/wyłączeniu RLS (zgodnie z politykami)

### 3.4 Testy end-to-end (E2E)
**Cel:** pełne ścieżki użytkownika w przeglądarce (UI → API → DB).
- Rejestracja/logowanie/wylogowanie
- Tworzenie kolekcji/tematów/fiszek
- Generacja AI + accept/reject/skip + limit dzienny
- Favorites + losowe ulubione + filtry i wyszukiwanie

### 3.5 Testy regresyjne
**Cel:** wykrywanie powrotu błędów w kluczowych obszarach po zmianach.
- Smoke po każdym merge do `master`
- Pełna regresja przed release

### 3.6 Testy wydajnościowe (Performance)
- API: czasy odpowiedzi list (paginacja), wyszukiwanie, losowe ulubione (RPC vs fallback)
- AI: zachowanie pod przeciążeniem (timeouty, 502 mapowanie), brak cache (no-store)
- Frontend: Lighthouse (TTFB/CLS/LCP) dla kluczowych widoków

### 3.7 Testy bezpieczeństwa (Security)
- Autoryzacja: brak dostępu do cudzych zasobów (kolekcje/tematy/fiszki/events)
- RLS: próby obejścia przez manipulację ID
- Sekrety: brak wycieku `SUPABASE_SERVICE_ROLE_KEY` i `OPENROUTER_API_KEY`
- Abuse: dzienny limit eventów AI (UTC) i odporność na „limit bypass”
- OWASP: podstawowe testy (XSS w danych wejściowych, CSRF ryzyka przy cookies, nagłówki)

### 3.8 Testy dostępności (A11y)
- Podstawowe audyty (formularze auth, dialogi Radix/shadcn, nawigacja klawiaturą)
- Kontrast, fokus, aria-label w krytycznych akcjach (Create/Delete/Accept/Reject)

## 4. Scenariusze testowe dla kluczowych funkcjonalności

Poniżej scenariusze priorytetyzowane: **P0 (blokujące MVP)**, **P1 (wysokie)**, **P2 (średnie/niska)**.

### 4.1 Auth (Supabase Auth) – P0
- **Rejestracja**
  - Poprawne dane → 200 + `requiresEmailConfirmation` (true/false zależnie od konfiguracji)
  - Zły email / hasło < 8 → 400 z listą `issues`
  - Email istnieje → 409
  - Rate limit Supabase → 429 z komunikatem użytkowym
- **Logowanie**
  - Poprawne dane → 200
  - Błędne dane → 401 “Nieprawidłowy e-mail lub hasło.”
  - Email niepotwierdzony → 401 z dedykowanym komunikatem
  - Rate limit → 429
- **Wylogowanie**
  - Aktywna sesja cookie → 200 + cookies wyczyszczone (`Set-Cookie`)
  - Brak sesji → oczekiwane zachowanie (200/500) według implementacji Supabase; test stabilności i braku regresji

> Uwaga testowa/ryzyko: w kodzie istnieją wywołania klienta do endpointów reset hasła (`/api/v1/auth/password/*`), a w API mogą nie istnieć – dodać test kontraktowy “endpoint istnieje” i traktować brak jako defekt P0, jeśli UX tego wymaga.

### 4.2 Collections – P0
- **Listowanie**
  - 200 + `items`, `total`
  - `limit/offset/sort/order/q` walidacja (400 przy błędach)
  - Systemowa kolekcja `random_collection` jest zapewniana best-effort i powinna pojawić się na górze listy
- **Tworzenie**
  - 201 przy poprawnej nazwie
  - 409 dla duplikatu (unikalność per user)
  - 400 dla pustej/za długiej nazwy
- **Usuwanie**
  - 200 przy usunięciu zwykłej kolekcji
  - 403 przy próbie usunięcia systemowej
  - 404 gdy nie istnieje
  - Test kaskady: usunięcie kolekcji usuwa tematy i fiszki (ON DELETE CASCADE)
  - Test izolacji: użytkownik B nie usuwa kolekcji A (oczekiwane 404/403 wg RLS/implementacji)

### 4.3 Topics – P0
- **Listowanie tematów w kolekcji**
  - 404 gdy kolekcja nie istnieje
  - Walidacja query/param (400)
  - Dla `random_collection` systemowy temat `random_topic` powinien istnieć (best-effort) i pojawić się na liście
- **Tworzenie tematu**
  - 201 dla zwykłej kolekcji
  - 403 dla `random_collection` (blokada tworzenia)
  - 409 dla duplikatu nazwy w obrębie kolekcji
- **Edycja opisu**
  - 200 dla zwykłego tematu
  - 403 gdy body próbuje zmienić `name` lub `system_key`
  - 403 dla `random_topic` (blokada edycji opisu)
  - 400 walidacja (max 10000)
- **Usuwanie**
  - 200 dla zwykłego tematu
  - 403 dla tematu systemowego (spójne z triggerem DB)
  - Kaskada: usunięcie tematu usuwa fiszki

### 4.4 Flashcards – P0
- **Listowanie w temacie**
  - 404 gdy temat nie istnieje lub nie należy do usera
  - Query: `q` (<=200), `is_favorite` (true/false), `source` (manual/auto), paginacja i sort
  - “Strict search”: brak normalizacji diakrytyk (np. “lodz” nie znajduje “Łódź”)
- **Tworzenie manual**
  - 201 + poprawne pola DTO
  - 400 dla pustych / >200 (front) / >600 (back)
- **Edycja**
  - 200 dla zmiany front/back/favorite
  - 403 jeśli body zawiera `source` (explicit guard)
  - 404 gdy fiszka nie istnieje / cudza
  - `edited_by_user` powinno się ustawić przy zmianie treści (trigger DB) – test integracyjny DB+API
- **Usuwanie**
  - 200, 404 przy braku
- **Ulubione losowe**
  - 200 + `items` limit 1..20
  - Pusta lista dla braku ulubionych
  - Test ścieżki RPC (gdy migracje zawierają funkcję) i fallback (gdy RPC niedostępne)
  - Brak duplikatów w odpowiedzi (preferowane) i brak elementów spoza usera

### 4.5 AI generation (OpenRouter) – P0/P1
- **Generate proposal** `POST /api/v1/ai/generate` – P0
  - 200 + `proposal{front,back}` + `limit{remaining,reset_at_utc}` + `is_random` + `random_domain_label`
  - 404 dla nieistniejącego tematu (lub cudzy)
  - 400 walidacja body
  - 429 gdy limit dzienny wyczerpany (liczony po accepted/rejected/skipped)
  - 500 gdy brak `OPENROUTER_API_KEY`
  - 502 gdy dostawca AI zwraca błąd/timeout (mapowanie bez wycieku szczegółów)
  - Nagłówki: `Cache-Control: no-store`
  - Anty-powtórki: dla tematu z historią auto-generated, `front` nie powinien łatwo powtarzać ostatnich (test probabilistyczny: N wywołań, brak identycznego front w ostatnich K w większości prób)
- **Accept** `POST /api/v1/ai/accept` – P0
  - 201 + `flashcard_id` i `event_id`
  - Transakcyjność best-effort: jeśli event insert fail → fiszka usunięta (spójność)
  - 429 gdy limit dzienny wyczerpany
  - Weryfikacja telemetrii: `is_random` liczony po stronie serwera (nie ufać klientowi)
  - Walidacja front/back (trim, limity)
- **Reject/Skip** `POST /api/v1/ai/reject`, `POST /api/v1/ai/skip` – P0
  - 201 + `event_id`
  - 429 dla limitu
  - Poprawność statusów eventów: rejected vs skipped
- **Generate topic description** – P1
  - 200 + `description`
  - 403 dla `random_topic`
  - 502 na błąd AI
  - `Cache-Control: no-store`

### 4.6 Debug env (DEV-only) – P1
- W DEV: 200, zwraca tylko bezpieczne flagi (np. “key set”, bez klucza)
- W PROD: 404
- Dostęp tylko dla zalogowanego

### 4.7 UI/UX (Astro + React) – P0/P1
- **Nawigacja i routingi**: 404, przejścia między views, parametry dynamiczne (`[collectionId]`, `[topicId]`)
- **Dialogi CRUD** (create/delete/edit): walidacje, komunikaty błędów, cancel/confirm
- **Obsługa błędów API**: mapowanie `HttpError` na toast/komunikat, brak “silent failures”
- **Stany danych**: loading/empty/error dla list; paginacja i filtracja
- **Dostępność**: fokus, ESC zamyka dialog, tab order, etykiety pól i przycisków

## 5. Środowisko testowe

### Lokalne (dev)
- Node.js zgodny z `.nvmrc` (22.14.0), `npm install`, `npm run dev`
- Supabase lokalnie:
  - `npx supabase start`
  - `npx supabase db reset` (migracje + seed, jeśli istnieje)
- Konfiguracja `.env` na bazie `.env.example`:
  - `SUPABASE_URL`, `SUPABASE_KEY`
  - `OPENROUTER_API_KEY`, opcjonalnie `OPENROUTER_MODEL`
  - `AI_DAILY_EVENT_LIMIT`

### CI (GitHub Actions)
- Etapy minimalne:
  - lint/format check
  - unit tests
  - integration (Supabase w kontenerach lub service) – opcjonalnie w nocy
  - e2e (Playwright) – smoke na PR, pełne na main/nightly

### Staging/Production
- Staging z osobnym projektem Supabase (oddzielne klucze)
- Monitoring regresji po deployu (smoke + sanity)

## 6. Narzędzia do testowania

Rekomendowane (dobrane pod Astro/React/TS/Supabase):
- **Unit/Integration (TS)**: Vitest + TypeScript, ewentualnie `@testing-library/react` dla komponentów
- **Mocki sieci**: MSW (frontend/service tests), `undici`/fetch mocks dla serwisów
- **API contract**: schematy Zod + snapshoty odpowiedzi, opcjonalnie OpenAPI (jeśli zostanie dodane)
- **E2E**: Playwright (testy UI + API), raport HTML
- **DB**: pgTAP lub testy SQL + supabase CLI w pipeline; alternatywnie testy integracyjne przez supabase-js
- **Wydajność**: k6 (API), Lighthouse CI (frontend)
- **Security**: OWASP ZAP baseline (staging), skan zależności (npm audit)
- **A11y**: axe-core (Playwright), Lighthouse a11y

## 7. Harmonogram testów

Propozycja dla iteracji MVP (przykładowo 2 tygodnie):
- **Dzień 1–2**: przygotowanie środowiska testowego (Supabase local/staging), dane testowe, smoke testy API
- **Dzień 3–5**: testy integracyjne API (Collections/Topics/Flashcards) + DB (RLS/triggery/kaskady)
- **Dzień 6–7**: testy AI (generate/accept/reject/skip, limity UTC, awarie OpenRouter)
- **Dzień 8–9**: E2E krytyczne ścieżki + a11y (auth, CRUD, AI, favorites)
- **Dzień 10**: performance baseline (Lighthouse + k6) + regresja + raport końcowy
- **Ciągle**: smoke na PR, regresja przed release, nightly dla cięższych testów (DB/e2e/perf)

## 8. Kryteria akceptacji testów

- **Funkcjonalne (P0)**: 100% pass dla scenariuszy P0 (auth + CRUD + AI decision flow + RLS izolacja)
- **Błędy**:
  - 0 otwartych **Critical/Blocker**
  - ≤ 2 **High** (z zaakceptowanym obejściem i planem naprawy)
- **Stabilność**: brak flaky testów w smoke; E2E stabilne (retry tylko dla znanych problemów sieci)
- **Bezpieczeństwo**: brak wycieków sekretów; brak możliwości dostępu do cudzych danych w testach RLS
- **Wydajność (baseline)**:
  - Listowanie/paginacja w akceptowalnym czasie w staging (uzgodnione progi, np. p95 < 500–800 ms dla endpointów listujących bez AI)
  - AI: timeouty obsłużone, błędy mapowane na 502/500 bez crashy

## 9. Role i odpowiedzialności

- **QA Engineer**
  - Przygotowanie planu i przypadków testowych
  - Budowa i utrzymanie automatyzacji (unit/integration/e2e)
  - Raporty jakości, triage defektów, rekomendacje go/no-go
- **Developer**
  - Naprawa defektów, dodawanie testowalnych punktów (np. izolacja logiki, kontrakty)
  - Wsparcie w tworzeniu fixture’ów/test data
- **DevOps/Platform**
  - Staging/CI pipeline, sekrety, stabilność Supabase w CI, artefakty raportów
- **Product/Owner**
  - Priorytety P0/P1, akceptacja odchyleń, decyzje release

## 10. Procedury raportowania błędów

**Kanał:** GitHub Issues (lub narzędzie zespołowe, jeśli inne), z etykietami i szablonem.

**Minimalny szablon zgłoszenia:**
- **Tytuł**: `[Moduł] Krótki opis – oczekiwane vs aktualne`
- **Środowisko**: local/staging/prod, commit SHA, konfiguracja (DEV/PROD), przeglądarka (dla UI)
- **Kroki odtworzenia**: numerowane
- **Oczekiwany rezultat** / **Rzeczywisty rezultat**
- **Dane wejściowe**: request (endpoint, body/query), ID zasobów, użytkownik testowy
- **Załączniki**: logi, screenshot, nagranie, HAR (dla sieci)
- **Severity/Priority**:
  - Critical/High/Medium/Low
  - P0/P1/P2
- **Dodatkowe informacje**: czy błąd jest regresją, częstotliwość, workaround

**Triage:**
- Daily triage dla P0/P1
- Każdy defekt musi mieć właściciela, priorytet, wersję docelową i kryterium zamknięcia (test potwierdzający).

</plan_testów>

