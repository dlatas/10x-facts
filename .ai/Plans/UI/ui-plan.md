## Architektura UI dla 10xFacts

## 1. Przegląd struktury UI

10xFacts to aplikacja webowa do kolekcjonowania i odkrywania ciekawostek w formie fiszek, z organizacją danych w strukturze **Kolekcja → Temat → Fiszki**, oraz z generowaniem pojedynczej propozycji fiszki przez AI, jak również z możliwością manualnego dodania fiszki.

Architektura UI MVP opiera się o:
- **Routing (osobne trasy)** dla kluczowych widoków: Dashboard, Kolekcje, Tematy, Fiszki, Ulubione, Profil użytkownika.
- **App Shell** w dwóch wariantach:
  - **DashboardLayout**: stały navbar + dashboardowy sidebar + treść (grid).
  - **AppLayout**: stały navbar + treść (widoki list i szczegółów).
- **Stały Navbar** z:
  - linkami nawigacji: **Dashboard**, **Kolekcje**, **Ulubione**,
  - wskaźnikiem **„Pozostałe generacje”** (skeleton/ghost loader przy braku danych) + tooltip resetu o **00:00 UTC**,
  - awatarem (pierwsza litera e-maila) i dropdownem: **User profile**, **Log out**.
- **Warstwę danych** z cache i invalidacją po mutacjach (rekomendowane TanStack Query), z konsekwentną obsługą stanów: loading/empty/error.
- **Bezpieczeństwo**: guard sesji dla widoków aplikacji, reakcje na `401` (wylogowanie/przekierowanie), ukrywanie sekcji admina na podstawie `profiles.is_admin`, ochrona zasobów systemowych (Kolekcja/Temat losowy) przed usuwaniem.

## 2. Kluczowe wymagania z PRD (MVP)

- **Konta i dostęp**: rejestracja, logowanie, wylogowanie; izolacja danych per użytkownik; admin-only metryki.
- **Model danych i nawigacja**: Kolekcje → Tematy → Fiszki; brak zmiany nazw kolekcji/tematów w MVP.
- **Fiszki**:
  - tworzenie manualne (front ≤ 200, back ≤ 600),
  - edycja tylko front/back, flaga `edited_by_user`,
  - usuwanie (hard delete),
  - ulubione (`is_favorite`) z możliwością filtrowania.
- **Generowanie AI**:
  - 1 propozycja na akcję,
  - w tematach użytkownika bazuje na aktualnym opisie tematu,
  - w Temacie losowym domena losowana po stronie backendu,
  - podgląd propozycji z akcjami **Zapisz** i **Odrzuć** (oraz możliwość „brak akcji”/zamykanie).
- **Wyszukiwanie i filtrowanie**:
  - strict (bez normalizacji diakrytyków, bez literówek),
  - listy: kolekcje, tematy, fiszki (front/back),
  - fiszki: filtr ulubionych i filtr źródła (manual vs AI).
- **Systemowa losowość**: stała, nieusuwalna „Kolekcja losowa” i „Temat losowy”, widoczne na listach (badge), z przypięciem na dole w dashboardowym sidebarze.
- **Limit dzienny AI**: reset o 00:00 UTC, UI ma minimalizować przypadkowe powtórzenia (blokada akcji generowania w trakcie requestu) oraz pokazywać komunikat, gdy limit jest wyczerpany.
- **Metryki admina**: accept rate oraz udział AI vs manual.

## 3. Główne endpointy API i ich cele (mapa integracji)

- **Auth (Supabase Auth)**:
  - `POST /auth/signup`: rejestracja e-mail/hasło
  - `POST /auth/login`: logowanie e-mail/hasło
  - `POST /auth/logout`: wylogowanie
- **Profil**:
  - `GET /api/v1/profile`: pobranie profilu (m.in. `is_admin`)
- **Kolekcje**:
  - `GET /api/v1/collections`: lista (w tym kolekcja systemowa)
  - `POST /api/v1/collections`: utworzenie kolekcji
  - `DELETE /api/v1/collections/{collectionId}`: usunięcie kolekcji (403 dla systemowej)
