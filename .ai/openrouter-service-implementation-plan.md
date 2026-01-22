### 1. Opis usługi

Usługa **OpenRouterService** zapewnia jednolite, bezpieczne i testowalne API do wykonywania wywołań czatowych do **OpenRouter API** (kompatybilnego z formatem OpenAI Chat Completions) w celu zasilania czatów opartych na LLM w aplikacji opartej o **Astro 5 + TypeScript 5 + React 19**, z backendem w modelu BFF przez `src/pages/api`.

Główne cele:

- **Unifikacja wywołań**: jedno miejsce do budowy payloadu (system/user messages, model, parametry, `response_format`).
- **Bezpieczeństwo**: klucz API tylko po stronie serwera (Astro API routes), brak ekspozycji w przeglądarce.
- **Przewidywalność**: walidacja wejścia/wyjścia, retry/backoff dla błędów przejściowych, sensowne timeouty.
- **Strukturyzowane odpowiedzi**: wsparcie dla `response_format` w trybie `json_schema` (strict).

#### Kluczowe komponenty usługi (i ich cel)

1. **Konfiguracja i iniekcja zależności**
   - Cel: kontrola hosta, kluczy, nagłówków i timeoutów; łatwe testowanie (mock transportu).
2. **Budowanie żądania Chat Completions**
   - Cel: składanie wiadomości (system/user), wybór modelu, parametrów, oraz `response_format`.
3. **Warstwa transportowa HTTP**
   - Cel: wykonywanie requestów, obsługa timeoutów, mapowanie błędów, retry/backoff.
4. **Walidacja i normalizacja odpowiedzi**
   - Cel: bezpieczne parsowanie `content`, obsługa `json_schema`, weryfikacja kształtu danych.
5. **Warstwa bezpieczeństwa i zgodności**
   - Cel: minimalizacja wycieku danych, maskowanie sekretów w logach, ograniczanie prompt injection.
6. **Integracja z warstwą API Astro (BFF)**
   - Cel: endpointy w `src/pages/api/*` jako jedyne miejsce kontaktu UI z LLM.

---

### 2. Opis konstruktora

Rekomendowana lokalizacja: `src/lib/services/openrouter-service.ts`

Konstruktor powinien przyjmować konfigurowalne zależności, aby:

- nie uzależniać się od globalnych `process.env` w testach,
- ułatwić podmianę transportu (mock/fake),
- centralnie kontrolować politykę timeout/retry.

#### Proponowany kontrakt konstruktora (TypeScript)

- **`apiKey: string`**: klucz OpenRouter (np. z `process.env.OPENROUTER_API_KEY`).
- **`baseUrl?: string`**: domyślnie `https://openrouter.ai/api/v1`.
- **`defaultModel: string`**: np. `openai/gpt-4o-mini` albo inny wybrany model.
- **`defaultParams?: ModelParams`**: np. `temperature`, `top_p`, `max_tokens`, `seed`.
- **`timeoutMs?: number`**: np. 20–60s zależnie od UX.
- **`retry?: RetryPolicy`**: maks. próby, backoff, które błędy retryować.
- **`appMeta?: { referer?: string; title?: string }`**: nagłówki rekomendowane przez OpenRouter (`HTTP-Referer`, `X-Title`).
- **`fetchImpl?: typeof fetch`**: możliwość podmiany w testach.

W konstruktorze stosuj guard clauses:

- brak `apiKey` → błąd konfiguracyjny (fail fast),
- niepoprawne timeouty/retry → błąd walidacji konfiguracji.

---

### 3. Publiczne metody i pola

Poniższy zestaw metod pokrywa typowe potrzeby czatu i odpowiedzi strukturyzowanych.

#### Publiczne pola (readonly)

- **`baseUrl`**
- **`defaultModel`**
- **`defaultParams`**
- **`timeoutMs`**

#### Publiczne metody

