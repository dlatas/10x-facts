# API Endpoint Implementation Plan: Collections (`/api/v1/collections`)

## 1. Przegląd punktu końcowego
Celem jest wdrożenie zestawu endpointów do zarządzania kolekcjami użytkownika:
- **GET** `/api/v1/collections` — lista kolekcji użytkownika (w tym systemowej kolekcji „random”).
- **POST** `/api/v1/collections` — utworzenie kolekcji.
- **DELETE** `/api/v1/collections/{collectionId}` — twarde usunięcie kolekcji (kaskadowo usuwa tematy i fiszki).

Endpointy są implementowane w Astro 5 jako Server Endpoints (`src/pages/api/v1/...`), z:
- autoryzacją Bearer JWT (Supabase Auth),
- RLS w Postgres jako podstawowy mechanizm autoryzacji zasobów,
- walidacją wejścia przez Zod,
- spójnym formatem błędów (`jsonError`).

## 2. Szczegóły żądania

### 2.1 GET `/api/v1/collections`
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/collections`
- **Auth**: wymagany nagłówek `Authorization: Bearer <access_token>`
- **Query params** (opcjonalne):
  - **`q`**: `string` — wyszukiwanie po nazwie (np. `ilike %q%`), trim, może być puste → traktować jak brak filtra.
  - **`limit`**: `number` — limit paginacji (np. domyślnie 50, max 100).
  - **`offset`**: `number` — offset paginacji (domyślnie 0).
  - **`sort`**: `keyof CollectionDto` — pole sortowania, dozwolone: `id | name | system_key | created_at | updated_at` (zalecane default: `created_at`).
  - **`order`**: `asc | desc` — kierunek sortowania (default: `desc`).
- **Body**: brak

Wymóg funkcjonalny:
- Lista **musi zawierać systemową kolekcję random** (per użytkownik). Jeśli nie istnieje, należy ją utworzyć „po cichu” w ramach requestu listującego (best-effort).

### 2.2 POST `/api/v1/collections`
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/collections`
- **Auth**: wymagany `Authorization: Bearer <access_token>`
- **Body (JSON)**:
  - **Wymagane**:
    - **`name`**: `string` — nazwa kolekcji
  - **Walidacja**:
    - trim, `min(1)`, `max(120)` (zgodnie z ograniczeniami DB)
    - odrzucenie wartości whitespace-only
- **Query params**: brak