- **Tematy**:
  - `GET /api/v1/collections/{collectionId}/topics`: lista tematów w kolekcji (w tym temat systemowy, jeśli dotyczy)
  - `POST /api/v1/collections/{collectionId}/topics`: utworzenie tematu
  - `PATCH /api/v1/topics/{topicId}`: aktualizacja wyłącznie opisu
  - `DELETE /api/v1/topics/{topicId}`: usunięcie tematu (403 dla systemowego)
- **Fiszki**:
  - `GET /api/v1/topics/{topicId}/flashcards`: lista fiszek w temacie + `q`, `is_favorite`, `source`
  - `POST /api/v1/topics/{topicId}/flashcards`: utworzenie manualnej fiszki
  - `PATCH /api/v1/flashcards/{flashcardId}`: edycja front/back i/lub toggle `is_favorite`
  - `DELETE /api/v1/flashcards/{flashcardId}`: usunięcie fiszki
  - `GET /api/v1/flashcards/favorites/random`: losowe ulubione (dashboard)
- **AI**:
  - `POST /api/v1/ai/generate`: wygenerowanie 1 propozycji + stan limitu (`remaining`, `reset_at_utc`)
  - `POST /api/v1/ai/accept`: akceptacja (tworzy fiszkę + event)
  - `POST /api/v1/ai/reject`: odrzucenie (event)
  - `POST /api/v1/ai/skip`: pominięcie (event, opcjonalnie)
- **Admin metryki (admin-only)**:
  - `GET /api/v1/admin/metrics/summary`
  - `GET /api/v1/admin/metrics/daily`

## 4. Lista widoków

### 4.1 Widoki publiczne (bez sesji)

- **Auth: Logowanie**
  - **Ścieżka**: `/login`
  - **Główny cel**: zalogowanie użytkownika (e-mail/hasło).
  - **Kluczowe informacje**: formularz, link do rejestracji, komunikaty błędów.
  - **Kluczowe komponenty**: formularz auth, walidacja, przycisk submit, alert/toast błędu.
  - **UX/A11y/Bezpieczeństwo**:
    - jasne błędy dla `400/401`, focus na pierwszym błędnym polu,
    - blokada submit w trakcie requestu,
    - po sukcesie redirect do `/dashboard`.

- **Auth: Rejestracja**
  - **Ścieżka**: `/signup`
  - **Główny cel**: utworzenie konta.
  - **Kluczowe informacje**: formularz, informacja co dalej (np. weryfikacja e-mail zależnie od konfiguracji), link do logowania.
  - **Kluczowe komponenty**: formularz auth, walidacja, alert/toast.
  - **UX/A11y/Bezpieczeństwo**:
    - obsługa `400/409` (np. e-mail zajęty),
    - po sukcesie redirect zgodnie z konfiguracją Supabase (sesja lub komunikat).

- **Not Found**
  - **Ścieżka**: `*` (fallback)
  - **Główny cel**: czytelny komunikat i powrót do właściwego miejsca.
  - **Kluczowe informacje**: „Nie znaleziono strony”, CTA do `/dashboard` lub `/login`.
  - **Kluczowe komponenty**: komunikat, przyciski nawigacji.

### 4.2 Widoki chronione (wymagają sesji)

- **Start/Redirect**
  - **Ścieżka**: `/`
  - **Główny cel**: przekierowanie zależnie od sesji.
  - **Zachowanie**:
    - zalogowany → `/dashboard`
    - niezalogowany → `/login`

- **Dashboard**
  - **Ścieżka**: `/dashboard`
  - **Główny cel**: szybkie wejście do kolekcji oraz odkrywanie **6 losowych ulubionych**.
  - **Kluczowe informacje do wyświetlenia**:
    - sidebar: do 6 kolekcji + pinned **Kolekcja losowa** z badge,
    - grid: 6 losowych ulubionych,
    - „Wszystkie kolekcje” (CTA do `/collections/{collectionIId}`).
  - **Kluczowe komponenty widoku**:
    - dashboardowy sidebar kolekcji (mini lista + inline add),
    - karty ulubionych (klik → modal szczegółów),
    - modal szczegółów ulubionej fiszki (front/back + metadane + linki).
  - **UX/A11y/Bezpieczeństwo**:
    - sidebar: inline dodawanie kolekcji (Enter/Esc + ikony),
    - modal szczegółów: focus trap, zamykanie Esc,
    - brak nawigacji po kliknięciu w kartę (otwieramy modal, nie przenosimy),
    - obsługa `401` (sesja wygasła) → redirect do `/login`.