1. **`createChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionOutput>`**
   - **Funkcjonalność**:
     - Buduje payload do endpointu `POST /chat/completions`.
     - Obsługuje:
       - wiadomości `system` i `user` (oraz opcjonalnie `assistant`),
       - `model`,
       - parametry modelu,
       - `response_format` (w tym `json_schema` strict),
       - mapowanie błędów i retry/backoff.
   - **Wyzwania**:
     1. Niejednoznaczność odpowiedzi (różne formaty `choices`, brak `content`).
     2. Błędy przejściowe (429/5xx) vs błędy stałe (401/400).
     3. Zbyt długie prompty / token limit.
     4. Kontrola kosztów i latencji.
   - **Rozwiązania (niezależne od technologii)**:
     1. Normalizacja odpowiedzi do jednego DTO i walidacja pól krytycznych.
     2. Retry tylko dla błędów przejściowych; pozostałe zwracaj od razu.
     3. Ograniczenia długości wejścia + komunikaty do użytkownika + ewentualne streszczenie kontekstu.
     4. Konfiguracja modelu i parametrów per przypadek użycia; limity `max_tokens`; telemetria.

2. **`createStructuredOutput<T>(input: StructuredOutputInput): Promise<T>`**
   - **Funkcjonalność**:
     - Wysyła żądanie z `response_format` typu `json_schema`.
     - Zwraca **już sparsowany** JSON (typ `T`) po walidacji.
   - **Wyzwania**:
     1. Model może zwrócić niepoprawny JSON mimo `strict`.
     2. Schemat może być zbyt restrykcyjny lub niekompletny.
   - **Rozwiązania**:
     1. Twarda walidacja JSON + fallback: ponowne zapytanie „napraw JSON zgodnie ze schematem” (jedna próba).
     2. Iteracyjne dopracowanie schematu; minimalizacja opcjonalności; testy kontraktowe na schemacie.

3. **`healthCheck(): Promise<{ ok: boolean; details?: string }>`**
   - **Funkcjonalność**:
     - Prosty ping (np. minimalny completion) do walidacji konfiguracji i łączności.
   - **Wyzwania**:
     1. Koszt i rate limit.
   - **Rozwiązania**:
     1. Minimalny prompt + tani model + cache wyniku przez krótki TTL.

---

### 4. Prywatne metody i pola

#### Prywatne pola

- **`apiKey`** (nigdy nie logować)
- **`fetchImpl`**
- **`retryPolicy`**
- **`appMetaHeaders`**

#### Prywatne metody

1. **`buildMessages(system?: string, user?: string, history?: ChatMessage[]): ChatMessage[]`**
   - Składa finalną listę wiadomości z kolejnością: `system` → `history` → `user`.
   - Stosuje trim/limity długości.

2. **`buildRequestBody(input: ChatCompletionInput): OpenRouterChatRequest`**
   - Spina:
     - `model`,
     - `messages`,
     - parametry modelu,
     - `response_format` (jeśli podano),
     - opcjonalne pola (np. `stream`, jeśli kiedyś dodasz).

3. **`request<T>(path: string, body: unknown): Promise<T>`**
   - Wysyła HTTP request z:
     - `Authorization: Bearer <OPENROUTER_API_KEY>`,
     - `Content-Type: application/json`,
     - opcjonalnie `HTTP-Referer`, `X-Title`.
   - Obsługuje timeout (AbortController), retry/backoff i mapowanie błędów.

4. **`parseAssistantContent(response: OpenRouterChatResponse): string`**
   - Wyciąga `choices[0].message.content`, waliduje typ.

5. **`safeJsonParse<T>(text: string): { ok: true; value: T } | { ok: false; error: string }`**
   - Bezpieczne parsowanie JSON i zwracanie diagnostyki.

6. **`mapError(e: unknown): OpenRouterServiceError`**
   - Jedno miejsce tłumaczenia wyjątków na spójne typy błędów.

---

### 5. Obsługa błędów

