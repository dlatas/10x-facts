## API Endpoint Implementation Plan: Flashcards (`/api/v1/topics/{topicId}/flashcards` + `/api/v1/flashcards/{flashcardId}` + `/api/v1/flashcards/favorites/random`)

## 1. Przegląd punktu końcowego

Celem jest wdrożenie zestawu endpointów do zarządzania fiszkami (flashcards) użytkownika:

- **GET** `/api/v1/topics/{topicId}/flashcards` — lista fiszek w temacie z filtrowaniem i paginacją.
- **POST** `/api/v1/topics/{topicId}/flashcards` — utworzenie fiszki manualnej w temacie.
- **PATCH** `/api/v1/flashcards/{flashcardId}` — aktualizacja `front`, `back` i/lub przełączenie `is_favorite` (bez możliwości zmiany `source`).
- **DELETE** `/api/v1/flashcards/{flashcardId}` — twarde usunięcie fiszki.
- **GET** `/api/v1/flashcards/favorites/random` — losowe ulubione fiszki użytkownika (dashboard).

Wymagania technologiczne i projektowe (spójnie z repo):

- Astro 5 Server Endpoints w `src/pages/api/v1/...`
- Supabase Auth (Bearer JWT lub sesja) — helper `requireUserId` w `src/lib/http/api.ts`
- Walidacja wejścia przez Zod (schemy w `src/lib/validation`)
- Logika biznesowa i zapytania DB w service (`src/lib/services`)
- Spójny format błędów: `jsonError(status, message, extra?)`
- Supabase client w endpointach wyłącznie z `context.locals.supabase` (bez importu klienta globalnego)

Założenia z DB (migracje):

- Tabela `public.flashcards`: `front` ≤ 200, `back` ≤ 600, `source` ∈ {`manually_created`,`auto_generated`}, `is_favorite` default false, `edited_by_user` default false.
- Trigger `flashcards_before_update()`:
  - blokuje zmianę `source` (rzuca wyjątek w DB),
  - automatycznie ustawia `edited_by_user = true`, gdy zmienia się `front` lub `back` (i utrzymuje true).
- Uwaga bezpieczeństwa: w repo istnieje migracja wyłączająca RLS na tabelach core (`disable row level security`). Endpointy **muszą** jawnie wymuszać własność danych przez `user_id` (patrz sekcja Bezpieczeństwo).

## 2. Szczegóły żądania

### 2.1 Wspólne wymagania (dla wszystkich endpointów)

- **Auth**: wymagany `Authorization: Bearer <access_token>` lub aktywna sesja (obsługuje `requireUserId(context)`).
- **Content-Type**: `application/json` dla metod z body.
- **Dostęp do DB**: `const supabase = context.locals.supabase`.
- **Walidacja**: params/query/body przez Zod; w razie błędu zwracać `400` + `issues`.

### 2.2 GET `/api/v1/topics/{topicId}/flashcards`

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/topics/{topicId}/flashcards`
- **Parametry ścieżki (wymagane)**:
  - `topicId: uuid`
- **Query params (opcjonalne)** — zgodnie ze specyfikacją:
  - `q?: string` — wyszukiwanie po `front` lub `back` (ilike); trim; pusty string → traktować jak brak.
  - `is_favorite?: "true" | "false"` — filtr po ulubionych.
  - `source?: "manually_created" | "auto_generated"` — filtr po źródle.
  - `limit?: number` — paginacja (rekomendacja: default 50, max 100).
  - `offset?: number` — paginacja (default 0).
  - `sort?: keyof FlashcardDto` — pole sortowania (whitelist).
  - `order?: "asc" | "desc"` — kierunek sortowania (default `desc`).
- **Body**: brak.

Wymóg funkcjonalny:

- Zwrócić fiszki wyłącznie z danego `topicId`, ale tylko dla zalogowanego użytkownika.
- Jeśli temat nie istnieje dla użytkownika → `404` (zgodnie ze specyfikacją).

### 2.3 POST `/api/v1/topics/{topicId}/flashcards`

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/topics/{topicId}/flashcards`
- **Parametry ścieżki (wymagane)**:
  - `topicId: uuid`
- **Body (JSON)**:
  - **Wymagane**:
    - `front: string` (trim, niepuste, max 200)
    - `back: string` (trim, niepuste, max 600)
- **Query params**: brak.

Walidacja biznesowa:

- `source` nie jest akceptowane w body (ustawiane serwerowo jako `manually_created`).
- `is_favorite`, `edited_by_user`, `user_id`, `topic_id` nie są akceptowane w body (ochrona przed mass assignment).
- Jeśli temat nie istnieje dla użytkownika → `404`.

### 2.4 PATCH `/api/v1/flashcards/{flashcardId}`

- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/v1/flashcards/{flashcardId}`
- **Parametry ścieżki (wymagane)**:
  - `flashcardId: uuid`
- **Body (JSON)**:
  - `front?: string` (trim, niepuste, max 200)
  - `back?: string` (trim, niepuste, max 600)
  - `is_favorite?: boolean`

Walidacja biznesowa:

- Body musi zawierać przynajmniej jedno z pól: `front | back | is_favorite` (inaczej `400`).
- `source` jest zabronione w body:
  - jeśli body zawiera `source` → `403` (zgodnie ze specyfikacją),
  - dodatkowo DB trigger i tak zablokuje aktualizację `source`; wyjątek z DB mapować na `403` dla spójności.
- Jeśli fiszka nie istnieje dla użytkownika → `404`.
- `edited_by_user` jest utrzymywane przez DB trigger (nie ustawiamy ręcznie; opcjonalnie w kodzie można explicite nie dotykać tego pola).

### 2.5 DELETE `/api/v1/flashcards/{flashcardId}`

- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/v1/flashcards/{flashcardId}`
- **Parametry ścieżki (wymagane)**:
  - `flashcardId: uuid`
- **Body**: brak.

Wymóg funkcjonalny:

- Usunąć fiszkę należącą do użytkownika; brak fiszki → `404`.

