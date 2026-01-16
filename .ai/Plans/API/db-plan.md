# Schemat bazy danych PostgreSQL (Supabase) — 10xFacts (MVP)

## 1. Lista tabel (kolumny, typy, ograniczenia)

### `public.profiles`
Powiązanie 1:1 z `auth.users`. Trzyma flagę admina oraz (opcjonalnie) pola profilowe w przyszłości.

- `id` uuid **PK**, **FK** → `auth.users(id)` `ON DELETE CASCADE`
- `is_admin` boolean **NOT NULL** DEFAULT false
- `created_at` timestamptz **NOT NULL** DEFAULT now()
- `updated_at` timestamptz **NOT NULL** DEFAULT now()

Ograniczenia / uwagi:
- Użytkownik nie może samodzielnie ustawić `is_admin` (ustawiane wyłącznie przez service role / migracje).

---

### `public.collections`
Kolekcje użytkownika. Dla spójnej nawigacji systemowe byty „random” są tworzone **per użytkownik**.

- `id` uuid **PK** DEFAULT `gen_random_uuid()`
- `user_id` uuid **NOT NULL**, **FK** → `auth.users(id)` `ON DELETE CASCADE`
- `name` text **NOT NULL**
- `system_key` text **NOT NULL**  *(identyfikator bytów systemowych per user; np. `random_collection`)*
- `created_at` timestamptz **NOT NULL** DEFAULT now()
- `updated_at` timestamptz **NOT NULL** DEFAULT now()

Ograniczenia:
- `CHECK (btrim(name) <> '')`
- `CHECK (char_length(name) <= 120)`
- `CHECK (system_key IS NOT NULL OR system_key IN ('random_collection'))`
- `UNIQUE (user_id, name)` *(nazwy kolekcji unikalne per użytkownik)*
- `UNIQUE (id, user_id)` *(pod FK złożony w `topics`)*

---

### `public.topics`
Tematy wewnątrz kolekcji. Nazwa nieedytowalna w MVP; edytowalny jest tylko `description`.

- `id` uuid **PK** DEFAULT `gen_random_uuid()`
- `user_id` uuid **NOT NULL**
- `collection_id` uuid **NOT NULL**
- `name` text **NOT NULL**
- `description` text **NOT NULL** DEFAULT 'Example description.'  *(HTML/Markdown z WYSIWYG; przechowujemy tylko aktualny stan)*
- `system_key` text **NOT NULL** *(np. `random_topic`)*
- `created_at` timestamptz **NOT NULL** DEFAULT now()
- `updated_at` timestamptz **NOT NULL** DEFAULT now()

Klucze obce:
- **FK złożony** `(collection_id, user_id)` → `public.collections(id, user_id)` `ON DELETE CASCADE`

Ograniczenia:
- `CHECK (btrim(name) <> '')`
- `CHECK (char_length(name) <= 120)`
- `CHECK (char_length(description) <= 10000)` *(limit opisów; do korekty jeśli UX wymusi inaczej)*
- `CHECK (system_key IS NULL OR system_key IN ('random_topic'))`
- `UNIQUE (user_id, collection_id, name)` *(nazwy tematów unikalne w obrębie kolekcji dla usera)*
- `UNIQUE (id, user_id)` *(pod FK złożony w `flashcards`)*

---

### `public.flashcards`
Fiszki zawsze należą do tematu. Źródło jest niezmienne (`manual` vs `AI`). „Ulubione” to boolean na fiszce.

- `id` uuid **PK** DEFAULT `gen_random_uuid()`
- `user_id` uuid **NOT NULL**
- `topic_id` uuid **NOT NULL**
- `front` text **NOT NULL**  *(≤ 200 znaków)*
- `back` text **NOT NULL**   *(≤ 600 znaków)*
- `source` text **NOT NULL** *(enum/check: `manually_created` / `auto_generated`)*
- `is_favorite` boolean **NOT NULL** DEFAULT false
- `edited_by_user` boolean **NOT NULL** DEFAULT false
- `created_at` timestamptz **NOT NULL** DEFAULT now()
- `updated_at` timestamptz **NOT NULL** DEFAULT now()

Klucze obce:
- **FK złożony** `(topic_id, user_id)` → `public.topics(id, user_id)` `ON DELETE CASCADE`

Ograniczenia:
- `CHECK (btrim(front) <> '')`
- `CHECK (btrim(back) <> '')`
- `CHECK (char_length(front) <= 200)`
- `CHECK (char_length(back) <= 600)`
- `CHECK (source IN ('manually_created','auto_generated'))`