- **Kolekcje (lista)**
  - **Ścieżka**: `/collections`
  - **Główny cel**: pełna lista kolekcji, wyszukiwanie, usuwanie kolekcji (z wyjątkiem systemowej), wejście do tematów.
  - **Kluczowe informacje**:
    - lista kolekcji z oznaczeniem systemowej,
    - wyszukiwarka `q` (strict),
    - akcje: wejście do tematów, usunięcie.
  - **Kluczowe komponenty**:
    - wyszukiwarka + lista,
    - przycisk „Utwórz kolekcję” (lub inline),
    - confirm dialog usunięcia z ostrzeżeniem o kaskadzie (tematy + fiszki).
  - **UX/A11y/Bezpieczeństwo**:
    - `DELETE` systemowej kolekcji → UI blokuje akcję i tłumaczy „nieusuwalna” (API i tak zwróci `403`),
    - po usunięciu: invalidacja list, toast, ewentualny redirect (jeśli użytkownik był „w środku” usuniętego zasobu),
    - `409` (nazwa zajęta) jako błąd inline w formularzu.

- **Tematy w kolekcji (lista)**
  - **Ścieżka**: `/collections/:collectionId/topics`
  - **Główny cel**: lista tematów w wybranej kolekcji + tworzenie tematu + wejście do widoków tematu/fiszek.
  - **Kluczowe informacje**:
    - nazwa kolekcji (z kontekstu nawigacyjnego),
    - lista tematów, wyszukiwarka `q` (strict),
    - oznaczenie tematu systemowego (w kolekcji systemowej).
  - **Kluczowe komponenty**:
    - lista tematów, CTA „Utwórz temat”,
    - akcje: „Opis tematu” (`/topics/:topicId`), „Fiszki” (`/topics/:topicId/flashcards`),
    - opcjonalnie: usuwanie tematu (z wyjątkiem systemowego).
  - **UX/A11y/Bezpieczeństwo**:
    - `404` (kolekcja nie istnieje / nie należy do usera) → redirect do `/collections` + toast,
    - blokada usuwania tematu systemowego (API `403`).

- **Temat (edycja opisu)**
  - **Ścieżka**: `/topics/:topicId`
  - **Główny cel**: edycja opisu tematu (lista zagadnień), który wpływa na generacje AI.
  - **Kluczowe informacje**:
    - nazwa tematu (read-only),
    - pole opisu (może być puste) + wskazówka wpływu na jakość AI,
    - stany: saving/saved/error.
  - **Kluczowe komponenty**:
    - edytor opisu + przycisk „Zapisz”,
    - banner/inline hint o wpływie pustego opisu.
  - **UX/A11y/Bezpieczeństwo**:
    - zapis manualny (bez autosave), czytelna informacja o statusie,
    - `404` → redirect do `/collections` + toast.

- **Fiszki w temacie (lista + akcje)**
  - **Ścieżka**: `/topics/:topicId/flashcards`
  - **Główny cel**: przeglądanie, wyszukiwanie i filtrowanie fiszek; tworzenie manualne; edycja/usuwanie; generowanie AI z podglądem w modalu.
  - **Kluczowe informacje**:
    - lista fiszek (front + skrót back),
    - wyszukiwarka `q` (front/back, strict),
    - filtry: `is_favorite`, `source`,
    - oznaczenie: źródło (manual/AI), `edited_by_user`.
  - **Kluczowe komponenty**:
    - toolbar: search + filtry (w URL),
    - formularz „Dodaj fiszkę” (manual),
    - karta fiszki z akcjami: favorite toggle, edit, delete,
    - modal/drawer edycji fiszki (walidacja 200/600, source read-only),
    - **AI Generate**: przycisk „Generuj AI” → modal podglądu propozycji,
    - modal AI: front/back, akcje Zapisz/Odrzuć, ewentualnie „Zamknij” (skip).
  - **UX/A11y/Bezpieczeństwo**:
    - blokada przycisku generowania podczas requestu (redukcja podwójnych kliknięć),
    - błędy AI:
      - `429`: komunikat o limicie + informacja o resecie 00:00 UTC,
      - `502`: „Błąd dostawcy AI, spróbuj ponownie”,
    - po Zapisz/Odrzuć: zamknięcie modalu i powrót do listy (bez auto-generowania kolejnej),
    - `404` (temat nie istnieje) → redirect do `/collections` + toast.

