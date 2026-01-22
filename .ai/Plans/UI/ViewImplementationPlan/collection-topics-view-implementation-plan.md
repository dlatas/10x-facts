# Plan implementacji widoku Tematy w kolekcji (lista)

## 1. Przegląd

Widok **Tematy w kolekcji (lista)** pod ścieżką `/collections/:collectionId/topics` prezentuje **listę tematów** w wybranej kolekcji, umożliwia **wyszukiwanie po nazwie (strict)**, **utworzenie nowego tematu** oraz (opcjonalnie) **usunięcie tematu** z potwierdzeniem i ostrzeżeniem o kaskadowym usunięciu fiszek. Z poziomu listy użytkownik może przejść do:

- edycji opisu tematu: `/topics/:topicId` (opis read-only nazwy + edycja opisu),
- sekcji fiszek w temacie: `/topics/:topicId` (fiszki są wyświetlane pod spodem na tej samej stronie; opis edytowany w modalu).

Zakres MVP zgodny z PRD:

- brak zmiany nazwy tematu (UI nie pokazuje opcji edycji nazwy),
- usuwanie tematu jest hard delete i wymaga ostrzeżenia o konsekwencjach (kaskada: fiszki),
- tematu systemowego (np. `system_key="random_topic"`) nie da się usunąć (UI blokuje akcję, a API zwraca `403`),
- jeśli kolekcja nie istnieje / nie należy do użytkownika: `404` → redirect do `/collections` + komunikat.

## 2. Routing widoku

- **Ścieżka:** `/collections/:collectionId/topics`
- **Plik strony (Astro):** `src/pages/collections/[collectionId]/topics.astro`
- **Layout:** `AppLayout` (`src/layouts/AppLayout.astro`)
- **Zabezpieczenie:** wymagane zalogowanie (spójnie z `src/pages/dashboard.astro`):
  - jeśli `!Astro.locals.auth?.isAuthenticated` → redirect do `/login`
- **Integracja React:** osadzenie komponentu-klienta przez `client:load`.

Uwagi dot. nazwy kolekcji (z UI planu: „z kontekstu nawigacyjnego”):

- Ponieważ API nie udostępnia dedykowanego `GET /api/v1/collections/{collectionId}`, widok powinien czytać nazwę kolekcji z **kontekstu nawigacyjnego**:
  - rekomendacja: przekazuj `collectionName` w query string podczas nawigacji z `/collections`, np. `/collections/{id}/topics?collectionName=Historia`.
  - fallback: gdy brak `collectionName` (wejście „z palca”) pokaż neutralny nagłówek „Tematy” + (opcjonalnie) skrócone `collectionId`.

## 3. Struktura komponentów

```text
src/pages/collections/[collectionId]/topics.astro (SSR auth check + wrapper layout)
└── AppLayout (Layout)
    └── CollectionTopicsClient (React Container - data fetching + state)
        ├── CollectionTopicsHeader (nazwa kolekcji + opis)
        ├── CollectionTopicsToolbar (search + create)
        │   ├── TopicsSearchInput
        │   └── CreateTopicButton / CreateTopicDialog (form)
        ├── TopicsListState (loading/empty/error)
        ├── TopicsList (list)
        │   └── TopicRow (item)
        │       ├── SystemBadge (dla system_key != null)
        │       ├── GoToTopicDescriptionLink (→ /topics/:topicId)
        │       ├── GoToTopicFlashcardsLink (→ /topics/:topicId, sekcja Fiszki)
        │       └── DeleteTopicButton (tylko nie-systemowe; opcjonalnie)
        └── DeleteTopicConfirmDialog (confirm destructive)
```

## 4. Szczegóły komponentów

### `CollectionTopicsClient` (Container)

- **Opis komponentu:** Główny kontener widoku. Odpowiada za pobieranie listy tematów w kolekcji, synchronizację `q` z URL, obsługę tworzenia tematu oraz (opcjonalnie) usuwania tematu.
- **Główne elementy:** wrapper `div`, `CollectionTopicsHeader`, `CollectionTopicsToolbar`, `TopicsListState`, `TopicsList`, `DeleteTopicConfirmDialog`.
- **Obsługiwane zdarzenia:**
  - mount → pobranie listy tematów (`GET /api/v1/collections/{collectionId}/topics`),
  - zmiana `q` → aktualizacja URL + refetch,
  - `onCreateTopicSubmit(name)` → `POST /api/v1/collections/{collectionId}/topics`,
  - `onRequestDelete(topic)` → otwarcie confirm (jeśli delete jest włączone w UI),
  - `onConfirmDelete(topicId)` → `DELETE /api/v1/topics/{topicId}` + odświeżenie listy,
  - `onRetry()` → ponowienie pobrania listy.