---

### `public.ai_generation_events`
Zdarzenia generacji AI do metryk (accept/reject), udziału AI oraz limitu dziennego. Zgodnie z ustaleniami limit liczymy tylko dla **udanych generacji** (po udanym response) — tj. statusy `accepted/rejected/skipped`. `failed` nie wchodzi do limitu.

- `id` uuid **PK** DEFAULT `gen_random_uuid()`
- `user_id` uuid **NOT NULL**, **FK** → `auth.users(id)` `ON DELETE CASCADE`
- `topic_id` uuid NULL, **FK** → `public.topics(id)` `ON DELETE SET NULL` *(żeby usunięcie tematu nie usuwało historii i nie obchodziło limitu)*
- `status` text **NOT NULL** *(enum/check: `accepted` / `rejected` / `skipped` / `failed`)*
- `is_random` boolean **NOT NULL** DEFAULT false
- `random_domain_label` text NULL *(opcjonalnie logowane dla analityki; lista domen pozostaje w backendzie)*
- `model` text NULL
- `prompt_tokens` integer NULL `CHECK (prompt_tokens >= 0)`
- `completion_tokens` integer NULL `CHECK (completion_tokens >= 0)`
- `latency_ms` integer NULL `CHECK (latency_ms >= 0)`
- `created_at` timestamptz **NOT NULL** DEFAULT now()
- `day_utc` date **GENERATED ALWAYS AS** `((created_at AT TIME ZONE 'UTC')::date)` **STORED**

Ograniczenia:
- `CHECK (status IN ('accepted','rejected','skipped','failed'))`

## 2. Relacje między tabelami

- **`auth.users` 1—1 `profiles`**
  - `profiles.id` ↔ `auth.users.id`

- **`profiles/auth.users` 1—N `collections`**
  - `collections.user_id` → `auth.users.id`

- **`collections` 1—N `topics`**
  - `(topics.collection_id, topics.user_id)` → `(collections.id, collections.user_id)` *(wymusza spójność właściciela)*

- **`topics` 1—N `flashcards`**
  - `(flashcards.topic_id, flashcards.user_id)` → `(topics.id, topics.user_id)` *(wymusza spójność właściciela)*

- **`auth.users` 1—N `ai_generation_events`**
  - `ai_generation_events.user_id` → `auth.users.id`
  - opcjonalnie: `ai_generation_events.topic_id` → `topics.id` *(NULL po usunięciu tematu)*

Kardynalności:
- `user` → `collections`: **jeden-do-wielu**
- `collection` → `topics`: **jeden-do-wielu**
- `topic` → `flashcards`: **jeden-do-wielu**
- `user` → `ai_generation_events`: **jeden-do-wielu**

Relacje wiele-do-wielu:
- Brak w MVP (ulubione są booleanem na fiszce).

## 3. Indeksy

### Indeksy podstawowe (MVP)
- `collections`
  - `UNIQUE (user_id, name)` *(zapewnia też indeks)*
  - **partial UNIQUE**: `UNIQUE (user_id, system_key) WHERE system_key IS NOT NULL`
  - dodatkowo (jeśli potrzebne do listowania): `INDEX (user_id, created_at DESC)`

- `topics`
  - `UNIQUE (user_id, collection_id, name)` *(zapewnia też indeks)*
  - **partial UNIQUE**: `UNIQUE (user_id, system_key) WHERE system_key IS NOT NULL`
  - `INDEX (collection_id, created_at DESC)`

- `flashcards`
  - `INDEX (topic_id, created_at DESC)` *(lista fiszek w temacie)*
  - `INDEX (user_id, is_favorite) WHERE is_favorite = true` *(dashboard losowych ulubionych)*
  - `INDEX (topic_id, is_favorite) WHERE is_favorite = true` *(filtr ulubionych w temacie)*
  - `INDEX (topic_id, source)` *(filtr manual/AI w temacie)*

- `ai_generation_events`
  - `INDEX (user_id, day_utc)` *(limit dzienny)*
  - **partial**: `INDEX (user_id, day_utc) WHERE status IN ('accepted','rejected','skipped')` *(jeszcze szybsze liczenie limitu)*
  - `INDEX (day_utc)` *(agregacje dzienne admina)*
  - `INDEX (is_random, day_utc)` *(opcjonalnie: metryki random vs non-random)*

