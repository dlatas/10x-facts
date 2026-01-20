## API Endpoint Implementation Plan: Topics (`/api/v1/collections/{collectionId}/topics` + `/api/v1/topics/{topicId}`)

## 1. Przegląd punktu końcowego
Celem jest wdrożenie zestawu endpointów do zarządzania tematami (topics) w ramach kolekcji użytkownika:

- **GET** `/api/v1/collections/{collectionId}/topics` — lista tematów w kolekcji (z uwzględnieniem systemowego tematu „random”, jeśli dotyczy).
- **POST** `/api/v1/collections/{collectionId}/topics` — utworzenie tematu w kolekcji.
- **PATCH** `/api/v1/topics/{topicId}` — aktualizacja wyłącznie pola `description` tematu.
- **DELETE** `/api/v1/topics/{topicId}` — twarde usunięcie tematu (kaskadowo usuwa fiszki).

Wymagania technologiczne i projektowe:

- Astro 5 Server Endpoints w `src/pages/api/v1/...`
- Supabase Auth (Bearer JWT) + RLS jako podstawowa autoryzacja dostępu do danych
- Walidacja wejścia przez Zod
- Spójny format odpowiedzi błędów: `jsonError(...)` z `src/lib/http/api.ts`
- Klient Supabase w endpointach wyłącznie z `context.locals.supabase`

Założenie (wynikające z DB planu + specyfikacji):

- Tabela `public.topics` ma (co najmniej) kolumny: `id`, `user_id`, `collection_id`, `name`, `description`, `system_key`, `created_at`, `updated_at`.
- Temat systemowy jest identyfikowany przez `system_key === "random_topic"` i **nie może zostać usunięty** (403).
- `name` i `system_key` nie są edytowalne w MVP (próba zmiany → 403); edytowalny jest tylko `description`.

## 2. Szczegóły żądania

### 2.1 Wspólne wymagania (dla wszystkich endpointów)
- **Auth**: wymagany nagłówek `Authorization: Bearer <access_token>` (Supabase).
- **Content-Type**: `application/json` dla metod z body.
- **Dostęp do DB**: `context.locals.supabase`.
- **Walidacja**: Zod dla params/query/body.

### 2.2 GET `/api/v1/collections/{collectionId}/topics`
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/v1/collections/{collectionId}/topics`
- **Parametry ścieżki (wymagane)**:
  - `collectionId: uuid`
- **Query params (opcjonalne)** — zgodnie z `TopicsListQuery`:
  - `q?: string` — wyszukiwanie po nazwie (np. `ilike %q%`); trim; pusty string traktować jak brak filtra.
  - `limit?: number` — limit paginacji (rekomendacja: default 50, max 100).
  - `offset?: number` — offset paginacji (default 0).
  - `sort?: keyof TopicDto` — pole sortowania; whitelist (patrz sekcja Walidacja).
  - `order?: "asc" | "desc"` — kierunek sortowania (default: `desc`).
- **Body**: brak

Wymóg funkcjonalny:

- Lista ma zwrócić tematy w danej kolekcji użytkownika.
- Musi zawierać systemowy temat „random”, **jeśli dotyczy**.
  - Rekomendacja implementacyjna: „dotyczy” = kolekcja ma `system_key === "random_collection"`; wtedy endpoint listujący zapewnia obecność tematu z `system_key === "random_topic"` w tej kolekcji (best-effort).

### 2.3 POST `/api/v1/collections/{collectionId}/topics`
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/v1/collections/{collectionId}/topics`
- **Parametry ścieżki (wymagane)**:
  - `collectionId: uuid`
- **Body (JSON)** — zgodnie z `CreateTopicCommand`:
  - **Wymagane**:
    - `name: string`
  - **Opcjonalne / rekomendowane**:
    - `description?: string`
- **Query params**: brak

Walidacja biznesowa:

- `name` nie może być whitespace-only; `trim` + długość ≤ 120 (spójnie z DB).
- `description` ≤ 10000 (spójnie z DB); w MVP dopuszczalne puste (np. `""`) jeśli UX tego wymaga.
- `system_key` nie jest akceptowane w body (tematy systemowe tworzymy tylko po stronie serwera).

### 2.4 PATCH `/api/v1/topics/{topicId}`
- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/v1/topics/{topicId}`
- **Parametry ścieżki (wymagane)**:
  - `topicId: uuid`
- **Body (JSON)** — zgodnie z `UpdateTopicDescriptionCommand`:
  - **Wymagane**:
    - `description: string`

Walidacja biznesowa:

- Endpoint akceptuje wyłącznie zmianę `description`.
- Jeżeli body zawiera `name` lub `system_key`, zwrócić **403** (zgodnie ze specyfikacją: „attempt to change name/system_key”).

### 2.5 DELETE `/api/v1/topics/{topicId}`
- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/v1/topics/{topicId}`
- **Parametry ścieżki (wymagane)**:
  - `topicId: uuid`
- **Body**: brak

Walidacja biznesowa:

- Nie wolno usuwać tematu systemowego (`system_key === "random_topic"`) → **403**.

## 3. Szczegóły odpowiedzi

### 3.1 Używane typy (DTO i Command)
Zgodnie z `src/types/topics.ts`:

- **GET**:
  - `TopicsListQuery`
  - `TopicsListResponseDto` = `ListResponse<TopicDto>`
  - `TopicDto` = `Pick<Topic, "id" | "name" | "description" | "system_key" | "created_at" | "updated_at">`
- **POST**:
  - `CreateTopicCommand` = `Pick<TablesInsert<"topics">, "name" | "description">`
  - `CreateTopicResponseDto` = `TopicDto`
- **PATCH**:
  - `UpdateTopicDescriptionCommand` = `Required<Pick<TablesUpdate<"topics">, "description">>`
  - `UpdateTopicResponseDto` = `TopicDto`
- **DELETE**:
  - `DeleteTopicResponseDto` = `OkResponse` (z `src/types/common.ts`)

### 3.2 Struktury odpowiedzi i statusy

#### GET `/api/v1/collections/{collectionId}/topics`
- **200**:
  - Body (`TopicsListResponseDto`):
    - `items: TopicDto[]`
    - `total: number`
- **401**: brak/nieprawidłowy token
- **404**: kolekcja nie istnieje (dla danego użytkownika)
- **500**: błąd serwera / błąd Supabase

#### POST `/api/v1/collections/{collectionId}/topics`
- **201**:
  - Body (`CreateTopicResponseDto`): `TopicDto`
- **400**: body nie przechodzi walidacji
- **401**: brak/nieprawidłowy token
- **404**: kolekcja nie istnieje (dla danego użytkownika)
- **409**: konflikt unikalności (np. `UNIQUE (user_id, collection_id, name)`)
- **500**: błąd serwera / błąd Supabase

#### PATCH `/api/v1/topics/{topicId}`
- **200**:
  - Body (`UpdateTopicResponseDto`): `TopicDto`
- **400**: body nie przechodzi walidacji (np. brak `description`, przekroczony limit)
- **401**: brak/nieprawidłowy token
- **403**: próba zmiany `name`/`system_key`
- **404**: temat nie istnieje (dla danego użytkownika)
- **500**: błąd serwera / błąd Supabase

#### DELETE `/api/v1/topics/{topicId}`
- **200**:
  - Body (`DeleteTopicResponseDto`): `{ "ok": true }`
- **401**: brak/nieprawidłowy token
- **403**: próba usunięcia tematu systemowego
- **404**: temat nie istnieje (dla danego użytkownika)
- **500**: błąd serwera / błąd Supabase

Uwaga: Błędy zwracamy spójnie przez `jsonError(status, message, extra?)`, np.:

- `{ "error": { "message": "..." } }`
- dla walidacji: `{ "error": { "message": "...", "issues": [...] } }` (rekomendowane)

## 4. Przepływ danych

### 4.1 Warstwy i pliki