- **Ulubione (przegląd)**
  - **Ścieżka**: `/favorites`
  - **Główny cel**: szybki dostęp do ulubionych oraz nawigacja do miejsca ich pochodzenia.
  - **Kluczowe informacje**:
    - widok przeglądowy ulubionych w ramach struktury Kolekcja→Temat (zgodnie z API),
    - możliwość filtrowania „w obrębie tematu” bez dodatkowych endpointów.
  - **Kluczowe komponenty**:
    - selektor kontekstu: Kolekcja → Temat (lista kolekcji i tematów),
    - lista ulubionych w wybranym temacie (z `is_favorite=true`),
    - akcje na fiszkach: odpięcie ulubionej, edycja, usunięcie.
  - **UX/A11y/Bezpieczeństwo**:
    - jasno komunikowane ograniczenie: pełna „globalna lista ulubionych” nie jest eksplicytnie dostępna w API; UI prowadzi przez wybór kontekstu,
    - `404` dla kontekstu → bezpieczny reset selekcji + toast.

- **User profile (konto + admin metryki)**
  - **Ścieżka**: `/user`
  - **Główny cel**: profil użytkownika (e-mail), akcje konta (zmiana hasła, wylogowanie) oraz sekcja metryk dla admina.
  - **Kluczowe informacje**:
    - e-mail (z sesji/auth),
    - zmiana hasła (Supabase),
    - jeśli `is_admin`: metryki podsumowania i dzienne.
  - **Kluczowe komponenty**:
    - panel danych konta,
    - formularz zmiany hasła,
    - sekcja admin (warunkowa): KPI accept_rate, ai_share + tabela/wykres dzienny (zakres dat).
  - **UX/A11y/Bezpieczeństwo**:
    - sekcja admin renderowana tylko gdy `is_admin=true`; dla `403` pokazujemy komunikat i ukrywamy dane,
    - `401` → redirect do `/login`.

## 5. Mapa podróży użytkownika

### 5.1 Główny przypadek użycia (AI: wygeneruj → podejmij decyzję → zapisz w temacie)

1. **Rejestracja/Logowanie** (`/signup` lub `/login`)
2. **Dashboard** (`/dashboard`)
   - szybki wybór kolekcji lub przejście do pełnej listy (`/collections`)
3. **Kolekcje** (`/collections`)
   - utworzenie kolekcji (opcjonalnie)
   - wejście do tematów: `/collections/:collectionId/topics`
4. **Tematy w kolekcji** (`/collections/:collectionId/topics`)
   - utworzenie tematu (opcjonalnie)
   - wejście do opisu tematu: `/topics/:topicId`
5. **Temat (opis)** (`/topics/:topicId`)
   - uzupełnienie opisu (manualny zapis)
   - przejście do fiszek: `/topics/:topicId/flashcards`
6. **Fiszki w temacie** (`/topics/:topicId/flashcards`)
   - klik „Generuj AI” → modal propozycji (blokada akcji w trakcie requestu)
7. **Modal AI (podgląd)**:
   - **Zapisz** → `POST /api/v1/ai/accept` → powrót do listy (invalidate fiszek) + toast
   - **Odrzuć** → `POST /api/v1/ai/reject` → powrót do listy + toast
   - **Zamknij bez akcji** → opcjonalnie `POST /api/v1/ai/skip` → powrót do listy
8. **Oznacz jako ulubione** (toggle na karcie fiszki) → `PATCH /api/v1/flashcards/{id}`
9. **Powrót na Dashboard** → losowe ulubione mogą zawierać nową fiszkę

### 5.2 Manualne dodawanie fiszki

1. `/topics/:topicId/flashcards` → „Dodaj fiszkę” → `POST /api/v1/topics/{topicId}/flashcards`
2. Walidacja 200/600; błędy `400` inline; po sukcesie odświeżenie listy.

### 5.3 Przypadek admina (metryki)

1. `/user` → sekcja admin (jeśli `is_admin=true`)
2. `GET /api/v1/admin/metrics/summary` + `GET /api/v1/admin/metrics/daily`

## 6. Układ i struktura nawigacji

