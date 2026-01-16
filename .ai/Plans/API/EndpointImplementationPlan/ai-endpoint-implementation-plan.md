### API Endpoint Implementation Plan: AI Generation (`/api/v1/ai/*`)

## 1. Przegląd punktu końcowego
Celem modułu **AI Generation** jest:
- wygenerowanie **dokładnie 1 propozycji fiszki** dla zadanego tematu (`POST /api/v1/ai/generate`),
- zapisanie decyzji użytkownika (accept/reject/skip) w `public.ai_generation_events`,
- przy akceptacji: utworzenie fiszki (`public.flashcards`) ze źródłem `auto_generated`.

Zakres obejmuje 4 endpointy REST:
- `POST /api/v1/ai/generate` (200)
- `POST /api/v1/ai/accept` (201)
- `POST /api/v1/ai/reject` (201)
- `POST /api/v1/ai/skip` (201)

Zależności:
- Supabase Auth (JWT) + RLS (własność danych po `user_id = auth.uid()`).
- PostgreSQL (tabele: `topics`, `flashcards`, `ai_generation_events`).
- Provider AI: OpenRouter (błędy upstream mapowane na `502`).

## 2. Szczegóły żądania
### Wspólne wymagania
- **Uwierzytelnianie**: wymagane (Bearer token Supabase).
- **Content-Type**: `application/json`.
- **Walidacja**: Zod na poziomie endpointu (zgodnie z regułami projektu).
- **Dostęp do DB**: używać `context.locals.supabase` (nie importować globalnego klienta).

### `POST /api/v1/ai/generate`
- **Body (JSON)**:
  - **Wymagane**:
    - `topic_id: uuid` (AiGenerateCommand)
  - **Opcjonalne**: brak

### `POST /api/v1/ai/accept`
- **Body (JSON)**:
  - **Wymagane**:
    - `topic_id: uuid`
    - `front: string` (≤ 200, niepuste po trim)
    - `back: string` (≤ 600, niepuste po trim)
    - `is_random: boolean`
  - **Opcjonalne**:
    - `random_domain_label: string | null`

### `POST /api/v1/ai/reject`
- **Body (JSON)**:
  - **Wymagane**:
    - `topic_id: uuid`
    - `is_random: boolean`
  - **Opcjonalne**:
    - `random_domain_label: string | null`

### `POST /api/v1/ai/skip`
- **Body (JSON)**:
  - **Wymagane**:
    - `topic_id: uuid`
    - `is_random: boolean`
  - **Opcjonalne**:
    - `random_domain_label: string | null`

## 3. Wykorzystywane typy
### Command modele (request)
- `AiGenerateCommand`
- `AiAcceptCommand`
- `AiRejectCommand`
- `AiSkipCommand` (alias `AiRejectCommand`)

### DTO (response)
- `AiGenerateResponseDto`
  - `proposal: AiGenerationProposalDto` (`front`, `back`)
  - `limit: AiGenerationLimitDto` (`remaining`, `reset_at_utc`)
  - `is_random: boolean`
- `AiAcceptResponseDto` (`flashcard_id`, `event_id`)
- `AiRejectResponseDto` (`event_id`)
- `AiSkipResponseDto` (`event_id`)

### Encje bazodanowe (pośrednio)
- `Topic`, `Flashcard`, `AiGenerationEvent`

## 4. Szczegóły odpowiedzi
### `POST /api/v1/ai/generate` — 200
```json
{
  "proposal": { "front": "Generated title", "back": "Generated text" },
  "limit": { "remaining": 4, "reset_at_utc": "2026-01-16T00:00:00Z" },
  "is_random": false
}
```

### `POST /api/v1/ai/accept` — 201
```json
{ "flashcard_id": "uuid", "event_id": "uuid" }
```

### `POST /api/v1/ai/reject` — 201
```json
{ "event_id": "uuid" }
```

### `POST /api/v1/ai/skip` — 201
```json
{ "event_id": "uuid" }
```

## 5. Przepływ danych
### Wspólne kroki (guard clauses)
1. **Auth**: jeśli brak sesji/JWT → `401`.
2. **Walidacja Zod** body → przy błędzie → `400`.
3. **Autoryzacja zasobu**: sprawdzić, czy `topics.id = topic_id` istnieje i jest własnością usera (RLS + ewentualnie jawna kontrola `select ... maybeSingle()`):
   - jeśli brak → `404`.