- **Routes (Astro endpoints)**:
  - `src/pages/api/v1/collections/[collectionId]/topics.ts`
    - `GET` — listowanie tematów w kolekcji
    - `POST` — tworzenie tematu w kolekcji
  - `src/pages/api/v1/topics/[topicId].ts`
    - `PATCH` — aktualizacja opisu
    - `DELETE` — usuwanie tematu

- **Validation (Zod)**:
  - `src/lib/validation/topics.schemas.ts` (nowy plik)
    - schema dla query GET (`TopicsListQuery`)
    - schema dla body POST (`CreateTopicCommand`)
    - schema dla body PATCH (`UpdateTopicDescriptionCommand` + dodatkowa kontrola pól zabronionych)
    - schema dla parametrów `collectionId` i `topicId` (uuid)

- **Service (logika biznesowa, Supabase queries)**:
  - `src/lib/services/topics.service.ts` (nowy plik)
    - `ensureRandomTopicForCollection(...)`
    - `listTopicsInCollection(...)`
    - `createTopicInCollection(...)`
    - `updateTopicDescription(...)`
    - `deleteTopic(...)`

### 4.2 Sekwencje (happy path)

#### GET `/collections/{collectionId}/topics`
1. Auth: `requireUserId(context)` → `userId` (w razie braku auth → 401).
2. Walidacja `collectionId` (uuid).
3. Sprawdzenie istnienia kolekcji w kontekście użytkownika:
   - `collections.select("id,system_key").eq("id", collectionId).maybeSingle()`
   - jeśli brak → 404 (kolekcja nie istnieje lub RLS blokuje).
4. Best-effort: jeśli kolekcja jest systemowa (np. `system_key === "random_collection"`), wywołać `ensureRandomTopicForCollection`.
5. Walidacja query paramów:
   - parse `URLSearchParams` → obiekt → Zod parse z defaultami.
6. `listTopicsInCollection`:
   - `from("topics")`
   - `.select("id,name,description,system_key,created_at,updated_at", { count: "exact" })`
   - filtry: `.eq("user_id", userId).eq("collection_id", collectionId)`
   - opcjonalnie: `.ilike("name", %q%)`
   - sort: `.order(sort, { ascending: order === "asc" })` (sort whitelisted)
   - paginacja: `.range(offset, offset + limit - 1)`
7. Zwrócić `200` z `{ items, total }`.

#### POST `/collections/{collectionId}/topics`
1. Auth: `requireUserId`.
2. Walidacja `collectionId` (uuid).
3. Sprawdzenie istnienia kolekcji użytkownika (jak w GET) → brak = 404.
4. `readJsonBody(context)` → walidacja Zod body.
5. `createTopicInCollection`:
   - `insert` do `topics` z:
     - `user_id = userId`
     - `collection_id = collectionId`
     - `name`
     - `description` (jeśli undefined, pominąć pole, żeby zadziałał default DB)
     - `system_key = null` (jawnie lub przez pominięcie)
   - `.select("id,name,description,system_key,created_at,updated_at").single()`
6. Mapowanie konfliktu unikalności:
   - `error.code === "23505"` → 409
7. Zwrócić `201` z `TopicDto`.

#### PATCH `/topics/{topicId}`
1. Auth: `requireUserId`.
2. Walidacja `topicId` (uuid).
3. `readJsonBody`:
   - jeśli body zawiera `name` lub `system_key` → 403
   - walidacja `description` Zod (≤ 10000)
4. Sprawdzenie istnienia tematu w kontekście użytkownika:
   - `topics.select("id").eq("id", topicId).maybeSingle()` (RLS) → brak = 404
5. Aktualizacja:
   - `update({ description }).eq("id", topicId)`
   - `.select("id,name,description,system_key,created_at,updated_at").single()`
6. Zwrócić `200` z `TopicDto`.

#### DELETE `/topics/{topicId}`
1. Auth: `requireUserId`.
2. Walidacja `topicId` (uuid).
3. Pobranie tematu:
   - `topics.select("id,system_key").eq("id", topicId).maybeSingle()` → brak = 404
