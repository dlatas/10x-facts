# API (REST) — 10xFacts

Poniżej lista aktualnie dostępnych endpointów API w tym repo.  
W Astro ścieżka URL wynika bezpośrednio z położenia pliku w `src/pages/api/**`.

## Mapowanie plik → URL
- `src/pages/api/v1/ai/generate.ts` → `POST /api/v1/ai/generate`
- `src/pages/api/v1/ai/accept.ts` → `POST /api/v1/ai/accept`
- `src/pages/api/v1/ai/reject.ts` → `POST /api/v1/ai/reject`
- `src/pages/api/v1/ai/skip.ts` → `POST /api/v1/ai/skip`

## Wymagania wspólne
- **Auth**: wymagany nagłówek `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- **Content-Type**: `application/json`
- **Konfiguracja AI**: wymagane `OPENROUTER_API_KEY`

## POST `/api/v1/ai/generate`
Generuje dokładnie jedną propozycję fiszki dla podanego tematu.

**Body**
```json
{ "topic_id": "uuid" }
```

**200**
```json
{
  "proposal": { "front": "…", "back": "…" },
  "limit": { "remaining": 4, "reset_at_utc": "2026-01-16T00:00:00.000Z" },
  "is_random": false
}
```

**Błędy**
- `400` niepoprawne body / JSON
- `401` brak/niepoprawny JWT
- `404` temat nie istnieje / brak dostępu (RLS)
- `429` przekroczony limit dzienny decyzji (liczony po eventach)
- `502` błąd upstream OpenRouter

## POST `/api/v1/ai/accept`
Akceptuje propozycję: tworzy fiszkę `source='auto_generated'` oraz zapisuje event `accepted`.

**Body**
```json
{
  "topic_id": "uuid",
  "front": "string (<=200)",
  "back": "string (<=600)",
  "is_random": false,
  "random_domain_label": null
}
```

Uwaga: `is_random` jest traktowane jako telemetria i **jest wyliczane po stronie serwera** z `topics.system_key`.

**201**
```json
{ "flashcard_id": "uuid", "event_id": "uuid" }
```

**Błędy**
- `400` niepoprawne body / JSON
- `401` brak/niepoprawny JWT
- `404` temat nie istnieje / brak dostępu (RLS)
- `500` błąd tworzenia fiszki lub zapisu eventu (z best-effort rollback)

## POST `/api/v1/ai/reject`
Odrzuca propozycję: zapisuje event `rejected`.

**Body**
```json
{
  "topic_id": "uuid",
  "is_random": false,
  "random_domain_label": null
}
```

Uwaga: `is_random` jest traktowane jako telemetria i **jest wyliczane po stronie serwera** z `topics.system_key`.

**201**
```json
{ "event_id": "uuid" }
```

**Błędy**
- `400` niepoprawne body / JSON
- `401` brak/niepoprawny JWT
- `404` temat nie istnieje / brak dostępu (RLS)
- `500` błąd zapisu eventu

## POST `/api/v1/ai/skip`
Pomija propozycję: zapisuje event `skipped`.

**Body**
```json
{
  "topic_id": "uuid",
  "is_random": false,
  "random_domain_label": null
}
```

Uwaga: `is_random` jest traktowane jako telemetria i **jest wyliczane po stronie serwera** z `topics.system_key`.

**201**
```json
{ "event_id": "uuid" }
```

**Błędy**
- `400` niepoprawne body / JSON
- `401` brak/niepoprawny JWT
- `404` temat nie istnieje / brak dostępu (RLS)
- `500` błąd zapisu eventu
