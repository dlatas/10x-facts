# Plan implementacji widoku Kolekcje (lista)

## 1. Przegląd

Widok **Kolekcje (lista)** pod ścieżką `/collections` prezentuje **pełną listę kolekcji** zalogowanego użytkownika (w tym zawsze widoczną **systemową „Random”**), umożliwia **wyszukiwanie po nazwie (strict)**, **utworzenie kolekcji** oraz **usunięcie kolekcji** (z potwierdzeniem i ostrzeżeniem o kaskadzie). Z listy użytkownik może przejść do widoku tematów w wybranej kolekcji.

Zakres MVP zgodny z PRD:

- brak zmiany nazw kolekcji (UI nie pokazuje opcji edycji nazwy),
- usuwanie jest hard delete i wymaga ostrzeżenia o konsekwencjach (kaskada: tematy + fiszki),
- systemowej kolekcji nie da się usunąć (UI blokuje akcję, a API zwraca `403`).

## 2. Routing widoku

- **Ścieżka:** `/collections`
- **Plik strony (Astro):** `src/pages/collections.astro`
- **Layout:** `AppLayout` (`src/layouts/AppLayout.astro`)
- **Zabezpieczenie:** wymagane zalogowanie (spójnie z `src/pages/dashboard.astro`):
  - jeśli `!Astro.locals.auth?.isAuthenticated` → redirect do `/login`
- **Integracja React:** osadzenie komponentu-klienta przez `client:load` (lub `client:visible` jeśli chcemy opóźnić JS, ale w tym widoku interakcje są kluczowe).

## 3. Struktura komponentów

```text
src/pages/collections.astro (SSR auth check + wrapper layout)
└── AppLayout (Layout)
    └── CollectionsClient (React Container - data fetching + state)
        ├── CollectionsToolbar (search + create)
        │   ├── CollectionsSearchInput
        │   └── CreateCollectionButton / CreateCollectionDialog (form)
        ├── CollectionsList (list)
        │   └── CollectionRow (item)
        │       ├── SystemBadge (dla system_key != null)
        │       ├── GoToTopicsLink (nawigacja)
        │       └── DeleteCollectionButton (tylko nie-systemowe)
        ├── DeleteCollectionConfirmDialog (confirm destructive)
        └── CollectionsListState (loading/empty/error)
```

## 4. Szczegóły komponentów

### `CollectionsClient` (Container)

- **Opis komponentu:** Główny kontener widoku. Odpowiada za pobieranie listy kolekcji, synchronizację `q` z URL, obsługę tworzenia i usuwania oraz invalidację/odświeżenie danych.
- **Główne elementy:** główny `div` (wrapper), `CollectionsToolbar`, `CollectionsListState`, `CollectionsList`, `DeleteCollectionConfirmDialog`.
- **Obsługiwane zdarzenia:**
  - mount → pobranie listy kolekcji,
  - zmiana `q` → aktualizacja URL + refetch,
  - `onCreateCollectionSubmit(name)` → `POST /api/v1/collections`,
  - `onRequestDelete(collection)` → otwarcie confirm,
  - `onConfirmDelete(collectionId)` → `DELETE /api/v1/collections/{collectionId}` + odświeżenie listy,
  - `onRetry()` → ponowienie pobrania listy.
- **Warunki walidacji (frontend, zgodnie z API i UX):**
  - tworzenie: nazwa **niepusta** po `trim()`,
  - (opcjonalnie, zgodnie z kontraktem walidacji w planie API) nazwa max **120 znaków** → błąd inline i blokada submit,
  - brak UI dla zmiany nazwy kolekcji (US-011).
- **Typy (DTO i ViewModel):**
  - DTO: `CollectionDto`, `CollectionsListResponseDto`, `CreateCollectionCommand`, `CreateCollectionResponseDto`, `DeleteCollectionResponseDto`
  - VM: `CollectionsListItemVm`, `CollectionsViewState` (opis w sekcji 5)
- **Propsy:** brak (komponent top-level).

### `CollectionsToolbar`

