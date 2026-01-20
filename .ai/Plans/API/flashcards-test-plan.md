## Flashcards API — test plan (manual)

Założenia:

- Wszystkie requesty wymagają auth (Bearer lub sesja cookie).
- RLS jest chwilowo wyłączony, więc backend musi wymuszać własność przez `user_id` (endpointy to robią).

### Wspólne

- **401**: brak tokenu i brak sesji → `{ "error": { "message": ... } }`
- **400**: walidacja Zod → `{ "error": { "message": "...", "issues": [...] } }`

### GET `/api/v1/topics/{topicId}/flashcards`

- **200**: istniejący temat użytkownika → `{ items: FlashcardDto[], total: number }`
- **404**: temat nie istnieje dla usera (lub jest cudzy) → 404
- **Query — paginacja**
  - `limit` domyślnie 50, max 100
  - `offset` domyślnie 0
  - `limit=0`, `limit=999`, `offset=-1` → 400
- **Query — filtry**
  - `is_favorite=true|false` działa, `is_favorite=1` → 400
  - `source=manually_created|auto_generated`, inne → 400
- **Query — search**
  - `q=` (pusty) → traktowane jak brak filtra
  - `q` > 200 znaków → 400
- **Query — sort/order**
  - `sort` tylko whitelist (`id/front/back/source/is_favorite/edited_by_user/created_at/updated_at`)
  - `order=asc|desc`, inne → 400

### POST `/api/v1/topics/{topicId}/flashcards`

- **201**: poprawny body `{ front, back }` → `FlashcardDto`
- **404**: temat nie istnieje dla usera
- **400**:
  - brak JSON / nieprawidłowy JSON
  - `front/back` puste po trimie
  - `front > 200` lub `back > 600`
  - body zawiera dodatkowe pola (schema jest `.strict()`)

### PATCH `/api/v1/flashcards/{flashcardId}`

- **200**: aktualizacja `front`/`back`/`is_favorite` → `FlashcardDto`
- **404**: fiszka nie istnieje dla usera
- **400**:
  - puste body `{}` (wymóg: min. 1 pole)
  - nieprawidłowy JSON
  - `front/back` puste po trimie / za długie
- **403**:
  - body zawiera klucz `source` (nawet jeśli `null`)
  - (regresja) próba zmiany `source` przez DB trigger powinna mapować się na 403

### DELETE `/api/v1/flashcards/{flashcardId}`

- **200**: `{ ok: true }`
- **404**: fiszka nie istnieje dla usera

### GET `/api/v1/flashcards/favorites/random?limit=...`

- **200**: `{ items: FavoriteFlashcardDto[] }`
- **400**:
  - `limit=0` / `limit=999` / `limit=abc`
- **Uwagi**
  - MVP losuje w pamięci z próbki (ostatnie do 200 po `updated_at desc`), więc „random” nie jest idealnie równomierny — do wersji produkcyjnej preferowane RPC.