- **Warunki walidacji (frontend, zgodnie z API i UX):**
  - tworzenie: nazwa **niepusta** po `trim()`,
  - tworzenie: nazwa max **120 znaków** (zalecane jako szybki feedback),
  - brak UI do zmiany nazwy tematu (US-011),
  - blokada delete dla tematów systemowych (`system_key != null`).
- **Typy (DTO i ViewModel):**
  - DTO: `TopicDto`, `TopicsListResponseDto`, `CreateTopicCommand`, `CreateTopicResponseDto`, `DeleteTopicResponseDto`
  - VM: `TopicsListItemVm`, `CollectionTopicsViewState` (sekcja 5)
- **Propsy:** brak (komponent top-level).

### `CollectionTopicsHeader`

- **Opis komponentu:** Nagłówek widoku: nazwa kolekcji + krótki opis. Nazwa jest pobierana z kontekstu nawigacyjnego (`collectionName` w URL) lub fallback.
- **Główne elementy:** `h1`, `p` (opis), opcjonalnie link „Wróć do kolekcji”.
- **Obsługiwane zdarzenia:** brak (opcjonalnie `onBack`).
- **Warunki walidacji:** brak.
- **Typy:** `CollectionTopicsHeaderProps`.
- **Propsy:**
  - `collectionName: string | null`
  - `collectionId: string`

### `CollectionTopicsToolbar`

- **Opis komponentu:** Pasek narzędzi na górze widoku: wyszukiwarka i CTA do utworzenia tematu.
- **Główne elementy:** `div`/`header`, `TopicsSearchInput`, przycisk „Utwórz temat”.
- **Obsługiwane zdarzenia:**
  - `onSearchChange(value)` (aktualizacja `q`),
  - `onCreateClick()` (otwarcie dialogu / przełączenie trybu inline).
- **Warunki walidacji:** brak (walidacja dotyczy formularza create).
- **Typy:** `CollectionTopicsToolbarProps`.
- **Propsy:**
  - `query: string`
  - `onQueryChange: (q: string) => void`
  - `onCreateClick: () => void`
  - `isBusy?: boolean`

### `TopicsSearchInput`

- **Opis komponentu:** Pole wyszukiwania po nazwie tematu (strict). Wartość kontrolowana; aktualizację URL/refetch wykonuje z debounce.
- **Główne elementy:** `Input` (Shadcn), opcjonalnie ikona lupy i przycisk „Wyczyść”.
- **Obsługiwane zdarzenia:**
  - `onChange` → aktualizacja stanu lokalnego inputa,
  - `onClear` → ustawienie `''`,
  - (opcjonalnie) `Enter` → natychmiastowe „commit” query.
- **Warunki walidacji:** brak (to filtr).
- **Typy:** `TopicsSearchInputProps`.
- **Propsy:**
  - `value: string`
  - `onValueChange: (v: string) => void`
  - `placeholder?: string`

### `CreateTopicDialog` (lub wariant inline)

- **Opis komponentu:** Formularz utworzenia tematu w bieżącej kolekcji. Minimalny MVP: tylko pole `name`. `description` nie jest wymagane na tym etapie (można uzupełnić w widoku `/topics/:topicId`).
- **Główne elementy:** `Dialog`, `DialogContent`, `Input`, przyciski: „Utwórz” + „Anuluj”.
- **Obsługiwane zdarzenia:**
  - open/close dialog,
  - submit form,
  - `Esc`/klik w tło → zamknięcie (jeśli nie trwa request),
  - `Enter` w polu → submit.
- **Warunki walidacji (zgodne z API):**
  - `name.trim().length > 0` (w przeciwnym razie błąd inline),
  - `name.trim().length <= 120` (zalecane),
  - błąd `409` → komunikat inline „Temat o tej nazwie już istnieje w tej kolekcji.”
