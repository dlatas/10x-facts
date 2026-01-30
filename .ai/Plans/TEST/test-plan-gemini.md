Oto szczegółowy plan testów dla projektu **10x Facts**, przygotowany na podstawie analizy dostarczonego kodu źródłowego oraz struktury repozytorium.

---

# Plan Testów: Projekt „10x Facts”

## 1. Wprowadzenie i cele testowania

Projekt **10x Facts** to aplikacja webowa do nauki opartej na fiszkach, wykorzystująca sztuczną inteligencję (AI) do generowania treści. Celem testowania jest zapewnienie wysokiej jakości interfejsu użytkownika, niezawodności integracji z usługami zewnętrznymi (Supabase, OpenRouter) oraz bezpieczeństwa danych poprzez weryfikację polityk RLS (Row Level Security).

**Główne cele:**

- Weryfikacja poprawności procesu uwierzytelniania i autoryzacji.
- Zapewnienie stabilności funkcji generowania fiszek przez AI.
- Potwierdzenie integralności operacji CRUD na kolekcjach, tematach i fiszkach.
- Sprawdzenie odporności aplikacji na błędy API i przekroczenia limitów (rate limiting).

## 2. Zakres testów

### 2.1. Funkcjonalności objęte testami:

- **System Autoryzacji:** Rejestracja, logowanie, odzyskiwanie i resetowanie hasła, obsługa sesji (middleware).
- **Zarządzanie Kolekcjami:** Tworzenie, wyświetlanie, wyszukiwanie i usuwanie kolekcji (z uwzględnieniem kolekcji systemowych).
- **Zarządzanie Tematami:** CRUD tematów wewnątrz kolekcji, edycja opisów tematów, obsługa "Tematu Losowego".
- **Zarządzanie Fiszkami:** Manualne tworzenie, edycja, usuwanie, dodawanie do ulubionych.
- **Moduł AI:** Generowanie propozycji fiszek, akceptacja/odrzucanie propozycji, generowanie opisów tematów, limity dzienne.
- **Dashboard i Ulubione:** Wyświetlanie losowych ulubionych fiszek, filtrowanie ulubionych po kolekcjach/tematach.

### 2.2. Funkcjonalności wyłączone z testów:

- Zewnętrzne panele administracyjne Supabase.
- Analityka biznesowa (niezaimplementowana w dostarczonym kodzie).

## 3. Typy testów

1.  **Testy Jednostkowe (Unit Tests):** Weryfikacja logiki w `lib/utils.ts`, walidacji Zod w `lib/validation/` oraz serwisów niepowiązanych bezpośrednio z I/O.
2.  **Testy Integracyjne:** Testowanie komunikacji między frontendem a API (Astro endpoints) oraz poprawności zapytań do Supabase.
3.  **Testy E2E (End-to-End):** Kompletne ścieżki użytkownika (np. od rejestracji do wygenerowania pierwszej fiszki AI).
4.  **Testy Bezpieczeństwa:** Weryfikacja polityk RLS (czy użytkownik A może zobaczyć kolekcje użytkownika B) oraz walidacja tokenów JWT w middleware.
5.  **Testy Interfejsu Użytkownika (UI):** Responsywność (Tailwind), stany ładowania (Skeletons) oraz obsługa powiadomień Sonner.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Moduł AI i Generowanie Treści

| ID    | Opis                                                    | Oczekiwany rezultat                                                                    |
| :---- | :------------------------------------------------------ | :------------------------------------------------------------------------------------- |
| AI-01 | Generowanie propozycji dla tematu z opisem.             | System zwraca poprawny JSON, wyświetla modal z propozycją i odpala konfetti.           |
| AI-02 | Próba generowania propozycji przy pustym opisie tematu. | System blokuje przycisk "Generuj AI" lub wyświetla błąd walidacji (opis wymagany).     |
| AI-03 | Przekroczenie dziennego limitu AI.                      | API zwraca status 429, użytkownik widzi informację o resecie limitu o północy UTC.     |
| AI-04 | Akceptacja propozycji AI.                               | Fiszka zostaje zapisana w DB z oznaczeniem `source: auto_generated`, modal się zamyka. |