- **Opis komponentu:** Pasek narzędzi na górze widoku: wyszukiwarka i CTA do utworzenia kolekcji.
- **Główne elementy:** `div`/`header`, `CollectionsSearchInput`, przycisk „Utwórz kolekcję”.
- **Obsługiwane zdarzenia:**
  - `onSearchChange(value)` (aktualizacja `q`),
  - `onCreateClick()` (otwarcie dialogu / przełączenie trybu inline).
- **Warunki walidacji:**
  - brak (walidacja dotyczy formularza create).
- **Typy:** `CollectionsToolbarProps` (opis w sekcji 5).
- **Propsy:**
  - `query: string`
  - `onQueryChange: (q: string) => void`
  - `onCreateClick: () => void`
  - `isBusy?: boolean` (opcjonalnie do disabled podczas mutacji)

### `CollectionsSearchInput`

- **Opis komponentu:** Pole wyszukiwania po nazwie kolekcji (strict). Trzyma wartość kontrolowaną, a aktualizację URL/refetch wykonuje z debounce.
- **Główne elementy:** `Input` (Shadcn), opcjonalnie ikona lupy i przycisk „Wyczyść”.
- **Obsługiwane zdarzenia:**
  - `onChange` → aktualizacja stanu lokalnego inputa,
  - `onClear` → ustawienie `''`,
  - (opcjonalnie) `onKeyDown` Enter → natychmiastowe „commit” query (bez czekania na debounce).
- **Warunki walidacji:**
  - brak (to filtr, nie pole wymagane).
- **Typy:** `CollectionsSearchInputProps`.
- **Propsy:**
  - `value: string`
  - `onValueChange: (v: string) => void`
  - `placeholder?: string`

### `CreateCollectionDialog` (lub wariant inline)

- **Opis komponentu:** Formularz utworzenia kolekcji. Dopuszczalne dwa warianty zgodnie z UI planem: przycisk + dialog lub inline. Preferowane: **Dialog** (czytelniejsze w widoku listy).
- **Główne elementy:** `Dialog`, `DialogContent`, `Input`, przyciski: „Utwórz” (primary) + „Anuluj”.
- **Obsługiwane zdarzenia:**
  - open/close dialog,
  - submit form,
  - `Esc`/klik w tło → zamknięcie (jeśli nie trwa request),
  - `Enter` w polu → submit.
- **Warunki walidacji (zgodne z API):**
  - `name.trim().length > 0` (w przeciwnym razie błąd inline),
  - `name.trim().length <= 120` (opcjonalnie, ale zalecane dla szybszego feedbacku),
  - błąd `409` → komunikat inline „Nazwa zajęta”.