Obsługa błędów powinna być spójna w całej aplikacji (BFF w `src/pages/api` + UI). Rekomendacja: własne typy błędów + mapowanie na kody HTTP i komunikaty UI.

#### Potencjalne scenariusze błędów (numerowane)

1. **Brak konfiguracji** (np. `OPENROUTER_API_KEY` nie ustawiony).
2. **Błąd autoryzacji** (401/403) – nieprawidłowy klucz lub brak uprawnień.
3. **Rate limit / quota** (429) – limit zapytań lub budżetu.
4. **Błąd walidacji żądania** (400) – niepoprawny payload, schemat, parametry modelu.
5. **Błąd serwera dostawcy** (5xx) – przejściowa awaria po stronie OpenRouter/modelu.
6. **Timeout / przerwane połączenie** – długi czas odpowiedzi, problem sieciowy.
7. **Niepoprawna struktura odpowiedzi** – brak `choices`, brak `content`.
8. **Niepoprawny JSON przy `response_format`** – model zwrócił tekst niebędący JSON.
9. **Zbyt długi kontekst / token overflow** – model odrzuca request lub ucina odpowiedź.
10. **Wykryty prompt injection / niebezpieczna treść** – próba wyłudzenia sekretów / obejścia polityk.

#### Rekomendowana polityka reakcji

- **(1)** Fail fast na starcie serwera i w `healthCheck` + czytelny komunikat w logach (bez sekretów).
- **(2)** Zwróć błąd do API: 502/500 z bezpiecznym komunikatem; w logach tylko metadane.
- **(3)** Zwróć 429 do UI z sugestią ponowienia; opcjonalnie kolejkuj żądania.
- **(4)** 400 do klienta (UI) z informacją „nieprawidłowe dane”.
- **(5)** Retry z backoff (np. 2–3 próby), potem 502.
- **(6)** Timeout po `timeoutMs` + opcjonalnie 1 retry, potem 504.
- **(7)** 502 + alarm/telemetria.
- **(8)** Jedna próba „naprawy JSON” (re-prompt) lub błąd 502 zależnie od krytyczności.
- **(9)** Automatyczne skracanie historii (windowing) + komunikat „skróć zapytanie”.
- **(10)** Blokada/filtr + bezpieczna odpowiedź; nie przekazuj dalej sekretów ani instrukcji.

---

### 6. Kwestie bezpieczeństwa

- **Sekrety tylko po stronie serwera**: klucz OpenRouter trzymany w zmiennych środowiskowych (np. `OPENROUTER_API_KEY`) i używany wyłącznie w `src/pages/api/*`.
- **Brak logowania sekretów**: nigdy nie loguj nagłówka `Authorization` ani pełnych promptów, jeśli mogą zawierać PII.
- **Minimalizacja danych**: wysyłaj do LLM tylko to, co konieczne; rozważ anonimizację.
- **Ochrona przed prompt injection**:
  - system prompt powinien jasno zabraniać ujawniania sekretów i wykonywania instrukcji sprzecznych z polityką,
  - rozdzielaj dane „instrukcje” od „kontekstu użytkownika”,
  - waliduj i filtruj wejście (np. zakaz proszenia o klucze).
- **Rate limiting po stronie BFF**: ogranicz zapytania per użytkownik/IP (w middleware lub w API route).
- **CORS/CSRF**: endpointy API tylko dla własnej aplikacji; przy auth rozważ nagłówki i tokeny sesji (zgodnie z aktualnym podejściem projektu).
- **Timeouty i limity**: kontroluj `max_tokens`, długość wejścia, liczbę wiadomości.

---

### 7. Plan wdrożenia krok po kroku

#### Krok 1: Konfiguracja środowiska