### Wyszukiwanie (strict) — opcjonalny upgrade
W MVP można zacząć od `ILIKE` bez specjalnych indeksów. Jeśli wyszukiwanie po `front/back` zacznie być wolne:
- włączyć rozszerzenie `pg_trgm`
- dodać indeksy GIN trgm, np. na `flashcards(front)` i `flashcards(back)`

## 4. Zasady PostgreSQL (RLS, triggery, funkcje admina)

### RLS — izolacja danych per użytkownik
Włączyć RLS na: `profiles`, `collections`, `topics`, `flashcards`, `ai_generation_events`.

#### Polityki (MVP)
- `profiles`
  - **SELECT**: `id = auth.uid()`
  - **INSERT**: brak dla roli `authenticated` (tworzone przez trigger po rejestracji)
  - **UPDATE/DELETE**: brak dla roli `authenticated` (żeby użytkownik nie mógł zmienić `is_admin`)

- `collections`, `topics`, `flashcards`, `ai_generation_events`
  - **SELECT**: `user_id = auth.uid()`
  - **INSERT**: `user_id = auth.uid()`
  - **UPDATE**: `user_id = auth.uid()`
  - **DELETE**: `user_id = auth.uid()`

### Triggery / reguły niezmienności (MVP)
Zgodnie z wymaganiami MVP blokujemy zmianę nazw kolekcji i tematów oraz chronimy byty randomowe.

Rekomendowane triggery (BEFORE UPDATE/DELETE):
- `collections`
  - blokada `UPDATE` gdy zmienia się `name` lub `system_key`
  - blokada `DELETE` gdy `system_key IS NOT NULL` *(np. `random_collection`)*

- `topics`
  - blokada `UPDATE` gdy zmienia się `name` lub `system_key`
  - blokada `DELETE` gdy `system_key IS NOT NULL` *(np. `random_topic`)*

- `flashcards`
  - blokada `UPDATE` gdy zmienia się `source` *(niemodyfikowalne)*
  - trigger ustawiający `edited_by_user = true` gdy po INSERT zmieni się `front` i/lub `back`

- `updated_at`
  - wspólny trigger `set_updated_at()` ustawiający `updated_at = now()` dla tabel: `profiles`, `collections`, `topics`, `flashcards`

### Rejestracja — automatyczne tworzenie bytów systemowych per użytkownik
Trigger na `auth.users` (AFTER INSERT) powinien:
- utworzyć `public.profiles` dla nowego usera
- utworzyć systemową `collections` z `system_key = 'random_collection'` (nazwa UI, np. „Kolekcja losowa”)
- utworzyć systemowy `topics` z `system_key = 'random_topic'` w tej kolekcji (nazwa UI, np. „Temat losowy”)

### Admin — dostęp wyłącznie do metryk, bez wglądu w dane użytkowników
Zalecenie: **nie przyznawać adminom SELECT** do tabel user-content. Zamiast tego:
- przygotować funkcje **SECURITY DEFINER** zwracające wyłącznie agregaty, np.:
  - `public.get_admin_metrics_summary()`
  - `public.get_admin_metrics_daily(p_from date, p_to date)`
- funkcje powinny na wejściu sprawdzać `profiles.is_admin = true` (np. przez helper `public.is_admin()` jako SECURITY DEFINER) i w przeciwnym wypadku rzucać wyjątek.

## 5. Dodatkowe uwagi / wyjaśnienia decyzji projektowych

- **Spójność właściciela przez FK złożone**: `(collection_id, user_id)` i `(topic_id, user_id)` eliminują ryzyko „podpięcia” tematu/fiszki pod zasób innego użytkownika nawet przy błędach w logice aplikacji.
- **Eventy AI nie kaskadują po usunięciu tematu**: `topic_id` jest `NULL` po DELETE tematu, żeby użytkownik nie mógł obchodzić limitu dziennego przez usuwanie tematu oraz żeby zachować metryki produktu.
- **Random domeny nie w DB**: zgodnie z ustaleniami lista domen jest zaszyta w backendzie; do DB trafia tylko opcjonalny `random_domain_label` w eventach.
- **Strict search**: brak normalizacji diakrytyków i brak literówek jest zgodny z PRD; optymalizacje (`pg_trgm`) są odłożone jako opcjonalny upgrade.
- **Hard delete**: struktura FK wspiera kaskadowe usuwanie `collections → topics → flashcards`; eventy są niezależne od tematów (patrz wyżej).

