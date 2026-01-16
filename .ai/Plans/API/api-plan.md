# REST API Plan

## 1. Resources
- `profiles` → `public.profiles` (read-only for users; admin flag)
- `collections` → `public.collections`
- `topics` → `public.topics`
- `flashcards` → `public.flashcards`
- `ai_generation_events` → `public.ai_generation_events`
- `admin_metrics` → derived from `ai_generation_events` and `flashcards` via security-definer SQL functions

## 2. Endpoints

### Conventions (all list endpoints)
- Pagination: `limit` (default 20, max 100), `offset` (default 0)
- Sorting: `sort` (e.g., `created_at`), `order` (`asc|desc`, default `desc`)
- Search: strict substring match (`q`), case-insensitive `ILIKE`, no diacritics normalization
- Common errors:
  - `400` validation error (empty name, length exceeded, invalid enum)
  - `401` unauthenticated
  - `403` forbidden (admin-only)
  - `404` not found (resource not owned or missing)
  - `409` conflict (unique constraints)
  - `429` AI generation limit reached

---

### Auth (Supabase Auth)
These are handled by Supabase Auth (GoTrue). The app uses Supabase SDK; endpoints are listed for completeness.

- **POST** `/auth/signup`
  - Description: Register with email + password.
  - Request JSON:
    ```json
    { "email": "user@example.com", "password": "secret" }
    ```
  - Response JSON:
    ```json
    { "user": { "id": "uuid", "email": "..." }, "session": { "access_token": "...", "refresh_token": "..." } }
    ```
  - Success: `201`
  - Errors: `400`, `409`

- **POST** `/auth/login`
  - Description: Login with email + password.
  - Request JSON:
    ```json
    { "email": "user@example.com", "password": "secret" }
    ```
  - Response JSON:
    ```json
    { "user": { "id": "uuid" }, "session": { "access_token": "..." } }
    ```
  - Success: `200`
  - Errors: `400`, `401`

- **POST** `/auth/logout`
  - Description: Logout current session (invalidate refresh token).
  - Response JSON:
    ```json
    { "ok": true }
    ```
  - Success: `200`
  - Errors: `401`

---

### Profiles

- **GET** `/api/v1/profile`
  - Description: Get current user profile (admin flag).
  - Response JSON:
    ```json
    { "id": "uuid", "is_admin": false, "created_at": "...", "updated_at": "..." }
    ```
  - Success: `200`
  - Errors: `401`

---

### Collections

- **GET** `/api/v1/collections`
  - Description: List user collections (includes system random collection).
  - Query params: `q`, `limit`, `offset`, `sort`, `order`
  - Response JSON:
    ```json
    {
      "items": [
        { "id": "uuid", "name": "History", "system_key": null, "created_at": "...", "updated_at": "..." }
      ],
      "total": 1
    }
    ```
  - Success: `200`
  - Errors: `401`

- **POST** `/api/v1/collections`
  - Description: Create collection.
  - Request JSON:
    ```json
    { "name": "History" }
    ```
  - Response JSON:
    ```json
    { "id": "uuid", "name": "History", "system_key": null, "created_at": "...", "updated_at": "..." }
    ```
  - Success: `201`
  - Errors: `400`, `409`

- **DELETE** `/api/v1/collections/{collectionId}`
  - Description: Hard delete collection with cascade (topics + flashcards).
  - Response JSON:
    ```json
    { "ok": true }
    ```
  - Success: `200`
  - Errors: `401`, `403` (system collection), `404`

---

### Topics

- **GET** `/api/v1/collections/{collectionId}/topics`
  - Description: List topics in a collection (includes system random topic if applicable).
  - Query params: `q`, `limit`, `offset`, `sort`, `order`
  - Response JSON:
    ```json
    {
      "items": [
        { "id": "uuid", "name": "WW2", "description": "...", "system_key": null, "created_at": "...", "updated_at": "..." }
      ],
      "total": 1
    }
    ```
  - Success: `200`
  - Errors: `401`, `404`