4. Jeżeli `system_key === "random_topic"` → 403.
5. `delete().eq("id", topicId)`:
   - kaskada usuwa `flashcards` (wg DB planu: FK `flashcards(topic_id,user_id)` → `topics(id,user_id)` `ON DELETE CASCADE`).
6. Zwrócić `200` z `{ ok: true }`.

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie**: tylko Supabase; brak tokena / zła sesja → 401 (przez `requireUserId`).
- **Autoryzacja**:
  - RLS jest „pierwszą linią obrony” (user widzi tylko własne wiersze).
  - Dodatkowo jawne sprawdzanie istnienia kolekcji/tematu w kontekście usera i mapowanie braku na 404.
- **Walidacja wejścia**:
  - Query:
    - `limit` i `offset` jako int, `offset >= 0`, `limit` capped (np. 100) by ograniczyć koszt.
    - `sort` wyłącznie z whitelisty `TopicDto` (żadnych dowolnych kolumn).
  - Body:
    - `POST`: blokada „mass assignment” (nie przyjmować `user_id`, `collection_id`, `system_key`).
    - `PATCH`: wymusić wyłącznie `description`; `name/system_key` → 403.
- **Nieujawnianie informacji**: w odpowiedziach błędów unikać szczegółów SQL/Supabase; do klienta tylko komunikat + ewentualnie `issues` walidacji.
- **Ochrona przed nadużyciami**:
  - Rozważyć rate limiting na listowanie (GET) i tworzenie (POST), przynajmniej na poziomie reverse-proxy; w kodzie MVP minimalnie: twarde capy `limit`.

## 6. Obsługa błędów

### 6.1 Scenariusze błędów i statusy
- **400**:
  - nieprawidłowy JSON w body (`readJsonBody`)
  - `collectionId/topicId` nie jest uuid (zod param schema)
  - `limit/offset` nie są liczbami całkowitymi lub poza zakresem
  - `sort/order` spoza whitelisty
  - `POST`: `name` puste/za długie, `description` za długi
  - `PATCH`: brak `description` lub za długi
- **401**:
  - brak nagłówka `Authorization` / brak sesji
  - nieprawidłowy/wygasły token
- **403**:
  - `PATCH`: body zawiera `name` lub `system_key` (próba zmiany)
  - `DELETE`: usuwanie tematu systemowego (`system_key === "random_topic"`)
- **404**:
  - `GET/POST`: kolekcja nie istnieje (dla użytkownika)
  - `PATCH/DELETE`: temat nie istnieje (dla użytkownika)
- **409**:
  - konflikt unikalności przy tworzeniu tematu (`UNIQUE (user_id, collection_id, name)`)
- **500**:
  - nieoczekiwany błąd serwera
  - błąd Supabase inny niż kontrolowane przypadki (np. nie 23505)

### 6.2 Mapowanie błędów Supabase → HTTP
Rekomendacja:

- `error.code === "23505"` → 409 (konflikt unikalności)
- pozostałe `error` → 500 (logować serwerowo, nie zwracać detali do klienta)

### 6.3 Rejestrowanie błędów w tabeli błędów
W dostarczonych zasobach DB **nie ma dedykowanej tabeli do logowania błędów** dla tematów (występuje `ai_generation_events`, ale dotyczy AI). Dla endpointów Topics:

- logowanie operacyjne: `console.error(...)` po stronie serwera (np. z `route`, `userId`, `collectionId/topicId`, `supabaseError.code`)
- brak zapisu do DB (N/A), chyba że zespół wprowadzi osobny mechanizm telemetryczny w przyszłości

## 7. Wydajność
- **Paginacja**:
  - zawsze stosować `limit/offset` + `.range(...)`;
  - domyślny `limit` ustawiony, a `limit` ograniczony do sensownego maksimum.
- **Sortowanie**:
  - tylko po whitelisted polach z `TopicDto`;
  - preferowany default: `created_at desc`.