- **Globalny Navbar** (zawsze w widokach chronionych):
  - **Lewy obszar**: linki: `Dashboard` → `/dashboard`, `Kolekcje` → `/collections`, `Ulubione` → `/favorites`
  - **Prawy obszar**:
    - **Pozostałe generacje** + tooltip z `reset_at_utc` (00:00 UTC)
    - **Avatar** → dropdown: `User profile` → `/user`, `Log out` → akcja wylogowania i redirect `/login`
- **Dashboard** ma dodatkowy **sidebar** (lokalna nawigacja mini-listą kolekcji) oraz CTA „Wszystkie kolekcje”.
- **Nawigacja hierarchiczna**:
  - z `/collections` → `/collections/:collectionId/topics`
  - z listy tematów → `/topics/:topicId` (opis) oraz `/topics/:topicId/flashcards` (fiszki)
- **Zachowanie na błędach zasobów**:
  - `404` w widokach zasobów → redirect do `/collections` + toast/komunikat (zgodnie z notatkami).

## 7. Kluczowe komponenty (współdzielone)

- **SessionGuard / RouteGuard**: blokada tras chronionych, obsługa `401`.
- **AppShell**:
  - `DashboardLayout` (navbar + dashboard sidebar)
  - `AppLayout` (navbar + content)
- **Navbar**: linki + licznik limitu + avatar menu.
- **SearchInput (strict)**: spójny wzorzec dla `q` na listach.
- **FilterChips/Select**: `is_favorite`, `source` (w URL tam, gdzie ma sens).
- **ResourceListState**: stany list: loading/empty/error + retry.
- **ConfirmDialog (destructive)**: usuwanie kolekcji/tematu/fiszki, z ostrzeżeniem o nieodwracalności i kaskadzie.
- **FlashcardCard**: prezentacja front/back + badge źródła + `edited_by_user`.
- **FlashcardEditor (Modal/Drawer)**: edycja, walidacja 200/600, source read-only.
- **AIGenerateModal**: preview propozycji + akcje Zapisz/Odrzuć/Zamknij (skip).
- **Toast/Notifications**: spójne komunikaty sukcesu/błędu (delete/save/AI).

## 8. Stany brzegowe i błędy (UX + zgodność z API)

- **`401` unauthenticated**:
  - automatyczny redirect do `/login`,
  - czyszczenie klientowego stanu sesji i cache.
- **`403` forbidden**:
  - próba usunięcia systemowej kolekcji/tematu: UI blokuje akcję (i obsługuje ewentualne `403`),
  - próba wejścia w dane admin-only bez uprawnień: komunikat „Brak dostępu” i redirect do `/dashboard` (lub ukrycie sekcji).
- **`404` not found (zasób nie istnieje / nie należy do usera)**:
  - redirect do `/collections` + toast (zgodnie z notatkami).
- **`409` conflict**:
  - nazwy kolekcji/tematu unikalne: błąd inline w formularzu.
- **AI: `429` limit reached**:
  - komunikat o wykorzystaniu limitu + informacja o resecie 00:00 UTC,
  - przycisk generowania disabled do czasu resetu (lub do kolejnego odświeżenia limitu).
- **AI: `502` provider error**:
  - komunikat i możliwość ponowienia.
- **Wyszukiwanie strict**:
  - UI komunikuje „Wyszukiwanie jest dokładne (bez normalizacji znaków)”, aby uniknąć frustracji.
- **Równoległe kliknięcia generowania**:
  - UI blokuje akcję podczas requestu; opcjonalnie debounce/lock per temat.
- **Limit „Pozostałe generacje” w navbarze**:
  - gdy wartość nieznana: skeleton/ghost loader,
  - rekomendacja kontraktowa: UI opiera się o ostatnio znaną wartość z `POST /ai/generate` i odświeża po udanych akcjach AI (accept/reject/skip) lub po wejściu w widoki.

## 9. Mapowanie historyjek użytkownika (PRD) do architektury UI