### 4.2. Kolekcje i Tematy (Logika Systemowa)

| ID     | Opis                                            | Oczekiwany rezultat                                                                           |
| :----- | :---------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| COL-01 | Próba usunięcia kolekcji "Random" (systemowej). | Przycisk usuwania jest nieaktywny lub API zwraca błąd 403 (forbidden_system).                 |
| COL-02 | Wyszukiwanie kolekcji po nazwie.                | Lista filtruje się dynamicznie (debounce 300ms) i aktualizuje URL (parametr `q`).             |
| TOP-01 | Generowanie opisu tematu przez AI.              | Pole tekstowe w modalu wypełnia się wygenerowaną treścią, którą można edytować przed zapisem. |

### 4.3. Uwierzytelnianie i Middleware

| ID      | Opis                                      | Oczekiwany rezultat                                            |
| :------ | :---------------------------------------- | :------------------------------------------------------------- |
| AUTH-01 | Dostęp do `/dashboard` bez zalogowania.   | Middleware przekierowuje do `/login?next=/dashboard`.          |
| AUTH-02 | Rejestracja z istniejącym adresem e-mail. | System wyświetla czytelny błąd i sugeruje powrót do logowania. |

## 5. Środowisko testowe

- **Staging:** Vercel / Netlify (zmienne środowiskowe podpięte pod testową instancję Supabase).
- **Baza danych:** Supabase (izolowany projekt testowy z włączonym RLS).
- **Przeglądarki:** Chrome, Firefox, Safari, Mobile Chrome (testy responsywności).

## 6. Narzędzia do testowania

- **Vitest:** Testy jednostkowe i integracyjne logiki TS.
- **Playwright / Cypress:** Automatyzacja testów E2E.
- **Postman / Hoppscotch:** Testowanie endpointów API (`/api/v1/*`).
- **React Testing Library:** Testy komponentów UI (shadcn).

## 7. Harmonogram testów

1.  **Faza 1 (Development):** Testy jednostkowe pisane równolegle z funkcjonalnościami (TDD/BDD).
2.  **Faza 2 (Integration):** Testy endpointów API po zakończeniu migracji bazy danych.
3.  **Faza 3 (UAT):** Testy akceptacyjne na środowisku stagingowym (scenariusze manualne).
4.  **Faza 4 (Regression):** Uruchomienie pełnego pakietu Playwright przed każdym mergem do gałęzi `main`.

## 8. Kryteria akceptacji testów

- Wszystkie testy krytyczne (P0) – autoryzacja, zapis danych, generowanie AI – muszą zakończyć się sukcesem.
- Brak błędów typu "Blocked" w logach konsoli przeglądarki.
- Pokrycie kodu (Code Coverage) dla warstwy `lib/services` na poziomie min. 80%.
- Poprawna obsługa błędów 401, 404, 429 i 500 przez UI (Sonner toast).

## 9. Role i odpowiedzialności

- **QA Engineer:** Tworzenie planu, automatyzacja testów E2E, raportowanie błędów.
- **Frontend Developer:** Implementacja testów jednostkowych komponentów, naprawa błędów UI.
- **Backend/Fullstack Developer:** Testy integracyjne API, weryfikacja polityk RLS w Supabase.
- **Product Owner:** Ostateczna akceptacja scenariuszy biznesowych (UAT).

## 10. Procedury raportowania błędów

Błędy należy zgłaszać w systemie śledzenia zadań (np. GitHub Issues / Jira) według schematu:

1.  **Tytuł:** Zwięzły opis problemu.
2.  **Środowisko:** (np. Staging, Chrome 120).
3.  **Kroki do reprodukcji:** Punktowa lista działań.
4.  **Oczekiwany rezultat vs. Rezultat rzeczywisty.**
5.  **Załączniki:** Zrzuty ekranu, logi z konsoli, payloady API.
6.  **Priorytet:** (Critical, High, Medium, Low).