### Generowanie propozycji (`/ai/generate`)
1. Wyliczyć kontekst „random”:
   - `is_random` wyznaczać na podstawie `topics.system_key === 'random_topic'` (dla danego `topic_id`).
2. **Limit dzienny**:
   - policzyć liczbę eventów użytkownika dla bieżącego dnia UTC: `status IN ('accepted','rejected','skipped')` w `ai_generation_events.day_utc`.
   - obliczyć `remaining` oraz `reset_at_utc` (następna północ UTC).
   - jeśli `remaining <= 0` → `429`.
   - Uwaga projektowa (spójność kontraktów): przy obecnym API brak `generation_id` w `accept/reject/skip`, więc **dzienny limit „twardo” można egzekwować na generate tylko wtedy, gdy jest dodatkowy rate-limit** (patrz sekcja Wydajność / Bezpieczeństwo). W MVP: limit dzienny odnosić do eventów (accept/reject/skip), a generate chronić dodatkowym throttlingiem.
3. Zawołać service do OpenRouter:
   - budowa promptu z tematu (`topics.description` oraz `topics.name`),
   - uzyskać 1 propozycję (`front`, `back`) i przemapować do limitów długości (≤ 200/600) oraz trim.
4. Zwrócić `AiGenerateResponseDto` (200).
5. W przypadku błędu upstream:
   - opcjonalnie zapisać event `failed` (bez konsumpcji limitu wg db-plan) z metadanymi (model, tokeny, latency) jeśli są dostępne,
   - zwrócić `502`.

### Akceptacja (`/ai/accept`)
1. Zweryfikować `front/back` (trim + długości) → `400`.
2. Wykonać 2 operacje DB (w jednej „logicznej” transakcji na poziomie aplikacji; jeśli brak transakcji w SDK, to sekwencyjnie z dobrą obsługą rollbacku na błędzie):
   - **Insert** do `flashcards`:
     - `topic_id`, `user_id` (z sesji), `front`, `back`,
     - `source = 'auto_generated'`,
     - `is_favorite = false`, `edited_by_user = false` (domyślne).
   - **Insert** do `ai_generation_events`:
     - `user_id`, `topic_id`, `status='accepted'`,
     - `is_random`, `random_domain_label` (może być null),
     - metadane: `model/prompt_tokens/completion_tokens/latency_ms` jeśli je mamy z generacji (w MVP można zostawić null).
3. Zwrócić `AiAcceptResponseDto` (201).

### Odrzucenie (`/ai/reject`)
1. **Insert** do `ai_generation_events`:
   - `status='rejected'` + pola analogiczne jak wyżej.
2. Zwrócić `AiRejectResponseDto` (201).

### Pominięcie (`/ai/skip`)
1. W MVP traktować jako **tracking opcjonalny, ale implementowany** (zgodnie ze spec: zwraca `event_id`):
   - **Insert** do `ai_generation_events` z `status='skipped'`.
2. Zwrócić `AiSkipResponseDto` (201).

## 6. Względy bezpieczeństwa
- **RLS i własność danych**: nie ufać samemu `topic_id` — zawsze odczyt tematu przez Supabase w kontekście usera (RLS) i mapowanie „brak” na `404`.
- **Prompt injection / data leakage**:
  - do promptu nie włączać żadnych danych wrażliwych użytkownika,
  - system prompt ma wymuszać format (2 pola) i zakazywać ujawniania czegokolwiek poza treścią fiszki.
- **Nadużycia kosztowe (AI)**:
  - ograniczyć częstotliwość wywołań `/ai/generate` (rate-limit per user/IP w middleware lub na poziomie endpointu),
  - limity długości `front/back` + trim po stronie serwera (także dla odpowiedzi z AI).
- **Walidacja `is_random`**:
  - `is_random` w `accept/reject/skip` traktować jako dane telemetryczne; weryfikować spójność z `topics.system_key` i w razie rozbieżności:
    - albo nadpisać wartość wyliczoną po stronie serwera,
    - albo zwrócić `400` (rekomendacja MVP: nadpisać dla spójności metryk).
- **`random_domain_label`**:
  - jest opcjonalne; w MVP dopuszczać `null`,
  - jeżeli podane: walidować długość (np. max 64) i znakowy whitelist (np. `[a-z0-9_-]`) aby nie wprowadzać śmieci do analityki.

## 7. Obsługa błędów
### Mapowanie błędów na statusy HTTP (wymagane i dodatkowe)
- `400`:
  - body nie przechodzi walidacji Zod,
  - `front/back` puste po trim lub przekraczają limity,
  - niespójne pola telemetryczne (jeśli wybierzemy strategię „odrzucaj” zamiast „nadpisuj”).