- **US-001 Rejestracja konta** → `/signup` (formularz + walidacja + obsługa błędów `400/409`)
- **US-002 Logowanie** → `/login` (formularz + obsługa `401`)
- **US-003 Wylogowanie** → navbar avatar dropdown → „Log out” (akcja + redirect)
- **US-004 Dostęp do panelu admina** → `/user` (sekcja admin warunkowa + obsługa `403`/ukrywanie)
- **US-005 Utworzenie kolekcji** → `/collections` (create) + dashboard sidebar (inline add)
- **US-006 Przeglądanie listy kolekcji** → `/collections` + dashboard sidebar (mini lista)
- **US-007 Wyszukiwanie kolekcji** → `/collections` (search `q`)
- **US-008 Utworzenie tematu** → `/collections/:collectionId/topics` (create)
- **US-009 Uzupełnienie opisu tematu** → `/topics/:topicId` (opis + hint)
- **US-010 Edycja opisu tematu** → `/topics/:topicId` (manualny zapis + saving/saved/error)
- **US-011 Brak zmiany nazwy tematu/kolekcji** → brak UI do rename; nazwy read-only we wszystkich widokach
- **US-012 Przeglądanie listy tematów** → `/collections/:collectionId/topics`
- **US-013 Wyszukiwanie tematów** → `/collections/:collectionId/topics` (search `q`)
- **US-014 Manualne dodanie fiszki** → `/topics/:topicId/flashcards` (create manual)
- **US-015 Walidacja długości 200/600** → create/edit fiszki (inline validation + blokada zapisu)
- **US-016 Przeglądanie listy fiszek** → `/topics/:topicId/flashcards`
- **US-017 Wyszukiwanie fiszek** → `/topics/:topicId/flashcards` (search `q`)
- **US-018 Filtrowanie ulubionych w temacie** → `/topics/:topicId/flashcards?is_favorite=true` + `/favorites` (w kontekście tematu)
- **US-019 Filtrowanie po źródle** → `/topics/:topicId/flashcards?source=...`
- **US-020 Oznaczenie jako ulubiona** → toggle na karcie fiszki (PATCH)
- **US-021 Dashboard: losowe ulubione globalnie** → `/dashboard` (grid 6) + modal szczegółów
- **US-022 Generowanie AI w temacie** → `/topics/:topicId/flashcards` + modal AI (preview)
- **US-023 Zapisz wygenerowaną fiszkę** → modal AI: „Zapisz” + odświeżenie listy
- **US-024 Odrzuć wygenerowaną fiszkę** → modal AI: „Odrzuć”
- **US-025 Pominięcie propozycji** → zamknięcie modalu (opcjonalnie `POST /ai/skip`)
- **US-026 Egzekwowanie limitu** → navbar licznik + modal AI komunikaty `429` + disabled generowania
- **US-027 Reset limitu o 00:00 UTC** → tooltip z `reset_at_utc` + odblokowanie po odświeżeniu
- **US-028 Generowanie w Temacie losowym** → tematy systemowe dostępne w listach; generowanie identyczne jak w zwykłym temacie
- **US-030 Ochrona systemowych zasobów** → badge + brak akcji usuwania + obsługa `403`
- **US-031 Edycja fiszki** → modal/drawer edycji (source read-only, `edited_by_user` widoczne)
- **US-032 Usunięcie fiszki** → akcja delete + confirm dialog (hard delete)
- **US-033 Usunięcie tematu + kaskada** → `/collections/:collectionId/topics` (delete + confirm + ostrzeżenie)
- **US-034 Usunięcie kolekcji + kaskada** → `/collections` (delete + confirm + ostrzeżenie)
- **US-035 Izolacja danych** → guard sesji + obsługa `404/401` + brak wycieku danych w UI
- **US-036 Panel admina: accept rate** → `/user` (sekcja admin: accept_rate, accepted/rejected)
- **US-037 Panel admina: udział AI vs manual** → `/user` (sekcja admin: ai_share, auto_generated/manually_created)
- **US-038 Błędy generowania AI** → modal AI: obsługa `502` + retry, brak tworzenia fiszki

## 10. Wyraźne mapowanie wymagań na elementy UI (skrót)

- **Stały licznik limitu AI** → komponent w navbarze + tooltip resetu + skeleton przy braku danych.
- **Kolekcja/Temat losowy** → badge w listach + pinned w dashboard sidebar + blokada usuwania.
- **Strict search** → spójne SearchInput na listach + komunikat „strict”.
- **Hard delete + kaskada** → ConfirmDialog z ostrzeżeniami + redirect po `404` lub po usunięciu.
- **AI preview i decyzje** → AIGenerateModal z akcjami Zapisz/Odrzuć/Zamknij + jasne stany `429/502`.
- **Metryki admina** → sekcja na `/user` widoczna tylko dla `is_admin`.