- **Typy:** `CreateTopicDialogProps`, `CreateTopicFormState`.
- **Propsy:**
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmit: (name: string) => Promise<void>`
  - `isSubmitting: boolean`
  - `errorMessage: string | null` (np. po `409` lub `400`)

### `TopicsList`

- **Opis komponentu:** Renderuje listę tematów w kolekcji wraz z oznaczeniem tematu systemowego oraz akcjami na wierszu.
- **Główne elementy:** `ul`/`div` (lista), mapowanie `TopicRow`.
- **Obsługiwane zdarzenia:**
  - klik „Opis tematu” → `/topics/{topicId}`,
  - klik „Fiszki” → `/topics/{topicId}/flashcards`,
  - klik „Usuń” → delegacja do kontenera (open confirm) (opcjonalnie).
- **Warunki walidacji:**
  - jeśli `system_key != null` → brak przycisku usuwania, zamiast tego tooltip/tekst „Nieusuwalny (systemowy)”.
- **Typy:** `TopicsListProps`, `TopicsListItemVm[]`.
- **Propsy:**
  - `items: TopicsListItemVm[]`
  - `onDeleteRequest?: (item: TopicsListItemVm) => void`

### `TopicRow`

- **Opis komponentu:** Pojedynczy element listy: nazwa, badge systemowy, CTA „Opis tematu” i „Fiszki”, opcjonalna akcja „Usuń”.
- **Główne elementy:** `Card`/`div`, `Button` linki, `Button` destructive „Usuń” (tylko jeśli dozwolone).
- **Obsługiwane zdarzenia:**
  - `onGoToDescription` (link),
  - `onGoToFlashcards` (link),
  - `onDeleteClick` (opcjonalnie).
- **Warunki walidacji:**
  - blokada delete dla systemowego (`isSystem=true`).
- **Typy:** `TopicRowProps`.
- **Propsy:**
  - `item: TopicsListItemVm`
  - `onDeleteRequest?: (item: TopicsListItemVm) => void`
  - `collectionNameForContext?: string | null` (opcjonalnie do przekazania dalej w URL)

### `DeleteTopicConfirmDialog` (opcjonalnie)

- **Opis komponentu:** Confirm dialog (destructive) przed usunięciem tematu. Musi komunikować kaskadowe usunięcie fiszek (US-033).
- **Główne elementy:** `Dialog`, treść ostrzeżenia, przyciski „Usuń” i „Anuluj”.
- **Obsługiwane zdarzenia:**
  - confirm → wywołanie mutacji delete,
  - cancel/close.
- **Warunki walidacji:**
  - jeśli `isSystem=true` → dialog nie może się otworzyć (UI blokuje akcję wcześniej).
- **Typy:** `DeleteTopicConfirmDialogProps`.
- **Propsy:**
  - `open: boolean`
  - `topicName: string | null`
  - `onConfirm: () => Promise<void>`
  - `onOpenChange: (open: boolean) => void`
  - `isDeleting: boolean`

### `TopicsListState`

- **Opis komponentu:** Stany listy: loading, error, empty.
- **Główne elementy:** skeleton loader / komunikat błędu + „Spróbuj ponownie” / empty-state.
- **Obsługiwane zdarzenia:** `onRetry()`.
- **Typy:** `TopicsListStateProps`.
- **Propsy:**
  - `status: 'loading' | 'error' | 'ready'`
  - `isEmpty: boolean`
  - `errorMessage?: string | null`
  - `onRetry: () => void`

## 5. Typy

### Typy DTO (już istnieją w `src/types/topics.ts`)

- `TopicDto`
- `TopicsListQuery`
- `TopicsListResponseDto`
- `CreateTopicCommand`
- `CreateTopicResponseDto`
- `DeleteTopicResponseDto`

### Nowe typy ViewModel (rekomendowane do dodania dla czytelności UI)

```ts
export interface TopicsListItemVm {
  id: string;
  name: string;
  description: string | null;
  systemKey: string | null;
  isSystem: boolean; // derived: systemKey != null
  createdAt: string;
  updatedAt: string;
}

export interface CollectionTopicsViewState {
  // route param
  collectionId: string;

  // URL-driven
  q: string;
  limit: number;
  offset: number;

  // navigation context
  collectionName: string | null;

  // UI state
  createDialogOpen: boolean;
  createNameDraft: string;
  createError: string | null; // np. 409

  deleteDialogOpen: boolean;
  deleteTarget: TopicsListItemVm | null;
}

export interface CollectionTopicsHeaderProps {
  collectionId: string;
  collectionName: string | null;
}

export interface CollectionTopicsToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onCreateClick: () => void;
  isBusy?: boolean;
}