- `401`:
  - brak/niepoprawny JWT, brak użytkownika w kontekście.
- `404`:
  - `topic_id` nie istnieje lub nie należy do użytkownika (RLS → brak wiersza).
- `429`:
  - przekroczony limit dzienny (wg zliczania eventów accepted/rejected/skipped dla dnia UTC) lub dodatkowy rate-limit anty-abuse.
- `502`:
  - błąd OpenRouter / model / timeout upstream (AI provider error).
- `500`:
  - nieoczekiwany błąd po stronie serwera (np. wyjątek, błąd DB nieprzewidziany).

### Rejestrowanie błędów w bazie
- W schemacie nie ma osobnej „tabeli błędów”; zamiast tego:
  - przy błędzie AI upstream można (opcjonalnie) zapisać rekord w `ai_generation_events` z `status='failed'` oraz metadanymi (jeśli dostępne),
  - szczegóły błędu (stacktrace) logować po stronie serwera (logi aplikacji), nie do DB.

## 8. Wydajność
- **Zliczanie limitu dziennego**:
  - używać indeksu `ai_generation_events (user_id, day_utc)` i/lub partial index dla statusów (zgodnie z db-plan).
  - preferować `select count(*)` z filtrem po `user_id`, `day_utc` i `status in (...)`.
- **Minimalizacja round-tripów**:
  - `/ai/generate`: 1 odczyt tematu + 1 count limitu + 1 call do OpenRouter.
  - `/ai/accept`: 1 odczyt tematu + 1 insert flashcard + 1 insert event.
- **Ochrona przed spamem generate**:
  - dodać szybki rate-limit per user (np. token bucket w pamięci procesu lub w KV; w MVP dopuszczalne w middleware jako prosta blokada).

## 9. Kroki implementacji
1. **Zdefiniować Zod schemas** dla:
   - `AiGenerateCommand`, `AiAcceptCommand`, `AiRejectCommand`/`AiSkipCommand`,
   - wspólne helpery: `uuidSchema`, `trimmedString(max)`.
2. **Utworzyć service** w `src/lib/services/ai-generation.service.ts` (lub analogicznie):
   - `generateProposal({ topic, userId })` → `{ front, back, model?, tokens?, latencyMs? }`,
   - `computeDailyLimit({ userId, nowUtc })` → `{ remaining, resetAtUtc }`,
   - `insertAiEvent(...)` i `createAutoGeneratedFlashcard(...)` jako małe funkcje z guardami.
3. **Utworzyć endpointy Astro** w `src/pages/api/v1/ai/`:
   - `generate.ts`, `accept.ts`, `reject.ts`, `skip.ts`,
   - `export const prerender = false`,
   - eksportować `POST` (uppercase) i zwracać poprawne statusy.
4. **Dostęp do Supabase**:
   - w handlerach używać `context.locals.supabase`,
   - zawsze pozyskiwać `user`/`session` z Supabase i odrzucać brak auth (`401`).
5. **Weryfikacja tematu**:
   - odczyt `topics` po `id=topic_id` (RLS), brak → `404`,
   - wyznaczyć `is_random` na podstawie `system_key`.
6. **Implementacja limitu**:
   - policzyć eventy `accepted/rejected/skipped` dla `day_utc`,
   - obliczyć `reset_at_utc` (północ UTC następnego dnia),
   - jeśli `remaining <= 0` → `429`.
7. **Integracja z OpenRouter**:
   - pobrać klucz z `import.meta.env` (zgodnie ze stackiem),
   - dodać timeouty i mapowanie błędów na `502`,
   - post-process odpowiedzi (trim + przycięcie do limitów).
8. **Persistencja eventów**:
   - `/accept`: insert flashcard (`source='auto_generated'`) + insert event `accepted`,
   - `/reject`: insert event `rejected`,
   - `/skip`: insert event `skipped`,
   - w razie błędu AI: opcjonalnie insert `failed`.
9. **Ujednolicona obsługa błędów**:
   - w endpointach stosować jednolite mapowanie (400/401/404/429/502/500),
   - nie zwracać wrażliwych detali błędów providerów/DB do klienta.
10. **Testy i weryfikacja kontraktu**:
   - testy jednostkowe Zod i helperów limitu UTC,
   - testy integracyjne happy-path dla 4 endpointów (z mockiem OpenRouter),
   - testy 401/404/429/502.