- **Typy:** `CreateCollectionDialogProps`, `CreateCollectionFormState`.
- **Propsy:**
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmit: (name: string) => Promise<void>`
  - `isSubmitting: boolean`
  - `errorMessage: string | null` (np. po `409` lub `400`)

### `CollectionsList`

- **Opis komponentu:** Renderuje listę kolekcji (wraz z oznaczeniem systemowej). Każdy wiersz ma akcję wejścia do tematów oraz (dla nie-systemowych) usuwanie.
- **Główne elementy:** `ul`/`div` (lista), mapowanie `CollectionRow`.
- **Obsługiwane zdarzenia:**
  - klik w „Tematy” → nawigacja do `/collections/{collectionId}/topics`,
  - klik w „Usuń” → delegacja do kontenera (open confirm).
- **Warunki walidacji:**
  - jeśli `system_key != null` → brak przycisku usuwania, zamiast tego tooltip/tekst „Nieusuwalna”.
- **Typy:** `CollectionsListProps`, `CollectionsListItemVm[]`.
- **Propsy:**
  - `items: CollectionsListItemVm[]`
  - `onDeleteRequest: (item: CollectionsListItemVm) => void`

### `CollectionRow`

- **Opis komponentu:** Pojedynczy element listy: nazwa, badge systemowy, CTA do tematów, akcja usunięcia (jeśli dozwolona).
- **Główne elementy:** `Card`/`div` (Shadcn `Card`), `Button` link „Tematy”, `Button` destructive „Usuń”.
- **Obsługiwane zdarzenia:**
  - `onGoToTopics` (link),
  - `onDeleteClick`.
- **Warunki walidacji:**
  - blokada delete dla systemowej (`isSystem=true`).
- **Typy:** `CollectionRowProps`.
- **Propsy:**
  - `item: CollectionsListItemVm`
  - `onDeleteRequest: (item: CollectionsListItemVm) => void`

### `DeleteCollectionConfirmDialog`

- **Opis komponentu:** Confirm dialog (destructive) przed usunięciem kolekcji. Musi komunikować kaskadowe usunięcie tematów i fiszek (US-034).
- **Główne elementy:** `Dialog`, treść ostrzeżenia, przyciski „Usuń” (destructive) i „Anuluj”.
- **Obsługiwane zdarzenia:**
  - confirm → wywołanie mutacji delete,
  - cancel/close.
- **Warunki walidacji:**
  - jeśli `isSystem=true` → dialog w ogóle nie powinien się otworzyć (UI blokuje akcję wcześniej).
- **Typy:** `DeleteCollectionConfirmDialogProps`.
- **Propsy:**
  - `open: boolean`
  - `collectionName: string | null`
  - `onConfirm: () => Promise<void>`
  - `onOpenChange: (open: boolean) => void`
  - `isDeleting: boolean`

### `CollectionsListState`

- **Opis komponentu:** Spójne stany listy: loading, error, empty.
- **Główne elementy:** skeleton loader / komunikat błędu + „Spróbuj ponownie” / empty-state.
- **Obsługiwane zdarzenia:** `onRetry()`.
- **Typy:** `CollectionsListStateProps`.
- **Propsy:**
  - `status: 'loading' | 'error' | 'ready'`
  - `isEmpty: boolean`
  - `errorMessage?: string | null`
  - `onRetry: () => void`

## 5. Typy

### Typy DTO (już istnieją w `src/types/collections.ts`)

- `CollectionDto`
- `CollectionsListQuery`
- `CollectionsListResponseDto`
- `CreateCollectionCommand`
- `CreateCollectionResponseDto`
- `DeleteCollectionResponseDto`

### Nowe typy ViewModel (rekomendowane do dodania dla czytelności UI)

```ts
export interface CollectionsListItemVm {
  id: string;
  name: string;
  systemKey: string | null;
  isSystem: boolean; // derived: systemKey != null
  createdAt: string;
  updatedAt: string;
}

export interface CollectionsViewState {
  // URL-driven
  q: string;
  limit: number;
  offset: number;

  // UI state
  createDialogOpen: boolean;
  createNameDraft: string;
  createError: string | null; // np. 409

  deleteDialogOpen: boolean;
  deleteTarget: CollectionsListItemVm | null;
}

export interface CollectionsToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onCreateClick: () => void;
  isBusy?: boolean;
}