### 2.6 GET `/api/v1/flashcards/favorites/random`

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/flashcards/favorites/random`
- **Query params (opcjonalne)**:
  - `limit?: number` — default 5, max 20 (zgodnie ze specyfikacją).
- **Body**: brak.

Wymóg funkcjonalny:

- Zwrócić losową próbkę ulubionych fiszek użytkownika (nie per temat, tylko globalnie).

## 3. Szczegóły odpowiedzi

### 3.1 Wykorzystywane typy (DTO i Command modele)

Źródło: `src/types/flashcards.ts` + `src/types/common.ts`.

- **GET** `/topics/{topicId}/flashcards`:
  - `FlashcardsListQuery`
  - `FlashcardsListResponseDto = ListResponse<FlashcardDto>`
  - `FlashcardDto` = `Pick<Flashcard, 'id'|'front'|'back'|'source'|'is_favorite'|'edited_by_user'|'created_at'|'updated_at'>`
- **POST** `/topics/{topicId}/flashcards`:
  - `CreateFlashcardCommand` (front, back)
  - `CreateFlashcardResponseDto = FlashcardDto`
- **PATCH** `/flashcards/{flashcardId}`:
  - `UpdateFlashcardCommand` (front?, back?, is_favorite?)
  - `UpdateFlashcardResponseDto = FlashcardDto`
- **DELETE** `/flashcards/{flashcardId}`:
  - `DeleteFlashcardResponseDto = OkResponse`
- **GET** `/flashcards/favorites/random`:
  - `FavoritesRandomQuery`
  - `FavoritesRandomResponseDto` z `items: FavoriteFlashcardDto[]`
  - `FavoriteFlashcardDto` = `Pick<Flashcard, 'id'|'front'|'back'|'topic_id'>`

### 3.2 Struktury odpowiedzi i statusy

#### GET `/api/v1/topics/{topicId}/flashcards`

- **200**:
  - `{ "items": FlashcardDto[], "total": number }`
- **401**: brak auth / nieprawidłowy token
- **404**: temat nie istnieje dla użytkownika
- **500**: błąd serwera / błąd Supabase

#### POST `/api/v1/topics/{topicId}/flashcards`

- **201**:
  - `FlashcardDto`
- **400**: body nie przechodzi walidacji
- **401**: brak auth / nieprawidłowy token
- **404**: temat nie istnieje dla użytkownika
- **500**: błąd serwera / błąd Supabase

#### PATCH `/api/v1/flashcards/{flashcardId}`

- **200**:
  - `FlashcardDto`
- **400**: body nie przechodzi walidacji / puste body
- **401**: brak auth / nieprawidłowy token
- **403**: próba zmiany `source` (wprost w body lub wykryta przez DB trigger)
- **404**: fiszka nie istnieje dla użytkownika
- **500**: błąd serwera / błąd Supabase

#### DELETE `/api/v1/flashcards/{flashcardId}`

- **200**:
  - `{ "ok": true }`
- **401**: brak auth / nieprawidłowy token
- **404**: fiszka nie istnieje dla użytkownika
- **500**: błąd serwera / błąd Supabase

#### GET `/api/v1/flashcards/favorites/random`

- **200**:
  - `{ "items": FavoriteFlashcardDto[] }`
- **400**: limit nie przechodzi walidacji
- **401**: brak auth / nieprawidłowy token
- **500**: błąd serwera / błąd Supabase

Uwaga: Błędy zwracamy spójnie przez `jsonError(status, message, extra?)`, np.:

- `{ "error": { "message": "..." } }`
- dla walidacji: `{ "error": { "message": "...", "issues": [...] } }`

## 4. Przepływ danych

### 4.1 Warstwy i pliki

- **Routes (Astro endpoints)**:
  - `src/pages/api/v1/topics/[topicId]/flashcards.ts`
    - `GET` — listowanie fiszek w temacie
    - `POST` — tworzenie fiszki manualnej
  - `src/pages/api/v1/flashcards/[flashcardId].ts`
    - `PATCH` — aktualizacja fiszki
    - `DELETE` — usunięcie fiszki
  - `src/pages/api/v1/flashcards/favorites/random.ts`
    - `GET` — losowe ulubione

- **Validation (Zod)**:
  - `src/lib/validation/flashcards.schemas.ts` (nowy plik)
    - param schema: `topicIdParamSchema`, `flashcardIdParamSchema` (uuid)
    - query schema: `flashcardsListQuerySchema`, `favoritesRandomQuerySchema`
    - body schema: `createFlashcardCommandSchema`, `updateFlashcardCommandSchema` (z wymogiem „min. 1 pole”)
    - reguła 403: wykrywanie `source` w PATCH body (dodatkowo do Zod)

- **Service (logika biznesowa, Supabase queries)**:
  - `src/lib/services/flashcards.service.ts` (nowy plik)
    - `assertTopicExistsForUser(...)` / `getTopicOrThrowNotFound(...)`
    - `listFlashcardsInTopic(...)`
    - `createManualFlashcard(...)`
    - `updateFlashcard(...)`
    - `deleteFlashcard(...)`
    - `getRandomFavoriteFlashcards(...)`

### 4.2 Sekwencje (happy path)

#### GET `/topics/{topicId}/flashcards`

1. Auth: `requireUserId(context)` → `userId` (brak → 401).
2. Walidacja `topicId` (uuid).
3. Sprawdzenie istnienia tematu w kontekście użytkownika:
   - `topics.select('id').eq('id', topicId).eq('user_id', userId).maybeSingle()`
   - brak → 404.
4. Parse + walidacja query (`URLSearchParams` → obiekt → Zod parse z defaultami).
5. `listFlashcardsInTopic`:
   - `from('flashcards')`
   - `.select('id,front,back,source,is_favorite,edited_by_user,created_at,updated_at', { count: 'exact' })`
   - filtry: `.eq('topic_id', topicId).eq('user_id', userId)`
   - opcjonalnie:
     - `is_favorite`: `.eq('is_favorite', true/false)`
     - `source`: `.eq('source', source)`
     - `q`: `.or('front.ilike.%...%,back.ilike.%...%')` (z poprawnym escapowaniem `%` w stringu)
   - sort: `.order(sort, { ascending: order === 'asc' })` (sort whitelisted)
   - paginacja: `.range(offset, offset + limit - 1)`
6. Zwrócić `200` z `{ items, total }`.

#### POST `/topics/{topicId}/flashcards`

1. Auth: `requireUserId`.
2. Walidacja `topicId`.
3. Sprawdzenie istnienia tematu użytkownika → brak = 404.
4. `readJsonBody(context)` + Zod parse body.
5. `createManualFlashcard`:
   - `insert` do `flashcards` z:
     - `user_id = userId`
     - `topic_id = topicId`
     - `front`, `back`
     - `source = 'manually_created'`
     - `is_favorite` pominięte (default false)
     - `edited_by_user` pominięte (default false)
   - `.select(...dto fields...).single()`
6. Zwrócić `201` z `FlashcardDto`.

#### PATCH `/flashcards/{flashcardId}`

1. Auth: `requireUserId`.
2. Walidacja `flashcardId`.
3. `readJsonBody(context)`:
   - jeśli body ma klucz `source` (niezależnie od wartości) → `403`.
4. Zod parse body (`front?`, `back?`, `is_favorite?`) + wymóg „min 1 pole”.
5. Sprawdzenie istnienia fiszki użytkownika:
   - `flashcards.select('id').eq('id', flashcardId).eq('user_id', userId).maybeSingle()` → brak = 404.
6. Aktualizacja:
   - `update({...fieldsProvided})`
   - `.eq('id', flashcardId).eq('user_id', userId)`
   - `.select(dto fields).single()`
7. Jeśli DB zwróci błąd „flashcard source is immutable” (trigger) → mapować na `403`.
8. Zwrócić `200` z `FlashcardDto`.

#### DELETE `/flashcards/{flashcardId}`

1. Auth: `requireUserId`.
2. Walidacja `flashcardId`.
3. Sprawdzenie istnienia fiszki użytkownika → brak = 404.
4. `delete().eq('id', flashcardId).eq('user_id', userId)`.
5. Zwrócić `200` z `{ ok: true }`.

#### GET `/flashcards/favorites/random`

1. Auth: `requireUserId`.
2. Parse + walidacja query (`limit` default 5, max 20).
3. `getRandomFavoriteFlashcards`:
   - wariant MVP (bez migracji): pobrać np. do \(min(limit, 20)\) rekordów + prosty losowy wybór z większej próbki (patrz sekcja Wydajność),
   - wariant rekomendowany: RPC/SQL (patrz sekcja Wydajność).
4. Zwrócić `200` z `{ items }`.

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie**: zawsze `requireUserId(context)` na starcie handlera.
- **Autoryzacja / własność danych**:
  - Ze względu na migrację wyłączającą RLS, endpointy muszą traktować RLS jako niewystępujące.
  - Każde zapytanie do `collections/topics/flashcards` musi zawierać filtr `.eq('user_id', userId)`.
  - Dla endpointów zależnych od `topicId` wymagane jest osobne potwierdzenie istnienia tematu dla usera (żeby poprawnie zwrócić `404`, a nie „pustą listę”).
- **Ochrona przed mass assignment**:
  - `POST`: nigdy nie przyjmować `user_id`, `topic_id`, `source`, `edited_by_user`, `created_at`, `updated_at`.
  - `PATCH`: dopuszczać tylko `front`, `back`, `is_favorite`; `source` → 403.
- **Walidacja wejścia**:
  - `limit/offset` z capami (ochrona przed DoS przez duże zakresy).
  - `sort` tylko z whitelisty pól DTO (brak dowolnych kolumn).
  - `q` trim; długość `q` ograniczyć (np. max 200) żeby nie generować ciężkich zapytań.
- **Nieujawnianie informacji**:
  - przy 404 zwracać komunikaty neutralne (bez ujawniania, czy zasób istnieje u innego usera),
  - przy 500 nie zwracać szczegółów błędu Supabase/SQL (tylko logować serwerowo).

## 6. Obsługa błędów

### 6.1 Scenariusze błędów i kody

- **400**:
  - `topicId/flashcardId` nie jest uuid,
  - query `limit/offset/is_favorite/source/sort/order` nie przechodzi walidacji,
  - `POST`: nieprawidłowy JSON lub `front/back` puste / za długie,
  - `PATCH`: nieprawidłowy JSON, puste body, `front/back` puste / za długie.
- **401**:
  - brak sesji lub brak/nieprawidłowy token.
- **403**:
  - `PATCH` zawiera `source` (próba zmiany),
  - `PATCH` wywołuje DB trigger „flashcard source is immutable”.
- **404**:
  - `GET/POST` list/create: temat nie istnieje dla usera,
  - `PATCH/DELETE`: fiszka nie istnieje dla usera.
- **500**:
  - nieoczekiwany błąd serwera / błąd Supabase (poza kontrolowanym 403).

### 6.2 Mapowanie błędów Supabase/DB → HTTP

Rekomendacja:

- Walidacja Zod → `400` + `issues`.
- „Not found” (brak rekordu po `.maybeSingle()`) → `404`.
- Trigger `flashcards_before_update`:
  - błąd z komunikatem zawierającym np. `flashcard source is immutable` → `403`.
- Pozostałe błędy DB → `500` (logować po stronie serwera).

### 6.3 Rejestrowanie błędów w tabeli błędów

W dostarczonych zasobach DB **brak dedykowanej tabeli do logowania błędów** dla flashcards. W MVP:

- logować serwerowo (np. `console.error`) metadane: route, userId, topicId/flashcardId, supabaseError.code, message.

## 7. Wydajność

- **Listowanie**:
  - zawsze paginacja `.range(offset, offset + limit - 1)`,
  - `limit` capped (np. max 100),
  - `q` ograniczyć długością, bo `or + ilike` może być kosztowne.
- **Indeksy (DB)**:
  - migracja już dodaje m.in. `flashcards_topic_created_at_desc_idx`, `flashcards_topic_source_idx`, indeksy na ulubionych — endpointy powinny korzystać z tych filtrów (`topic_id`, `source`, `is_favorite`).
- **Losowe ulubione (`favorites/random`)**:
  - `ORDER BY random()` w Postgres jest kosztowne przy dużych tabelach; do MVP może wystarczyć, ale warto mieć plan skalowania.
  - Rekomendowany wariant (najprostszy i zgodny z „random”):
    - dodać funkcję SQL `public.get_random_favorite_flashcards(p_limit int)` filtrującą po `auth.uid()` i `is_favorite = true`, robiącą `order by random() limit p_limit`.
    - wywoływać ją przez `supabase.rpc(...)` w service.
  - Wariant MVP bez migracji (słabsza losowość, ale bez zmian DB):
    - pobrać np. ostatnie N ulubionych (N = min(200, limit \* 20)) po `updated_at desc`,
    - wylosować `limit` elementów w pamięci (Fisher–Yates/shuffle) i zwrócić.

## 8. Kroki implementacji

1. **Dodać schemy walidacji Zod** (`src/lib/validation/flashcards.schemas.ts`):
   - `topicIdParamSchema`, `flashcardIdParamSchema` (uuid),
   - `flashcardsListQuerySchema`:
     - `q` (trim → undefined), `is_favorite` (string → boolean), `source` enum, `limit/offset`, `sort/order` (whitelist),
   - `favoritesRandomQuerySchema` (`limit` default 5, max 20),
   - `createFlashcardCommandSchema` (`front` max 200, `back` max 600; trim + not blank),
   - `updateFlashcardCommandSchema`:
     - `front?`, `back?`, `is_favorite?`,
     - wymóg: przynajmniej jedno pole (np. `.refine(...)`).
2. **Dodać service warstwę** (`src/lib/services/flashcards.service.ts`):
   - zdefiniować stałe pól select (DTO fields),
   - zdefiniować `FlashcardsServiceError` z `kind: 'topic_not_found' | 'flashcard_not_found' | 'forbidden_source_change'`,
   - zaimplementować funkcje:
     - `getTopicOrThrowNotFound({ supabase, userId, topicId })`,
     - `listFlashcardsInTopic({...})`,
     - `createManualFlashcard({...})`,
     - `updateFlashcard({...})` (update tylko po `user_id`),
     - `deleteFlashcard({...})`,
     - `getRandomFavoriteFlashcards({...})` (wariant MVP i/lub RPC).
3. **Zaimplementować routes (Astro endpoints)**:
   - `src/pages/api/v1/topics/[topicId]/flashcards.ts`:
     - `export const prerender = false`,
     - `GET`: auth → param → topic exists → query parse/validate → service list → `200`,
     - `POST`: auth → param → topic exists → body parse/validate → service create → `201`.
   - `src/pages/api/v1/flashcards/[flashcardId].ts`:
     - `export const prerender = false`,
     - `PATCH`: auth → param → body parse (wykryj `source` → 403) → validate → exists → update → map trigger error → `200`,
     - `DELETE`: auth → param → exists → delete → `200`.
   - `src/pages/api/v1/flashcards/favorites/random.ts`:
     - `export const prerender = false`,
     - `GET`: auth → query validate → service random favorites → `200`.
4. **Ujednolicić kontrakty odpowiedzi**:
   - Sukces: `json(dto, { status })`,
   - Błędy: `jsonError(status, message, { issues })` dla walidacji.
5. **Spiąć z istniejącym klientem dashboard**:
   - endpoint `/api/v1/flashcards/favorites/random` jest już konsumowany przez `src/lib/services/dashboard-service.ts` — upewnić się, że middleware przekazuje Bearer token do `context.locals.supabase`.
6. **Opcjonalnie (rekomendowane) dodać RPC dla losowych ulubionych**:
   - dodać migrację z funkcją `get_random_favorite_flashcards(p_limit int)` i grantem execute dla `authenticated`,
   - w service używać `supabase.rpc(...)` zamiast losowania w pamięci.
