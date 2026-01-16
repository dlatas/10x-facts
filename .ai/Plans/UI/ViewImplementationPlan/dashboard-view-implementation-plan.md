# Plan implementacji widoku Dashboard

## 1. Przegląd
Widok Dashboard (`/dashboard`) jest głównym punktem wejścia dla zalogowanego użytkownika. Pełni dwie funkcje:
1. Szybka nawigacja do kolekcji (pasek boczny) z możliwością szybkiego dodawania nowych.
2. Odkrywanie treści poprzez wyświetlenie siatki 6 losowych ulubionych fiszek z całego konta użytkownika ("Błysnąć ciekawostką").

Interakcja z fiszkami odbywa się w modalu, bez przeładowania strony.

## 2. Routing widoku
- **Ścieżka:** `/dashboard`
- **Plik:** `src/pages/dashboard.astro`
- **Zabezpieczenie:** Wymagana sesja użytkownika (przekierowanie do `/login` w przypadku braku sesji – obsługiwane przez middleware lub logikę SSR).

## 3. Struktura komponentów

```text
src/pages/dashboard.astro (Astro Page - SSR Auth check & layout wrapper)
└── DashboardLayout (Layout)
    └── DashboardClient (React Container - Data fetching & State)
        ├── DashboardSidebar (Component)
        │   ├── CollectionList (Component - List of collections)
        │   │   └── CollectionItem (Component)
        │   └── CreateCollectionInline (Component - Input form)
        ├── RandomFavoritesGrid (Component - Main content)
        │   └── FlashcardPreviewCard (Component - Clickable card)
        └── FlashcardDetailsDialog (Component - Shadcn Dialog)
            └── FlashcardContent (Component - Front/Back/Metadata)
```

## 4. Szczegóły komponentów

### `DashboardClient` (Container)
- **Opis:** Główny kontener logiki biznesowej. Pobiera dane (kolekcje, losowe fiszki) przy montowaniu. Zarządza stanem otwartego modalu i listy kolekcji.
- **Główne elementy:** `div` (kontener layoutu grid/flex), `DashboardSidebar`, `RandomFavoritesGrid`, `FlashcardDetailsDialog`.
- **Obsługiwane interakcje:**
  - Otwieranie/zamykanie modalu fiszki.
  - Odświeżanie listy kolekcji po dodaniu nowej.
- **Typy:** `DashboardData` (agregat kolekcji i fiszek).

### `DashboardSidebar`
- **Opis:** Pasek boczny wyświetlający listę kolekcji i umożliwiający dodanie nowej.
- **Główne elementy:** `aside`, lista `ul`, przycisk "Wszystkie kolekcje".
- **Propsy:**
  - `collections: CollectionDto[]`
  - `onCollectionCreate: (name: string) => Promise<void>`
  - `isLoading: boolean`

### `CreateCollectionInline`
- **Opis:** Komponent formularza inline. Początkowo przycisk "+", po kliknięciu zamienia się w `Input` + przycisk zatwierdzenia (Enter).
- **Główne elementy:** `Button` (Shadcn), `Input` (Shadcn).
- **Obsługiwane interakcje:**
  - Kliknięcie startuje edycję.
  - `Enter` zatwierdza.
  - `Esc` lub blur anuluje.
- **Walidacja:** Niepusta nazwa kolekcji.