- **POST** `/api/v1/collections/{collectionId}/topics`
  - Description: Create topic in collection.
  - Request JSON:
    ```json
    { "name": "WW2", "description": "..." }
    ```
  - Response JSON:
    ```json
    { "id": "uuid", "name": "WW2", "description": "...", "system_key": null, "created_at": "...", "updated_at": "..." }
    ```
  - Success: `201`
  - Errors: `400`, `409`, `404`

- **PATCH** `/api/v1/topics/{topicId}`
  - Description: Update topic description only.
  - Request JSON:
    ```json
    { "description": "New description" }
    ```
  - Response JSON:
    ```json
    { "id": "uuid", "name": "WW2", "description": "New description", "system_key": null, "created_at": "...", "updated_at": "..." }
    ```
  - Success: `200`
  - Errors: `400`, `401`, `403` (attempt to change name/system_key), `404`

- **DELETE** `/api/v1/topics/{topicId}`
  - Description: Hard delete topic (cascade flashcards).
  - Response JSON:
    ```json
    { "ok": true }
    ```
  - Success: `200`
  - Errors: `401`, `403` (system topic), `404`

---

### Flashcards

- **GET** `/api/v1/topics/{topicId}/flashcards`
  - Description: List flashcards in a topic.
  - Query params:
    - `q` (search in `front` or `back`)
    - `is_favorite` (`true|false`)
    - `source` (`manually_created|auto_generated`)
    - `limit`, `offset`, `sort`, `order`
  - Response JSON:
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "front": "Question?",
          "back": "Answer.",
          "source": "manually_created",
          "is_favorite": false,
          "edited_by_user": false,
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "total": 1
    }
    ```
  - Success: `200`
  - Errors: `401`, `404`

- **POST** `/api/v1/topics/{topicId}/flashcards`
  - Description: Create manual flashcard.
  - Request JSON:
    ```json
    { "front": "Question?", "back": "Answer." }
    ```
  - Response JSON:
    ```json
    {
      "id": "uuid",
      "front": "Question?",
      "back": "Answer.",
      "source": "manually_created",
      "is_favorite": false,
      "edited_by_user": false,
      "created_at": "...",
      "updated_at": "..."
    }
    ```
  - Success: `201`
  - Errors: `400`, `401`, `404`

- **PATCH** `/api/v1/flashcards/{flashcardId}`
  - Description: Update `front`, `back`, or toggle `is_favorite`. Source cannot change.
  - Request JSON:
    ```json
    { "front": "New question?", "back": "New answer.", "is_favorite": true }
    ```
  - Response JSON:
    ```json
    {
      "id": "uuid",
      "front": "New question?",
      "back": "New answer.",
      "source": "auto_generated",
      "is_favorite": true,
      "edited_by_user": true,
      "created_at": "...",
      "updated_at": "..."
    }
    ```
  - Success: `200`
  - Errors: `400`, `401`, `403` (attempt to change source), `404`

- **DELETE** `/api/v1/flashcards/{flashcardId}`
  - Description: Hard delete flashcard.
  - Response JSON:
    ```json
    { "ok": true }
    ```
  - Success: `200`
  - Errors: `401`, `404`

- **GET** `/api/v1/flashcards/favorites/random`
  - Description: Get random favorites across all user topics (dashboard).
  - Query params: `limit` (default 5, max 20)
  - Response JSON:
    ```json
    { "items": [ { "id": "uuid", "front": "...", "back": "...", "topic_id": "uuid" } ] }
    ```
  - Success: `200`
  - Errors: `401`

---

### AI Generation

- **POST** `/api/v1/ai/generate`
  - Description: Generate exactly 1 flashcard proposal for a topic (including random topic).
  - Request JSON:
    ```json
    { "topic_id": "uuid" }
    ```
  - Response JSON:
    ```json
    {
      "proposal": { "front": "Generated title", "back": "Generated text" },
      "limit": { "remaining": 4, "reset_at_utc": "2026-01-16T00:00:00Z" },
      "is_random": false
    }
    ```
  - Success: `200`
  - Errors: `401`, `404`, `429`, `502` (AI provider error)

- **POST** `/api/v1/ai/accept`
  - Description: Accept proposal and persist flashcard + event.
  - Request JSON:
    ```json
    { "topic_id": "uuid", "front": "Generated title", "back": "Generated text", "is_random": false, "random_domain_label": null }
    ```
  - Response JSON:
    ```json
    { "flashcard_id": "uuid", "event_id": "uuid" }
    ```
  - Success: `201`
  - Errors: `400`, `401`, `404`

- **POST** `/api/v1/ai/reject`
  - Description: Reject proposal and persist event (no flashcard).
  - Request JSON:
    ```json
    { "topic_id": "uuid", "is_random": false, "random_domain_label": null }
    ```
  - Response JSON:
    ```json
    { "event_id": "uuid" }
    ```
  - Success: `201`
  - Errors: `400`, `401`, `404`

- **POST** `/api/v1/ai/skip`
  - Description: User closes preview without action; optional tracking event.
  - Request JSON:
    ```json
    { "topic_id": "uuid", "is_random": false, "random_domain_label": null }
    ```
  - Response JSON:
    ```json
    { "event_id": "uuid" }
    ```
  - Success: `201`
  - Errors: `400`, `401`

---

### Admin Metrics (admin-only)

- **GET** `/api/v1/admin/metrics/summary`
  - Description: Acceptance ratio and AI share (aggregates).
  - Response JSON:
    ```json
    {
      "accept_rate": 0.81,
      "ai_share": 0.77,
      "accepted": 81,
      "rejected": 19,
      "auto_generated": 77,
      "manually_created": 23
    }
    ```
  - Success: `200`
  - Errors: `401`, `403`

- **GET** `/api/v1/admin/metrics/daily`
  - Description: Daily aggregates for a date range (UTC).
  - Query params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)
  - Response JSON:
    ```json
    {
      "items": [
        { "day_utc": "2026-01-15", "accepted": 12, "rejected": 3, "auto_generated": 20, "manually_created": 5 }
      ]
    }
    ```
  - Success: `200`
  - Errors: `401`, `403`, `400`

## 3. Authentication and Authorization
- Authentication via Supabase Auth (JWT in `Authorization: Bearer <token>`).
- Row Level Security (RLS) enforces `user_id = auth.uid()` for `collections`, `topics`, `flashcards`, `ai_generation_events`, and `profiles`.
- Admin endpoints require `profiles.is_admin = true` verified in SQL security-definer functions; direct SELECT to user content is not granted to admin.
- System records (`system_key` for random collection/topic) are protected from delete and rename by DB triggers; API must return `403` on such attempts.

## 4. Validation and Business Logic

### Validation rules (from schema)
- `collections.name` required, trimmed, max 120 chars; unique per user.
- `topics.name` required, trimmed, max 120 chars; unique per collection per user.
- `topics.description` max 10,000 chars; editable; can be empty.
- `flashcards.front` required, trimmed, max 200 chars.
- `flashcards.back` required, trimmed, max 600 chars.
- `flashcards.source` is enum: `manually_created|auto_generated` (immutable).
- `ai_generation_events.status` is enum: `accepted|rejected|skipped|failed`.

### Business logic
- No renaming collections/topics in MVP: API only exposes description update for topics.
- Hard deletes for collections/topics/flashcards; cascades handled by FK.
- Random collection/topic exist per user and cannot be deleted.
- AI generation returns exactly 1 proposal per request.
- Daily AI limit is enforced server-side (based on `ai_generation_events` with status `accepted|rejected|skipped`); reset at 00:00 UTC.
- Accept flow creates flashcard + `ai_generation_events` with `accepted`; reject flow logs `rejected`; skip optionally logs `skipped`.
- Failed AI calls log `failed` without consuming daily limit.
- Dashboard can fetch random favorites across all topics; no anti-repeat required.
