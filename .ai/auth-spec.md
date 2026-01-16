# Specyfikacja techniczna (architektura): rejestracja, logowanie i odzyskiwanie hasła — 10xFacts

Dokument opisuje **architekturę** modułu auth (UI + backend + Supabase Auth) w repo `10xFacts`, zgodną z wymaganiami z `.ai/prd.md` oraz technologiami z `.ai/tech-stack.md`.

**Zakres**: rejestracja, logowanie, wylogowanie, odzyskiwanie hasła (reset).  
**Poza zakresem**: implementacja, UI “admin panel” (poza guardami), OAuth, MFA, produkcja (na razie dev-only).

---

## Założenia i kluczowe decyzje (potwierdzone)

- **Sesja SSR-friendly**: sesja ma działać w SSR i w endpointach API bez przechowywania tokenów w JS.
- **Brak email confirmation**: po rejestracji użytkownik może zostać zalogowany od razu (zależnie od ustawień Supabase).
- **Środowisko**: tylko dev (np. `http://localhost:3000`), bez dopracowania domeny produkcyjnej.
- **Osobne strony auth**: `/login`, `/register`, `/forgot-password`, `/reset-password` (oraz techniczna strona callback).

---

## Kontekst repo i ograniczenia kompatybilności

### Obecny stan (istotne dla architektury)

- Aplikacja działa w SSR: `astro.config.mjs` ma `output: "server"` + adapter Node.
- Middleware (`src/middleware/index.ts`) aktualnie tworzy `context.locals.supabase` na podstawie nagłówka `Authorization`.
- Endpointy `src/pages/api/v1/*` wymagają **Bearer token** (np. `requireUserId()` z `src/lib/http/api.ts`), i wyciągają użytkownika przez `supabase.auth.getUser(token)`.
- Frontend (np. `src/lib/services/dashboard-service.ts`) potrafi wysłać `Authorization: Bearer <token>`, ale domyślnie działa na mockach.

### Reguła repo (bardzo ważna)

W `.cursor/rules/supabase-auth.mdc` jest wymóg:
- **używać `@supabase/ssr`** (nie auth-helpers),
- do zarządzania cookies w adapterze Supabase stosować **wyłącznie** metody `getAll()` i `setAll()`.

**Wniosek**: implementacja sesji SSR musi być oparta o `createServerClient()` z `@supabase/ssr` i cookie-adapter `getAll/setAll` zintegrowany z Astro (`cookies`, `request.headers`).

### Cel kompatybilności

Nie naruszamy działania istniejących endpointów `/api/v1/*`:
- **nadal** akceptują Bearer token (dla kompatybilności / potencjalnych klientów).
- **dodatkowo** wspierają sesję cookie (SSR-friendly), aby frontend nie musiał ręcznie doklejać Authorization.

---

## 1) ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Routing i strony Astro (warstwa SSR)

#### Nowe strony (Astro)

- `src/pages/login.astro`
- `src/pages/register.astro`
- `src/pages/forgot-password.astro`
- `src/pages/reset-password.astro`
- `src/pages/auth/callback.astro` (techniczna obsługa linków Supabase: reset hasła / recovery; w praktyce “wymiana kodu na sesję”)

#### Strony chronione i publiczne

- **Chronione (wymagają zalogowania)**:
  - minimalnie: `/dashboard` (i docelowo wszystkie “aplikacyjne” sekcje: `/collections`, `/topics`, `/admin`).
- **Publiczne (bez zalogowania)**:
  - `/login`, `/register`, `/forgot-password`, `/auth/callback`.
- **Tylko dla niezalogowanych**:
  - `/login`, `/register`, `/forgot-password`, `/reset-password` (gdy user już zalogowany → przekierowanie).

#### Uwaga dot. strony `/`

Obecnie `src/pages/index.astro` renderuje “dashboard” client-side. Po włączeniu auth rekomenduję:
- **jeśli zalogowany** → redirect do `/dashboard`,
- **jeśli niezalogowany** → redirect do `/login`.

Jeżeli wolisz publiczny landing page, to `/` zostaje publiczne, a `/dashboard` jest chronione (wtedy należy usunąć obecne renderowanie dashboardu na `/`).

> Decyzja do potwierdzenia: czy `/` ma być landingiem publicznym, czy tylko przekierowaniem?

### 1.2. Layouty: auth vs non-auth