### `RandomFavoritesGrid`
- **Opis:** Siatka wyświetlająca losowe ulubione fiszki.
- **Główne elementy:** Grid CSS (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Propsy:**
  - `flashcards: FavoriteFlashcardDto[]`
  - `onCardClick: (flashcard: FavoriteFlashcardDto) => void`
  - `loading: boolean`

### `FlashcardPreviewCard`
- **Opis:** Karta prezentująca skrót fiszki (tytuł - Front).
- **Główne elementy:** `Card` (Shadcn), `CardHeader`, `CardTitle`.
- **Styl:** Hover effects, cursor pointer.
- **Propsy:** `flashcard: FavoriteFlashcardDto`.

### `FlashcardDetailsDialog`
- **Opis:** Modal wyświetlający pełną treść fiszki.
- **Główne elementy:** `Dialog` (Shadcn), `DialogContent`, `DialogHeader`, `DialogTitle` (Front), `DialogDescription` (Back).
- **Obsługiwane interakcje:** Zamknięcie przez `Esc` lub kliknięcie poza obszar.
- **Propsy:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `flashcard: FavoriteFlashcardDto | null`

## 5. Typy

Wykorzystujemy typy z `src/types.ts` oraz definiujemy pomocnicze.

```typescript
// Importowane z src/types.ts
import type { CollectionDto, FavoriteFlashcardDto, CreateCollectionCommand } from '@/types';

// ViewModel dla stanu Dashboardu
export interface DashboardState {
  collections: CollectionDto[];
  randomFavorites: FavoriteFlashcardDto[];
  isLoading: boolean;
  error: string | null;
}

// Prosty typ dla propsów modalu
export interface FlashcardDetailsProps {
  flashcard: FavoriteFlashcardDto;
  // W przyszłości można rozszerzyć o nazwę tematu, jeśli API to zwróci
}
```

## 6. Zarządzanie stanem

Stan będzie zarządzany lokalnie w `DashboardClient` za pomocą `useState` i `useEffect` (lub biblioteki typu React Query, jeśli zostanie wprowadzona w projekcie - na potrzeby MVP wystarczy `useEffect`).

- `collections`: tablica kolekcji.
- `favorites`: tablica losowych fiszek.
- `selectedFlashcard`: aktualnie wyświetlana fiszka w modalu (lub `null`).
- `isModalOpen`: boolean.

Można wydzielić custom hook `useDashboardData()`:
- Zwraca: `{ collections, favorites, isLoading, refreshCollections, refreshFavorites, createCollection }`.
- Obsługuje logikę mockowania vs real API.

## 7. Integracja API

Ze względu na brak gotowego backendu, należy stworzyć warstwę serwisową z obsługą "Mock Mode".

**Plik:** `src/lib/services/dashboard-service.ts`

1.  **Pobranie kolekcji:**
    -   Metoda: `getCollections(limit: number = 6)`
    -   Endpoint: `GET /api/v1/collections`
    -   Mock: Zwraca tablicę statycznych obiektów `CollectionDto`.

2.  **Pobranie losowych ulubionych:**
    -   Metoda: `getRandomFavorites(limit: number = 6)`
    -   Endpoint: `GET /api/v1/flashcards/favorites/random?limit=6`
    -   Mock: Zwraca tablicę statycznych obiektów `FavoriteFlashcardDto`.

3.  **Utworzenie kolekcji:**
    -   Metoda: `createCollection(command: CreateCollectionCommand)`
    -   Endpoint: `POST /api/v1/collections`
    -   Mock: Symuluje opóźnienie i zwraca nowy obiekt `CollectionDto`.

## 8. Interakcje użytkownika

1.  **Wejście na stronę:** Loader -> Wyświetlenie layoutu.
2.  **Dodawanie kolekcji:**
    -   Użytkownik klika "+" w sidebarze.
    -   Pojawia się input.
    -   Użytkownik wpisuje nazwę i wciska Enter.
    -   UI pokazuje stan ładowania (np. disable inputu).
    -   Po sukcesie, nowa kolekcja pojawia się na liście, input znika/czyści się.
3.  **Podgląd fiszki:**
    -   Użytkownik klika w kartę fiszki na gridzie.
    -   Otwiera się modal (`Dialog`).
    -   Focus trap wewnątrz modalu.
    -   Użytkownik widzi Przód (pytanie) i Tył (odpowiedź).
    -   Zamknięcie przez Esc lub kliknięcie w tło.

## 9. Warunki i walidacja

-   **Limit kolekcji w sidebarze:** Wyświetlamy max 6 (wg `ui-plan.md` "up to 6 pinned/recent"). Reszta dostępna pod linkiem "Wszystkie".
-   **Tworzenie kolekcji:** Nazwa nie może być pusta.
-   **Kolekcja losowa:** Jest zawsze przypięta/widoczna (zgodnie z PRD), nie można jej usunąć (walidacja backend, ale UI nie powinno dawać opcji usuwania w tym widoku).
-   **Brak ulubionych:** Jeśli API zwróci pustą listę ulubionych, wyświetlić "Empty State" zachęcający do dodania fiszek do ulubionych.

## 10. Obsługa błędów

-   **Błąd pobierania danych:** Wyświetlenie komunikatu "Nie udało się załadować danych" z przyciskiem "Spróbuj ponownie".
-   **Błąd tworzenia kolekcji:** Toast (np. z `sonner` lub prosty alert) z informacją o błędzie. Zachowanie inputu z wpisaną treścią, aby użytkownik nie musiał pisać od nowa.
-   **401 Unauthorized:** Przekierowanie do logowania (obsłużone globalnie lub w `fetch` wrapperze).

## 11. Kroki implementacji

1.  **Przygotowanie serwisu:**
    -   Utworzenie `src/lib/services/dashboard-service.ts`.
    -   Implementacja funkcji `getCollections`, `getRandomFavorites`, `createCollection` z wykorzystaniem `setTimeout` i mock danych zgodnych z `src/types.ts`.
2.  **Stworzenie komponentów UI (Dumb Components):**
    -   `FlashcardPreviewCard` (bazując na Shadcn Card).
    -   `FlashcardDetailsDialog` (bazując na Shadcn Dialog).
    -   `CreateCollectionInline` (bazując na Shadcn Input + Button).
3.  **Stworzenie kontenera strony:**
    -   `DashboardClient.tsx` z logiką pobierania danych (useDashboardData).
    -   Implementacja layoutu (Sidebar + Main Grid).
4.  **Integracja z Astro:**
    -   Utworzenie `src/pages/dashboard.astro`.
    -   Osadzenie `DashboardClient` (z dyrektywą `client:load`).
5.  **Stylowanie i dopracowanie:**
    -   Ustawienie Gridu responsywnego.
    -   Dopracowanie stanów hover i focus.
6.  **Weryfikacja:**
    -   Sprawdzenie działania modalu.
    -   Sprawdzenie dodawania kolekcji (na mockach).