### 2.3 DELETE `/api/v1/collections/{collectionId}`
- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/v1/collections/{collectionId}`
- **Auth**: wymagany `Authorization: Bearer <access_token>`
- **Parametry ścieżki**:
  - **Wymagane**:
    - **`collectionId`**: `uuid`
- **Body**: brak

Wymóg funkcjonalny:
- Nie wolno usuwać **systemowej** kolekcji (np. `system_key === "random_collection"`). Próba usunięcia → **403**.

## 3. Szczegóły odpowiedzi

### 3.1 Używane typy (DTO i Command)
Zgodnie z `src/types.ts`:
- **GET**:
  - `CollectionsListQuery`
  - `CollectionsListResponseDto` = `ListResponse<CollectionDto>`
  - `CollectionDto` = `Pick<Collection, "id" | "name" | "system_key" | "created_at" | "updated_at">`
- **POST**:
  - `CreateCollectionCommand` = `Pick<TablesInsert<"collections">, "name">`
  - `CreateCollectionResponseDto` = `CollectionDto`
- **DELETE**:
  - `DeleteCollectionResponseDto` = `OkResponse`

### 3.2 Struktury odpowiedzi i statusy

#### GET `/api/v1/collections`
- **200**:
  - Body (`CollectionsListResponseDto`):
    - `items: CollectionDto[]`
    - `total: number`
- **401**: brak/nieprawidłowy token
- **500**: błąd serwera / błąd Supabase

#### POST `/api/v1/collections`
- **201**:
  - Body (`CreateCollectionResponseDto`): `CollectionDto`
- **400**: body nie przechodzi walidacji
- **401**: brak/nieprawidłowy token
- **409**: konflikt unikalności (np. `UNIQUE (user_id, name)`)
- **500**: błąd serwera / błąd Supabase

#### DELETE `/api/v1/collections/{collectionId}`
- **200**:
  - Body (`DeleteCollectionResponseDto`): `{ "ok": true }`
- **401**: brak/nieprawidłowy token
- **403**: próba usunięcia kolekcji systemowej
- **404**: kolekcja nie istnieje (dla danego użytkownika)
- **500**: błąd serwera / błąd Supabase

Uwaga: Błędy zwracamy w spójnym formacie:
`{ "error": { "message": "...", ... } }` zgodnie z `jsonError(...)`.

## 4. Przepływ danych

### 4.1 Warstwy i pliki
- **Routes (Astro endpoints)**:
  - `src/pages/api/v1/collections/index.ts`
    - `GET` — listowanie
    - `POST` — tworzenie
  - `src/pages/api/v1/collections/[collectionId].ts`
    - `DELETE` — usuwanie
- **Validation (Zod)**:
  - `src/lib/validation/collections.schemas.ts` (nowy plik)
    - schema dla query GET
    - schema dla body POST
    - schema dla parametru `collectionId` (uuid)
- **Service (logika biznesowa, Supabase queries)**:
  - `src/lib/services/collections.service.ts` (nowy plik)
    - `ensureRandomCollectionForUser(...)`
    - `listCollections(...)`
    - `createCollection(...)`
    - `deleteCollection(...)`

### 4.2 Sekwencje (happy path)

#### GET
1. Middleware (`src/middleware/index.ts`) podłącza `context.locals.supabase` na podstawie `Authorization`.
2. Route: `requireUserId(context)` → `userId`.
3. Walidacja query paramów Zod (parse z `URLSearchParams` do obiektu).
4. Service:
   - `ensureRandomCollectionForUser`:
     - `select` po `system_key="random_collection"` (dla usera), jeśli brak → `insert`.
     - Best-effort: jeśli insert się nie uda (race), endpoint nadal może zwrócić listę (ale docelowo dążymy do stabilnej obecności systemowej kolekcji).
   - `listCollections`:
     - `from("collections")`
     - `.select("id,name,system_key,created_at,updated_at", { count: "exact" })`
     - filtry: `.eq("user_id", userId)` + opcjonalny `.ilike("name", ...)`
     - sort: `.order(sort, { ascending: order === "asc" })`
     - paginacja: `.range(offset, offset + limit - 1)`
5. Route mapuje wynik na `CollectionsListResponseDto` i zwraca `200`.

#### POST
1. Auth (`requireUserId`).
2. `readJsonBody` + walidacja Zod dla `CreateCollectionCommand`.
3. Service `createCollection`:
   - `insert` do `collections` z `user_id=userId`, `name`, `system_key=null`.
4. Mapowanie błędów:
   - unikalność (`23505`) → `409`
5. Zwrócenie `201` z `CollectionDto`.

#### DELETE
1. Auth (`requireUserId`).
2. Walidacja `collectionId` (uuid).
3. Service `deleteCollection`:
   - `select("id,system_key")` po `id=collectionId` i `.maybeSingle()`
   - jeśli brak → `404`
   - jeśli `system_key != null` (lub `=== "random_collection"`) → `403`
   - `delete().eq("id", collectionId)` (kaskada usuwa `topics` i `flashcards`)
4. Zwrócenie `200` z `{ ok: true }`.

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie**: obowiązkowy Bearer token, weryfikowany przez `supabase.auth.getUser(token)` (`requireUserId`).
- **Autoryzacja**:
  - RLS w Supabase/Postgres jako główna ochrona dostępu do wierszy.
  - Dodatkowo jawne mapowanie „brak rekordu” → `404` (bez ujawniania, czy zasób należy do kogoś innego).
- **Walidacja wejścia**:
  - Zod schemas dla query/body/params, w tym:
    - limit/offset jako liczby całkowite, nieujemne, z sensownymi limitami,
    - whitelist pól sortowania (żadnych dowolnych nazw kolumn),
    - `name` trim + długość + niepuste po trimie.
- **Ochrona przed nadużyciami**:
  - `limit` capped (np. 100) by uniknąć ciężkich zapytań.
  - Rozważyć rate limiting na warstwie edge/reverse-proxy (poza zakresem kodu aplikacji).
- **Bezpieczeństwo operacji DELETE**:
  - Blokada usuwania kolekcji systemowych (403).
  - Brak możliwości podania `user_id` w request (ustalany po stronie serwera).

## 6. Obsługa błędów

### 6.1 Scenariusze błędów (przykłady)
- **400**:
  - nieprawidłowy JSON w body (`readJsonBody`)
  - `name` puste/za długie
  - `limit/offset` nie są liczbami całkowitymi lub poza zakresem
  - `sort` spoza whitelisty
  - `collectionId` nie jest uuid
- **401**:
  - brak nagłówka `Authorization`
  - niewłaściwy format `Bearer`
  - wygasły/nieprawidłowy token
- **403**:
  - próba usunięcia systemowej kolekcji (np. `system_key !== null`)
- **404**:
  - kolekcja do usunięcia nie istnieje (lub jest niewidoczna w RLS)
- **409**:
  - `UNIQUE (user_id, name)` przy tworzeniu kolekcji
- **500**:
  - błąd Supabase (poza spodziewanymi konfliktami)
  - nieoczekiwany wyjątek w kodzie

### 6.2 Mapowanie błędów Supabase → HTTP
W service warstwie lub route:
- `error.code === "23505"` → `409` (konflikt unikalności)
- pozostałe `error` → `500` (nie ujawniać szczegółów SQL użytkownikowi)

### 6.3 Rejestrowanie błędów w tabeli
W dostarczonych zasobach DB **nie ma dedykowanej tabeli do logów błędów** dla kolekcji (jest `ai_generation_events`, ale dotyczy AI). Dla tych endpointów:
- logowanie operacyjne: `console.error(...)` po stronie serwera (opcjonalnie, z request-id),
- brak zapisu do DB (N/A), chyba że zespół zdecyduje o osobnej tabeli telemetrycznej w przyszłości.

## 7. Wydajność
- **Paginacja**: zawsze stosować `limit/offset` + `range()`; nie zwracać pełnej listy bez limitu.
- **Sortowanie**: tylko po whitelisted polach; indeksy pomocne:
  - `collections(user_id, created_at)` lub przynajmniej indeks po `user_id` (często i tak występuje przez FKs/unikalności),
  - `collections(user_id, name)` już wspierane przez `UNIQUE (user_id, name)`.
- **Wyszukiwanie `q`**:
  - `ilike` po `name` może być kosztowne; przy większej skali rozważyć `pg_trgm` i indeks GIN (poza zakresem MVP, ale warto odnotować).
- **„Ensure random collection”**:
  - wywoływane przy GET; warto zrobić je możliwie tanio (select → insert tylko gdy brak).
  - rozważyć unikalność na `(user_id, system_key)` w DB, aby race condition przy insertach było bezpieczne (jeśli nie istnieje).

## 8. Kroki implementacji
1. **Dodać schemy walidacji Zod**:
   - Utworzyć `src/lib/validation/collections.schemas.ts`:
     - `collectionsListQuerySchema` (q/limit/offset/sort/order z defaultami i capem limit),
     - `createCollectionCommandSchema` (name: trim, min/max),
     - `collectionIdParamSchema` (uuid).
2. **Dodać service warstwę**:
   - Utworzyć `src/lib/services/collections.service.ts` z funkcjami:
     - `ensureRandomCollectionForUser({ supabase, userId })`
     - `listCollections({ supabase, userId, q, limit, offset, sort, order })`
     - `createCollection({ supabase, userId, name })`
     - `deleteCollection({ supabase, userId, collectionId })`
   - W service stosować guard clauses i zwracać czytelne błędy (np. własne error types) lub mapować na poziomie route.
3. **Zaimplementować routes**:
   - Utworzyć `src/pages/api/v1/collections/index.ts`:
     - `export const prerender = false`
     - `GET(context)`:
       - `requireUserId`
       - parse query → walidacja Zod
       - `ensureRandomCollectionForUser` (best-effort)
       - `listCollections` → `200`
     - `POST(context)`:
       - `requireUserId`
       - `readJsonBody` + walidacja
       - `createCollection`
       - mapowanie `23505` → `409`
       - `201`
   - Utworzyć `src/pages/api/v1/collections/[collectionId].ts`:
     - `export const prerender = false`
     - `DELETE(context)`:
       - `requireUserId`
       - walidacja `collectionId`
       - `deleteCollection` (404/403/200)
4. **Ujednolicić kontrakty i odpowiedzi**:
   - Używać `json(...)` i `jsonError(...)` z `src/lib/http/api.ts`.
   - Dla walidacji Zod zwracać `400` z listą `issues` (analogicznie jak endpointy AI).
5. **Zweryfikować spójność z DB/RLS**:
   - Potwierdzić, że tabela `collections` ma kolumnę `user_id` i RLS polityki ograniczają dostęp do własnych rekordów.
   - Upewnić się, że `system_key` jest `NULL` dla zwykłych kolekcji i ma wartość `"random_collection"` dla systemowej.
6. **Dodać testy (jeśli repo je posiada)**:
   - Testy walidacji Zod (query/body).
   - Testy integracyjne endpointów (200/201/400/401/403/404/409) z mockiem Supabase lub testową instancją.
7. **Dodać/zweryfikować użycie w UI**:
   - `src/lib/services/dashboard-service.ts` już odwołuje się do `/api/v1/collections`; po wdrożeniu endpointów potwierdzić, że oczekiwane pola i statusy zgadzają się z UI.