export interface TopicsListProps {
  items: TopicsListItemVm[];
  onDeleteRequest?: (item: TopicsListItemVm) => void;
}
```

Uwagi:

- `description` jest w DTO i może się przydać później (np. preview), ale w tym widoku można jej nie renderować.
- `systemKey` mapujemy bezpośrednio z `TopicDto.system_key`, `isSystem` jest pochodną na potrzeby UI.

## 6. Zarządzanie stanem

Widok łączy:

- **Stan URL (source of truth dla filtrowania/paginacji):**
  - `q` (wyszukiwanie)
  - opcjonalnie `limit`, `offset`
- **Stan UI lokalny (modale i formularze):**
  - `createDialogOpen`, `createNameDraft`, `createError`
  - `deleteDialogOpen`, `deleteTarget`
- **Kontekst nawigacyjny (nazwa kolekcji):**
  - `collectionName` z parametru `collectionName` w URL (lub fallback)

Rekomendowana implementacja (spójna z podejściem w `useDashboardData`):

- Custom hook `useCollectionTopicsData()` z `useState`/`useEffect`:
  - pobiera listę tematów,
  - refetchuje po zmianie `collectionId` lub „committed” `q`,
  - po `create`/`delete` robi `refreshTopics()`.
- Debounce `q` (np. 250–400ms) przed aktualizacją URL i refetch.

Opcjonalnie (jeśli w projekcie zostanie dodany provider React Query): przenieść pobieranie/mutacje do `@tanstack/react-query` z invalidacją query po mutacjach.

## 7. Integracja API

### Endpointy

1. **Lista tematów w kolekcji**
   - `GET /api/v1/collections/{collectionId}/topics`
   - Query: `q`, `limit`, `offset`, `sort`, `order`
   - Response: `TopicsListResponseDto` (`{ items: TopicDto[]; total: number }`)
   - Errors: `401`, `404`

2. **Utworzenie tematu w kolekcji**
   - `POST /api/v1/collections/{collectionId}/topics`
   - Body: `CreateTopicCommand` (`{ name: string; description?: string }`)
   - Success: `201` → `CreateTopicResponseDto` (`TopicDto`)
   - Errors: `400`, `409`, `404`

3. **Usunięcie tematu** (opcjonalnie z poziomu listy)
   - `DELETE /api/v1/topics/{topicId}`
   - Success: `200` → `DeleteTopicResponseDto` (`{ ok: true }`)
   - Errors: `401`, `403` (temat systemowy), `404`

### Warstwa serwisowa po stronie UI

Dla spójności z `createDashboardService`, zalecane jest utworzenie serwisu:

- **Plik:** `src/lib/services/collection-topics-view.service.ts`
- Funkcje:
  - `getTopicsInCollection(collectionId: string, query: TopicsListQuery): Promise<TopicsListResponseDto>`
  - `createTopic(collectionId: string, command: CreateTopicCommand): Promise<CreateTopicResponseDto>`
  - `deleteTopic(topicId: string): Promise<DeleteTopicResponseDto>`
- Obsługa błędów:
  - własny `HttpError` z `status`,
  - mapowanie `409` → komunikat inline w formularzu,
  - `404` dla listy lub create → sygnał do redirectu do `/collections`.

## 8. Interakcje użytkownika

1. **Wejście na `/collections/:collectionId/topics`**
   - jeśli brak sesji → redirect `/login`,
   - w trakcie pobierania listy → skeleton,
   - po sukcesie → lista tematów.

2. **Wyszukiwanie tematów**
   - użytkownik wpisuje w wyszukiwarkę,
   - po debounce UI aktualizuje URL (`?q=...`) i odświeża listę,
   - wyszukiwanie strict: UI nie normalizuje diakrytyków i nie stosuje fuzzy matching.

3. **Utworzenie tematu**
   - klik „Utwórz temat” → dialog,
   - wpisanie nazwy → walidacja inline (pusta / za długa),
   - submit → disabled input/CTA,
   - sukces → zamknięcie dialogu, reset formularza, odświeżenie listy,
   - `409` → komunikat inline, zachowanie wpisanej wartości.

4. **Przejście do opisu tematu**
   - klik „Opis tematu” → przejście na `/topics/:topicId` (opcjonalnie z przekazaniem `collectionName` w URL, np. `?fromCollectionName=...`).

5. **Przejście do fiszek tematu**
   - klik „Fiszki” → `/topics/:topicId` (sekcja fiszek na stronie tematu).

6. **Usunięcie tematu (opcjonalnie)**
   - klik „Usuń” → confirm dialog z ostrzeżeniem o usunięciu wszystkich fiszek,
   - sukces → odświeżenie listy,
   - temat systemowy:
     - UI nie pokazuje akcji (i/lub pokazuje „Nieusuwalny”),
     - jeśli API zwróci `403` → komunikat o braku możliwości usunięcia.

## 9. Warunki i walidacja

### Warunki wynikające z API/PRD i jak je weryfikować w UI

- **Wymagana sesja (`401`)**
  - warstwa strony `.astro` blokuje wejście bez sesji,
  - warstwa serwisu UI wykrywa `401` w trakcie działania i inicjuje przejście do `/login`.

- **Kolekcja nie istnieje lub nie należy do usera (`404` na liście/create)**
  - po wykryciu `404` w `getTopicsInCollection` lub `createTopic`:
    - redirect do `/collections`,
    - pokazanie komunikatu (toast/alert/inline banner) „Nie znaleziono kolekcji.”

- **Temat systemowy (`system_key != null`)**
  - `TopicRow`:
    - pokazuje badge „Systemowy”,
    - ukrywa/wyłącza delete i daje wyjaśnienie,
  - confirm dialog nie może się otworzyć dla `isSystem=true`.

- **Tworzenie tematu (US-008)**
  - `name.trim().length > 0` → inaczej blokada submit + błąd inline,
  - `name.trim().length <= 120` → błąd inline,
  - `409` → błąd inline „Temat o tej nazwie już istnieje w tej kolekcji.”

- **Brak zmiany nazwy (US-011)**
  - w całym widoku nie ma akcji typu rename/edit.

## 10. Obsługa błędów

### Scenariusze błędów i reakcje UI

- **`401` (brak sesji / wygasła)**
  - na wejściu: redirect w `src/pages/collections/[collectionId]/topics.astro`,
  - podczas działania: serwis/handler wykrywa `status===401` → `window.location.assign('/login')`.

- **`404` (kolekcja nie istnieje / brak dostępu)**
  - redirect do `/collections`,
  - komunikat dla użytkownika (rekomendacja: toast; jeśli brak infrastruktury toastów — tymczasowo inline banner lub `alert`).

- **`409` create**
  - błąd inline w dialogu tworzenia: „Temat o tej nazwie już istnieje w tej kolekcji.”

- **`403` delete (temat systemowy)**
  - UI nie pokazuje akcji; jeśli dojdzie do requestu → komunikat „Nie można usunąć tematu systemowego.”

- **`500` list/create/delete**
  - lista: komponent stanu błędu z „Spróbuj ponownie”,
  - create/delete: komunikat + pozostawienie dialogu otwartego (żeby dało się ponowić).

## 11. Kroki implementacji

1. **Routing strony**
   - Utwórz `src/pages/collections/[collectionId]/topics.astro`:
     - sprawdź `Astro.locals.auth?.isAuthenticated` i w razie braku zrób redirect `/login`,
     - użyj `AppLayout`,
     - osadź `CollectionTopicsClient client:load`.

2. **Serwis UI dla tematów w kolekcji**
   - Dodaj `src/lib/services/collection-topics-view.service.ts`:
     - `fetchJson` + `HttpError` (wzorzec jak w `dashboard-service.ts`),
     - metody: list/create/delete (delete opcjonalnie, jeśli UI ma udostępniać usuwanie),
     - mapuj `409` i `404` na czytelne komunikaty.

3. **Hook widoku**
   - Dodaj `src/components/hooks/useCollectionTopicsData.ts`:
     - odczyt `collectionId` z propsów,
     - odczyt `q` i `collectionName` z URL,
     - debounce aktualizacji URL dla `q`,
     - funkcje: `refreshTopics`, `createTopic`, `deleteTopic`.

4. **Komponenty prezentacyjne**
   - Dodaj folder `src/components/collection-topics/` i komponenty:
     - `CollectionTopicsClient`, `CollectionTopicsHeader`,
     - `CollectionTopicsToolbar`, `TopicsSearchInput`,
     - `TopicsList`, `TopicRow`, `SystemBadge`,
     - `CreateTopicDialog`,
     - `DeleteTopicConfirmDialog` (jeśli usuwanie jest w scope),
     - `TopicsListState`.

5. **Spójność UX/A11y**
   - Dialogi w oparciu o shadcn (`Dialog`) z focus trap i `Esc`,
   - przy mutacjach: disabled elementów + czytelny stan „w toku”,
   - obsługa `404` jako bezpieczny redirect do `/collections`.

6. **Integracja z widokiem kolekcji**
   - W linku z `/collections` do `/collections/{id}/topics` dodaj przekazanie `collectionName` (np. query string), aby spełnić wymaganie „nazwa kolekcji z kontekstu”.

7. **Finalne spięcie i weryfikacja**
   - Sprawdź:
     - listowanie tematów i `q` (strict) działa i jest w URL,
     - create: walidacja + `409` inline,
     - `404` → redirect do `/collections`,
     - blokada delete tematu systemowego (`system_key != null`) i obsługa `403`,
     - link do `/topics/:topicId` działa (opis w modalu, fiszki pod spodem).