- **Wyszukiwanie `q`**:
  - `ilike` po `name` może być kosztowne; przy większej skali rozważyć `pg_trgm` + indeks GIN (poza MVP).
- **Systemowy random topic (ensure)**:
  - wykonywać tylko gdy kolekcja tego wymaga;
  - robić to tanio: `select` → `insert` tylko gdy brak;
  - obsłużyć race condition: w razie konfliktu unikalności ignorować i kontynuować (best-effort).

## 8. Kroki implementacji
1. **Dodać schemy walidacji Zod**:
   - Utworzyć `src/lib/validation/topics.schemas.ts`:
     - `topicsListQuerySchema` (q/limit/offset/sort/order z defaultami i capem limit)
     - `createTopicCommandSchema` (`name` trim + min/max; `description` max 10000, opcjonalne)
     - `updateTopicDescriptionCommandSchema` (`description` wymagane, max 10000)
     - `collectionIdParamSchema` i `topicIdParamSchema` (uuid)
2. **Dodać service warstwę**:
   - Utworzyć `src/lib/services/topics.service.ts`:
     - `getCollectionOr404({ supabase, userId, collectionId })` (helper)
     - `ensureRandomTopicForCollection({ supabase, userId, collectionId })`
     - `listTopicsInCollection({ supabase, userId, collectionId, q, limit, offset, sort, order })`
     - `createTopicInCollection({ supabase, userId, collectionId, name, description? })`
     - `updateTopicDescription({ supabase, userId, topicId, description })`
     - `deleteTopic({ supabase, userId, topicId })` (z kontrolą system topic)
   - Stosować guard clauses i zwracać jednoznaczne błędy (np. custom error types) albo mapować na poziomie route.
3. **Zaimplementować routes (Astro endpoints)**:
   - `src/pages/api/v1/collections/[collectionId]/topics.ts`:
     - `export const prerender = false`
     - `export async function GET(context)`:
       - `requireUserId`
       - walidacja `collectionId` + check kolekcji
       - `ensureRandomTopicForCollection` (best-effort)
       - parse query → walidacja Zod → `listTopicsInCollection`
       - `200`
     - `export async function POST(context)`:
       - `requireUserId`
       - walidacja `collectionId` + check kolekcji
       - `readJsonBody` + walidacja Zod body
       - `createTopicInCollection`
       - mapowanie `23505` → `409`
       - `201`
   - `src/pages/api/v1/topics/[topicId].ts`:
     - `export const prerender = false`
     - `export async function PATCH(context)`:
       - `requireUserId`
       - walidacja `topicId`
       - `readJsonBody` + reguła 403 dla `name/system_key`
       - walidacja `description`
       - `updateTopicDescription`
       - `200`
     - `export async function DELETE(context)`:
       - `requireUserId`
       - walidacja `topicId`
       - `deleteTopic` (404/403/200)
4. **Ujednolicić kontrakty odpowiedzi**:
   - Sukces: `json(dto, { status })`
   - Błędy: `jsonError(status, message, extra?)`
   - Walidacja Zod: zwracać `400` z `issues` (rekomendowane) i czytelnym komunikatem.
5. **Zweryfikować spójność z DB/RLS**:
   - Potwierdzić polityki RLS dla `collections`, `topics`, `flashcards` (własność po `user_id = auth.uid()`).
   - Sprawdzić constrainty unikalności:
     - `UNIQUE (user_id, collection_id, name)` (dla 409 na POST).
     - (opcjonalnie) rozważyć unikalność `UNIQUE (user_id, collection_id, system_key)` dla stabilnego `ensureRandomTopicForCollection` (jeśli nie istnieje).
6. **Testy (jeśli repo je posiada)**:
   - Testy walidacji Zod (query/body/params).
   - Testy integracyjne dla: 200/201/400/401/403/404/409, w tym:
     - listowanie i obecność random topic (w kolekcji systemowej),
     - konflikt nazwy tematu w obrębie kolekcji,
     - blokada usuwania tematu systemowego,
     - blokada PATCH dla `name/system_key`.