#### Nowy layout auth

- `src/layouts/AuthLayout.astro`
  - prosty shell: logo/nazwa + “card” na formularz,
  - brak nawigacji aplikacyjnej,
  - slot na komponent React z formularzem.

#### Layout aplikacyjny (zalogowany)

- `src/layouts/DashboardLayout.astro` pozostaje layoutem “app shell”.
- Rozszerzenie: SSR może przekazywać email użytkownika do `UserAvatarMenu`:
  - obecny komponent `src/components/navbar/UserAvatarMenu.tsx` już obsługuje `email?: string | null`.
- Zmiana UX: “Log out” w menu nie powinien być linkiem do `/login`, tylko akcją wylogowania.

### 1.3. Podział odpowiedzialności: Astro vs React

#### Astro (SSR + nawigacja + guardy)

- sprawdza sesję na serwerze (na podstawie `Astro.locals` ustawionych przez middleware),
- wykonuje przekierowania (302) zanim załaduje się UI:
  - chronione strony: do `/login?next=/...`,
  - strony auth: jeśli zalogowany, to do `next` albo `/dashboard`,
- renderuje layout (`AuthLayout` lub `DashboardLayout`) i osadza komponent React formularza.

#### React (interaktywność formularzy)

- trzyma stan pól i walidację client-side (UX),
- wywołuje endpointy auth (`/api/v1/auth/*`),
- obsługuje loading/error i finalny redirect (np. `window.location.href = next || '/dashboard'`).

### 1.4. Komponenty UI i moduły React (do dodania)

#### Komponenty formularzy (React)

- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`

Wspólne zasady:
- shadcn/ui (`Button`, `Input`, `Card`, itp.),
- blokada przycisku submit podczas requestu,
- czytelne błędy per pole + błąd globalny,
- autofocus na pierwszym polu, `aria-describedby` dla komunikatów.

#### Serwis klienta (frontend → backend)

- `src/lib/services/auth.service.ts`
  - `signup({ email, password })`
  - `login({ email, password })`
  - `logout()`
  - `requestPasswordReset({ email })`
  - `updatePassword({ password })`
  - (opcjonalnie) `getMe()` — jeśli chcesz odświeżać UI bez SSR.

Wariant SSR-cookie: serwis **nie zarządza tokenami** — cookies są ustawiane po stronie server endpoints.

### 1.5. Walidacja i komunikaty błędów (UI)

#### Walidacja client-side (pre-flight)

- Email:
  - wymagany,
  - format email (np. prosta walidacja HTML + ewentualnie zod na froncie).
- Hasło:
  - wymagane,
  - minimalna długość (rekomendacja: 8),
  - komunikat “hasło min. 8 znaków” (bez nadmiarowych reguł, o ile Supabase ich nie wymusza).
- Reset hasła:
  - `password` + `confirmPassword` muszą się zgadzać,
  - brak wysyłki przy niezgodności.

#### Mapowanie błędów (UX)

W UI rozróżniamy:
- **400 (walidacja)**: pokazujemy listę problemów i highlight pól.
- **401 (auth)**: “Nieprawidłowy e-mail lub hasło.” / “Sesja wygasła. Zaloguj się ponownie.”
- **409**: “Konto z tym adresem e-mail już istnieje.”
- **429**: “Zbyt wiele prób. Spróbuj ponownie później.”
- **500**: “Wystąpił błąd. Spróbuj ponownie.”

W reset-request (forgot password) UX powinien być “bezpieczny”:
- niezależnie od tego czy email istnieje: “Jeśli konto istnieje, wysłaliśmy link do resetu.”

### 1.6. Najważniejsze scenariusze (end-to-end)

#### Rejestracja (US-001)

1. `/register` (React `RegisterForm`) → `POST /api/v1/auth/signup`
2. Sukces:
   - jeśli Supabase zwróci sesję: redirect do `next || /dashboard`,
   - jeśli sesji brak (rzadziej, zależnie od konfiguracji): pokaż komunikat i przekieruj do `/login`.

#### Logowanie (US-002)

1. `/login` (React `LoginForm`) → `POST /api/v1/auth/login`
2. Sukces: redirect do `next || /dashboard`
3. Błąd: komunikat “Nieprawidłowy e-mail lub hasło.”

#### Wylogowanie (US-003)

1. Akcja w `UserAvatarMenu` → `POST /api/v1/auth/logout`
2. Sukces: redirect do `/login`

#### Forgot password

1. `/forgot-password` (React) → `POST /api/v1/auth/password/reset-request`
2. Sukces: komunikat “Sprawdź skrzynkę…”

#### Reset password (recovery)

1. Użytkownik klika link z emaila → trafia na `/auth/callback` z parametrami Supabase
2. `/auth/callback`:
   - wymienia parametry na sesję,
   - ustawia cookies (przez Supabase SSR client),
   - redirect do `/reset-password`
3. `/reset-password` (React) → `POST /api/v1/auth/password/update`
4. Sukces: redirect do `/login?reset=success`

---

## 2) LOGIKA BACKENDOWA

### 2.1. Endpointy API (Astro Server Endpoints)

Zgodnie z istniejącą strukturą `/api/v1/*` dodajemy:

- `src/pages/api/v1/auth/signup.ts` — `POST`
- `src/pages/api/v1/auth/login.ts` — `POST`
- `src/pages/api/v1/auth/logout.ts` — `POST`
- `src/pages/api/v1/auth/password/reset-request.ts` — `POST`
- `src/pages/api/v1/auth/password/update.ts` — `POST`
- (opcjonalnie) `src/pages/api/v1/auth/me.ts` — `GET`

Wszystkie endpointy:
- `export const prerender = false;`
- używają wspólnych helperów `json/jsonError/readJsonBody` z `src/lib/http/api.ts` (spójnie z resztą API).

### 2.2. Kontrakty (typy DTO) i pliki

Wykorzystujemy istniejące typy w `src/types/auth.ts`:
- `AuthSignupCommand`, `AuthLoginCommand`
- `AuthSignupResponseDto`, `AuthLoginResponseDto`, `AuthLogoutResponse`

Rozszerzamy (jeśli brak) w `src/types/auth.ts` o:
- `AuthPasswordResetRequestCommand` `{ email: string }`
- `AuthPasswordUpdateCommand` `{ password: string }`
- opcjonalnie `AuthMeResponseDto` `AuthUserDto`

### 2.3. Walidacja wejścia (Zod)

Dodajemy `src/lib/validation/auth.schemas.ts` analogicznie do `collections.schemas.ts`:
- `authSignupCommandSchema`
- `authLoginCommandSchema`
- `passwordResetRequestSchema`
- `passwordUpdateSchema`

Warto korzystać ze wspólnych helperów z `src/lib/validation/common.schemas.ts` (np. trim + długości), żeby utrzymać jednolity styl walidacji.

### 2.4. Obsługa wyjątków i mapowanie błędów

Zasady:
- walidacja → `400` z `issues[]`,
- auth błędny login → `401`,
- email już zajęty (sign-up) → `409`,
- “forgot password” zawsze `200` (nie ujawniamy kont),
- reszta → `500` z ogólnym komunikatem.

Logowanie po stronie serwera:
- `console.error(err)` tylko dla `500`,
- bez tokenów i danych wrażliwych w logach.

### 2.5. Aktualizacja sposobu renderowania stron (SSR)

Ponieważ SSR jest już włączony globalnie (`output: "server"`):
- strony auth i dashboard renderujemy server-side,
- redirecty realizujemy w warstwie Astro (guard) przed renderem UI.

W praktyce:
- w `*.astro` guard czyta `Astro.locals.auth` / `Astro.locals.user`,
- jeśli brak sesji: `return Astro.redirect('/login?next=...')`.

---

## 3) SYSTEM AUTENTYKACJI (Supabase Auth + Astro SSR)

### 3.1. Klient Supabase po stronie serwera (SSR + cookies)

#### Wymaganie

Zgodnie z regułą repo: używamy `@supabase/ssr` i implementujemy cookies adapter przez `getAll()` i `setAll()` (bez innych metod).

#### Proponowana struktura w `src/db/supabase.client.ts`

W tym pliku obecnie istnieje `createSupabaseClient({ authorization })` oparte o `createClient()` z `@supabase/supabase-js`.

Docelowo potrzebujemy dwóch wariantów:
- **server client** (SSR + cookies): `createSupabaseServerClient({ headers, cookies })` używający `createServerClient()` z `@supabase/ssr`.
- **plain client** (opcjonalnie): anon/utility (jak dziś) — przydatny w skryptach i miejscach bez cookies.

Istotne: `createSupabaseServerClient` powinien:
- pobierać cookies z nagłówka `Cookie` (parser),
- w `setAll` ustawiać cookies w odpowiedzi przez `Astro.cookies.set(...)`.

### 3.2. Middleware: sesja i locals

#### Cel middleware

W `src/middleware/index.ts` middleware powinien:
- stworzyć `locals.supabase` jako **server client** (SSR + cookies),
- wykonać `supabase.auth.getUser()` (bez tokenu) aby:
  - utrzymać spójny stan sesji,
  - (opcjonalnie) wypełnić `locals.auth` / `locals.user`.

#### Kontrakt `Astro.locals`

Aktualnie `src/env.d.ts` deklaruje tylko:
- `locals.supabase: SupabaseClient`.

Po wprowadzeniu auth SSR dodajemy (rekomendowane):
- `locals.auth?: { userId: string; email: string | null; isAuthenticated: boolean; isAdmin?: boolean }`

To pozwala:
- robić SSR guardy bez dodatkowych fetchy,
- SSR przekazywać email do `DashboardLayout`.

### 3.3. Zachowanie endpointów API: Bearer + cookies (kompatybilność)

#### Problem do rozwiązania

Obecne API oczekuje Bearer tokena w nagłówku, ale po wprowadzeniu cookie-sesji chcemy, aby:
- requesty z przeglądarki działały “same” (cookies),
- a starszy kontrakt Bearer dalej działał.

#### Rozwiązanie w helperze `requireUserId()`

W `src/lib/http/api.ts` helper `requireUserId(context)` powinien działać w kolejności:

1. Jeśli jest `Authorization: Bearer <token>` → `supabase.auth.getUser(token)` (jak dziś).
2. W przeciwnym razie → `supabase.auth.getUser()` (sesja z cookies).
3. Jeśli brak usera → `401`.

To zachowuje kompatybilność i jednocześnie umożliwia “cookie-first” działanie.

### 3.4. Rejestracja i automatyzacja danych po sign-up

W DB jest już migracja, która po utworzeniu usera w `auth.users` wykonuje trigger `public.handle_new_user()`:
- tworzy `public.profiles`,
- tworzy systemową kolekcję `random_collection` i temat `random_topic`.

Wniosek architektoniczny:
- endpoint `signup` nie musi nic dopisywać w DB domenowej — onboarding danych robi baza.

### 3.5. Reset hasła (dev-only)

Ponieważ robimy tylko dev:
- `redirectTo` w `resetPasswordForEmail` ustawiamy na `http://localhost:3000/auth/callback` (lub wartość z env, jeśli wolisz parametryzację).

Rekomendacja: dodać env typu `PUBLIC_APP_URL` / `APP_URL` (opcjonalnie) i opisać w `.env.example`, ale to decyzja implementacyjna.

### 3.6. Admin access (US-004) — kierunek (bez implementacji)

Źródło prawdy: `public.profiles.is_admin` (i funkcja `public.is_admin()` w migracji).

Architektonicznie:
- middleware lub guard strony `/admin` powinien sprawdzić `is_admin`,
- brak uprawnień:
  - SSR page: redirect do `/dashboard`,
  - API admin: `403`.

---

## Plan wdrożenia (high-level, bez implementacji)

1. Dodać `AuthLayout.astro` i strony auth (Astro) z SSR guardami.
2. Dodać React formularze auth + `auth.service.ts`.
3. Dodać endpointy `/api/v1/auth/*` z walidacją Zod i mapowaniem błędów.
4. Rozszerzyć `src/db/supabase.client.ts` o server client na `@supabase/ssr`.
5. Zaktualizować middleware (`src/middleware/index.ts`) tak, by `locals.supabase` działał w SSR-cookie.
6. Zaktualizować `requireUserId()` pod “Bearer OR cookies”.
7. Zaktualizować `UserAvatarMenu` (akcja logout) i SSR przekazanie email w `DashboardLayout`.
8. Ustalić zachowanie `/` (redirect vs landing) i dostosować `src/pages/index.astro`.

---

## Pytanie do Ciebie (jedno, żeby domknąć architekturę)

Co ma się dziać na `/` po włączeniu auth?
- A) redirect: niezalogowany → `/login`, zalogowany → `/dashboard` (najprościej dla MVP)
- B) publiczny landing (bez dashboardu), a `/dashboard` to start po loginie