- Dodaj do `.env.example` (i skonfiguruj w środowisku uruchomieniowym):
  - `OPENROUTER_API_KEY=...`
  - (opcjonalnie) `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
  - (opcjonalnie) `OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini`
  - (opcjonalnie) `OPENROUTER_TIMEOUT_MS=30000`
  - (opcjonalnie) `OPENROUTER_HTTP_REFERER=https://twoja-domena`
  - (opcjonalnie) `OPENROUTER_X_TITLE=10xFacts`

#### Krok 2: Typy i DTO

- Dodaj typy do `src/types.ts` (współdzielone):
  - `ChatRole = 'system' | 'user' | 'assistant'`
  - `ChatMessage { role: ChatRole; content: string }`
  - `ModelParams { temperature?: number; top_p?: number; max_tokens?: number; seed?: number; stop?: string[] }`
  - `ResponseFormatJsonSchema` zgodny z:
    - `{ type: 'json_schema', json_schema: { name: string, strict: true, schema: object } }`
  - `ChatCompletionInput` / `ChatCompletionOutput`
  - `StructuredOutputInput` (z `schemaName`, `schemaObject`)

#### Krok 3: Implementacja `OpenRouterService`

- Utwórz `src/lib/services/openrouter-service.ts`:
  - konstruktor z zależnościami (apiKey, baseUrl, fetch, retry, timeout),
  - `createChatCompletion`,
  - `createStructuredOutput<T>`,
  - prywatne helpery: budowa messages, request, parse, mapError.
- Ustal spójne błędy domenowe (np. `OpenRouterConfigError`, `OpenRouterHttpError`, `OpenRouterParseError`, `OpenRouterRateLimitError`).

#### Krok 4: Włączenie elementów wymaganych przez OpenRouter API (z przykładami)

1. **Komunikat systemowy** (przykłady)

- **Przykład 1 (bezpieczeństwo i format)**:
  - `system`: „Jesteś asystentem. Nigdy nie ujawniaj sekretów ani kluczy. Odpowiadaj zwięźle. Jeśli proszą o sekrety — odmów.”
- **Przykład 2 (zadaniowy, aplikacja edukacyjna)**:
  - `system`: „Pomagasz tworzyć fiszki. Dbaj o poprawność merytoryczną i krótkie odpowiedzi.”

2. **Komunikat użytkownika** (przykłady)

- **Przykład 1**:
  - `user`: „Wyjaśnij różnicę między REST i GraphQL w 5 punktach.”
- **Przykład 2 (z kontekstem)**:
  - `user`: „Na podstawie poniższych notatek wygeneruj 5 fiszek: <notatki>...</notatki>”

3. **Ustrukturyzowane odpowiedzi poprzez `response_format`** (przykłady)

Wzór (wymagany):

- `response_format: { type: 'json_schema', json_schema: { name: [schema-name], strict: true, schema: [schema-obj] } }`

**Przykład 1 (fiszki) — gotowy `response_format` do requestu**:

```ts
const response_format = {
  type: 'json_schema',
  json_schema: {
    name: 'flashcards_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['flashcards'],
      properties: {
        flashcards: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['front', 'back', 'tags'],
            properties: {
              front: { type: 'string', minLength: 1 },
              back: { type: 'string', minLength: 1 },
              tags: {
                type: 'array',
                items: { type: 'string' },
                default: [],
              },
            },
          },
        },
      },
    },
  },
} as const;
```

**Przykład 2 (klasyfikacja intencji) — gotowy `response_format` do requestu**:

```ts
const response_format = {
  type: 'json_schema',
  json_schema: {
    name: 'intent_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['intent', 'confidence'],
      properties: {
        intent: { type: 'string', enum: ['search', 'create', 'explain'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  },
} as const;
```

**Przykład 3 (pełny payload do `POST /chat/completions` z `system/user/model/params/response_format`)**:

```ts
const body = {
  model: 'openai/gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content:
        'Jesteś asystentem. Nigdy nie ujawniaj sekretów. Zwracaj wyłącznie JSON zgodny ze schematem response_format.',
    },
    {
      role: 'user',
      content:
        'Na podstawie notatek: "...", wygeneruj 3 fiszki. Każda fiszka: front/back/tags.',
    },
  ],
  // Parametry modelu (przykład dla deterministycznego JSON)
  temperature: 0,
  top_p: 1,
  max_tokens: 500,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcards_v1',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['flashcards'],
        properties: {
          flashcards: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['front', 'back', 'tags'],
              properties: {
                front: { type: 'string', minLength: 1 },
                back: { type: 'string', minLength: 1 },
                tags: { type: 'array', items: { type: 'string' }, default: [] },
              },
            },
          },
        },
      },
    },
  },
} as const;
```

Zasada implementacyjna:

- `createStructuredOutput<T>` powinno:
  - pobrać tekst z `choices[0].message.content`,
  - sparsować JSON,
  - zwalidować zgodność z oczekiwanym kształtem (przynajmniej minimalnie),
  - w razie błędu wykonać jedną próbę naprawy (opcjonalnie) albo zwrócić błąd.

4. **Nazwa modelu** (przykłady)

- **Przykład 1 (tani, szybki)**: `openai/gpt-4o-mini`
- **Przykład 2 (bardziej „mocny”)**: wybór modelu zgodnie z polityką koszt/latencja/jakość (konfigurowalne per use-case)

Zasada implementacyjna:

- `model` powinien być:
  - przekazywany jawnie w `ChatCompletionInput`, lub
  - brany z `defaultModel` w konstruktorze, jeśli nie podano.

5. **Parametry modelu** (przykłady)

- **Przykład 1 (deterministyczne JSON)**:
  - `temperature: 0`
  - `top_p: 1`
  - `max_tokens: 500`
- **Przykład 2 (kreatywne wyjaśnienia)**:
  - `temperature: 0.7`
  - `top_p: 0.9`
  - `max_tokens: 800`

Zasada implementacyjna:

- Parametry modelu powinny być scalane:
  - `finalParams = { ...defaultParams, ...input.params }`
  - a następnie walidowane (zakresy liczb, limity).

#### Krok 5: Endpointy API w Astro (BFF)

- Dodaj endpointy w `src/pages/api` (serwer):
  - np. `src/pages/api/ai/chat.ts` – zwraca odpowiedź tekstową,
  - np. `src/pages/api/ai/structured.ts` – zwraca JSON zgodny ze schematem.
- W endpointach:
  - waliduj request z UI (guard clauses),
  - pobieraj user/session (jeśli wymagane przez aplikację),
  - wywołuj `OpenRouterService`,
  - mapuj błędy na kody HTTP (400/401/429/502/504).

#### Krok 6: Integracja z UI (React)

- UI komunikuje się wyłącznie z własnym BFF (`/api/...`), nigdy bezpośrednio z OpenRouter.
- W hookach/services po stronie frontu:
  - obsłuż stany: loading/error/success,
  - pokazuj komunikaty użytkownikowi dla 429/504.

#### Krok 7: Testy i walidacja kontraktów

- Dodaj testy jednostkowe dla:
  - budowania messages,
  - scalania parametrów,
  - parsowania odpowiedzi,
  - `response_format` (schematy) – testy kontraktowe na przykładowych payloadach.
- Dodaj testy integracyjne (opcjonalnie) na endpointach API z mock transportu.

#### Krok 8: Observability i koszty

- Loguj metryki bez PII:
  - czas odpowiedzi, kody statusów, model, `max_tokens`/parametry (bez promptu),
  - identyfikator żądania (requestId) dla korelacji.
- Dodaj limity:
  - max długość promptu,
  - max liczba wiadomości historii,
  - rate limit per user/IP.

#### Krok 9: Deploy (CI/CD + hosting)

- Upewnij się, że zmienne środowiskowe są ustawione w środowisku uruchomieniowym (Docker/DigitalOcean).
- W pipeline CI:
  - lint + testy,
  - brak sekretów w repo (klucz tylko w secrets).