export interface CollectionsListProps {
  items: CollectionsListItemVm[];
  onDeleteRequest: (item: CollectionsListItemVm) => void;
}
```

Uwagi:

- `systemKey` mapujemy bezpośrednio z `CollectionDto.system_key`.
- `isSystem` to wyłącznie pochodna dla logiki UI (disable/hide delete, badge).

## 6. Zarządzanie stanem

Widok powinien łączyć:

- **Stan URL (source of truth dla filtrowania/paginacji):**
  - `q` (wyszukiwanie)
  - opcjonalnie `limit`, `offset` (paginacja)
- **Stan UI lokalny (modale i formularze):**
  - `createDialogOpen`, `createNameDraft`, `createError`
  - `deleteDialogOpen`, `deleteTarget`

Rekomendowana implementacja:

- React Query (`@tanstack/react-query`) dla:
  - `useQuery` listy kolekcji,
  - `useMutation` create/delete,
  - invalidacji listy po mutacjach.
- Custom hook `useCollectionsView()` (lub `useCollectionsList()`) enkapsuluje:
  - odczyt `q` z `window.location.search`,
  - debounce aktualizacji `q`,
  - mapowanie DTO → VM,
  - mutacje create/delete i obsługę błędów.

Synchronizacja `q` (strict) z URL:

- przy wpisywaniu: aktualizuj stan inputa natychmiast,
- po krótkim debounce (np. 250–400ms) ustaw `?q=...` w URL (History API) i odpal refetch,
- przy `q=''`: usuń parametr z URL (czytelny link).

## 7. Integracja API

### Endpointy

1. **Lista kolekcji**
   - `GET /api/v1/collections`
   - Query: `q`, `limit`, `offset`, `sort`, `order`
   - Response: `CollectionsListResponseDto` (`{ items: CollectionDto[]; total: number }`)

2. **Utworzenie kolekcji**
   - `POST /api/v1/collections`
   - Body: `CreateCollectionCommand` (`{ name: string }`)
   - Success: `201` → `CreateCollectionResponseDto` (`CollectionDto`)
   - Errors: `400` (walidacja), `409` (unikalność nazwy)

3. **Usunięcie kolekcji**
   - `DELETE /api/v1/collections/{collectionId}`
   - Success: `200` → `DeleteCollectionResponseDto` (`{ ok: true }`)
   - Errors: `401`, `403` (systemowa), `404`

### Warstwa serwisowa po stronie UI

Aby zachować spójność z istniejącym `createDashboardService` (`src/lib/services/dashboard-service.ts`), zalecane jest utworzenie analogicznego serwisu:

- **Plik:** `src/lib/services/collections-view.service.ts`
- Funkcje:
  - `getCollections(query: CollectionsListQuery): Promise<CollectionsListResponseDto>`
  - `createCollection(command: CreateCollectionCommand): Promise<CreateCollectionResponseDto>`
  - `deleteCollection(collectionId: string): Promise<DeleteCollectionResponseDto>`
- Obsługa błędów:
  - własny `HttpError` z `status` (tak jak w dashboard-service),
  - mapowanie `409` → komunikat „Nazwa zajęta” (inline),
  - `401` → inicjowanie globalnego redirectu (patrz sekcja 10).
- (Opcjonalnie) tryb mock:
  - flaga `PUBLIC_COLLECTIONS_API_MOCK` analogicznie do `PUBLIC_DASHBOARD_API_MOCK`,
  - mock musi uwzględniać systemową kolekcję `system_key='random_collection'`.

## 8. Interakcje użytkownika

1. **Wejście na `/collections`**
   - jeśli brak sesji → redirect `/login`,
   - w trakcie pobierania listy → skeleton/loader,
   - po sukcesie → render listy.

2. **Wyszukiwanie kolekcji**
   - użytkownik wpisuje w pole wyszukiwania,
   - po debounce UI aktualizuje URL (`?q=...`) i odświeża listę,
   - wyszukiwanie strict: brak normalizacji diakrytyków, brak „fuzzy”.

3. **Utworzenie kolekcji**
   - klik „Utwórz kolekcję” → otwarcie dialogu,
   - wpisanie nazwy → walidacja inline (pusta / za długa),
   - submit → disable przycisków i inputa, spinner,
   - sukces → zamknięcie dialogu, reset formularza, toast „Utworzono kolekcję”, invalidacja listy,
   - `409` → komunikat inline „Kolekcja o tej nazwie już istnieje” + zachowanie wpisanej wartości.

4. **Wejście do tematów**
   - klik w CTA (np. „Tematy”) przy kolekcji → nawigacja do `/collections/{collectionId}/topics`.

5. **Usunięcie kolekcji**
   - klik „Usuń” przy kolekcji (nie-systemowej) → confirm dialog,
   - confirm → mutacja `DELETE`, disable akcji,
   - sukces → toast „Usunięto kolekcję”, invalidacja listy,
   - `404` → toast „Nie znaleziono kolekcji” + invalidacja listy,
   - próba usunięcia systemowej:
     - UI nie pokazuje akcji i informuje „Nieusuwalna”,
     - jeśli mimo wszystko dojdzie do requestu i API zwróci `403` → toast „Nie można usunąć kolekcji systemowej.”

## 9. Warunki i walidacja

### Warunki wynikające z API/PRD i jak je weryfikować w UI

- **Wymagana sesja (`401`)**
  - warstwa strony `.astro` blokuje wejście bez sesji,
  - warstwa fetch/serwisu obsługuje `401` (np. wymusza przejście do `/login`).

- **Kolekcja systemowa (`system_key != null`)**
  - `CollectionRow`:
    - pokazuje badge „Systemowa / Random”,
    - ukrywa/wyłącza `Delete` i daje czytelne wyjaśnienie (tooltip/tekst).
  - `DeleteCollectionConfirmDialog` nie może otworzyć się dla `isSystem=true`.

- **Strict search**
  - UI nie stosuje normalizacji wejścia (nie zamienia „ł” na „l” itp.),
  - frontend przekazuje `q` 1:1 do API.

- **Create collection**
  - `name.trim().length > 0` → inaczej blokada submit + błąd inline,
  - (zalecane) `name.trim().length <= 120` → błąd inline,
  - `409` → błąd inline „Nazwa zajęta”.

- **Brak zmiany nazwy (US-011)**
  - w całym widoku nie ma akcji typu rename/edit.

## 10. Obsługa błędów

### Scenariusze błędów i reakcje UI

- **`401` (brak sesji / wygasła)**
  - na wejściu: redirect w `src/pages/collections.astro`,
  - podczas działania: w serwisie HTTP wykrycie `status===401` i przekierowanie do `/login` (lub sygnał do wyższego poziomu, który zrobi redirect).

- **`500` list/create/delete**
  - lista: komponent stanu błędu z przyciskiem „Spróbuj ponownie”,
  - create/delete: toast + utrzymanie stanu formularza/modalu (żeby użytkownik mógł ponowić).

- **`409` create**
  - błąd inline w dialogu tworzenia: „Kolekcja o tej nazwie już istnieje.”

- **`403` delete (systemowa)**
  - UI nie pokazuje akcji; jeśli dojdzie do requestu → toast i odświeżenie listy.

- **`404` delete**
  - toast „Nie znaleziono kolekcji” + invalidacja listy.

## 11. Kroki implementacji

1. **Routing strony**
   - Utwórz `src/pages/collections.astro`:
     - sprawdź `Astro.locals.auth?.isAuthenticated` i w razie braku zrób redirect `/login`,
     - użyj `AppLayout`,
     - osadź `CollectionsClient client:load`.

2. **Serwis UI dla kolekcji**
   - Dodaj `src/lib/services/collections-view.service.ts` wzorując się na `src/lib/services/dashboard-service.ts`:
     - `fetchJson` + `HttpError`,
     - metody: list/create/delete,
     - (opcjonalnie) mock mode z env `PUBLIC_COLLECTIONS_API_MOCK`.

3. **Hook widoku**
   - Dodaj `src/components/hooks/useCollectionsView.ts`:
     - odczyt `q` z URL,
     - debounce aktualizacji URL,
     - `useQuery` dla listy (`GET /api/v1/collections`),
     - `useMutation` dla create/delete,
     - invalidacja query po create/delete.

4. **Komponenty prezentacyjne**
   - Dodaj folder `src/components/collections/` i komponenty:
     - `CollectionsToolbar`, `CollectionsSearchInput`,
     - `CollectionsList`, `CollectionRow`, `SystemBadge`,
     - `CreateCollectionDialog`,
     - `DeleteCollectionConfirmDialog`,
     - `CollectionsListState`.

5. **Spójność UX/A11y**
   - Dialogi w oparciu o shadcn (`Dialog`) z focus trap i `Esc`,
   - przy mutacjach: disabled elementów + czytelny stan „w toku”,
   - potwierdzenie usuwania zawiera ostrzeżenie o kaskadzie (tematy + fiszki).

6. **Obsługa przypadków brzegowych**
   - Brak wyników wyszukiwania → empty-state „Brak kolekcji spełniających kryteria” + akcja „Wyczyść filtr”,
   - Systemowa kolekcja zawsze widoczna (API zapewnia przez `ensureRandomCollectionForUser`, UI jedynie poprawnie oznacza `system_key`).

7. **Finalne spięcie i weryfikacja**
   - Sprawdź:
     - `q` działa strict i jest w URL,
     - create: walidacja + `409` inline,
     - delete: confirm + brak delete dla systemowej + obsługa `403/404`,
     - poprawne linkowanie do `/collections/{collectionId}/topics`.
