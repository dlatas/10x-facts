import type {
  CollectionDto,
  CollectionsListResponseDto,
  CreateCollectionCommand,
  CreateCollectionResponseDto,
  FavoriteFlashcardDto,
  FavoritesRandomResponseDto,
} from '@/types';

interface DashboardServiceOptions {
  /**
   * Gdy true – serwis używa mocków zamiast realnych endpointów.
   * Domyślnie włącza się, jeśli nie ustawiono PUBLIC_DASHBOARD_API_MOCK=false.
   */
  mock?: boolean;
  /**
   * Bazowy URL API – domyślnie internal API w Astro.
   */
  baseUrl?: string;
  /**
   * Opcjonalny token Bearer. Middleware w projekcie mapuje go do request-scoped Supabase client.
   */
  accessToken?: string;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getDefaultMockFlag(): boolean {
  // Domyślnie mock=TRUE, bo backend dla tych endpointów może jeszcze nie istnieć (zgodnie z planem).
  const v = import.meta.env.PUBLIC_DASHBOARD_API_MOCK;
  if (typeof v !== 'string' || v.length === 0) return true;
  return v !== 'false';
}

async function fetchJson<T>(args: {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  accessToken?: string;
}): Promise<T> {
  const res = await fetch(args.url, {
    method: args.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(args.accessToken
        ? { Authorization: `Bearer ${args.accessToken}` }
        : {}),
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
  });

  if (res.ok) {
    return (await res.json()) as T;
  }

  const text = await res.text().catch(() => '');
  if (res.status === 401) throw new HttpError(401, 'Brak autoryzacji (401).');
  throw new HttpError(
    res.status,
    `Błąd API (${res.status}): ${text || res.statusText}`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function makeMockCollections(): CollectionDto[] {
  const now = new Date().toISOString();
  // system_key jest opcjonalny w DB; w mockach ustawiamy null/unikat dla systemowych.
  return [
    {
      id: 'c_1',
      name: 'Random',
      system_key: 'random_collection',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_2',
      name: 'React',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_3',
      name: 'TypeScript',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_4',
      name: 'Astro',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_5',
      name: 'CSS',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_6',
      name: 'SQL',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

function makeMockFavorites(): FavoriteFlashcardDto[] {
  return [
    {
      id: 'f_1',
      front: 'Co to jest JSX?',
      back: 'Składnia rozszerzająca JS o elementy podobne do HTML.',
      topic_id: 't_1',
    },
    {
      id: 'f_2',
      front: 'Czym jest hook?',
      back: 'Mechanizm React do używania stanu i efektów w funkcjach.',
      topic_id: 't_1',
    },
    {
      id: 'f_3',
      front: 'Co daje Astro?',
      back: 'Szybkie strony z islands architecture i SSR/SSG.',
      topic_id: 't_2',
    },
    {
      id: 'f_4',
      front: 'Tailwind – podejście?',
      back: 'Utility-first CSS dla szybkiego budowania UI.',
      topic_id: 't_3',
    },
    {
      id: 'f_5',
      front: 'RLS w Supabase?',
      back: 'Row Level Security – polityki dostępu per wiersz.',
      topic_id: 't_4',
    },
    {
      id: 'f_6',
      front: 'Zod – do czego?',
      back: 'Walidacja i inferencja typów dla danych wejściowych.',
      topic_id: 't_5',
    },
  ];
}

export function createDashboardService(opts?: DashboardServiceOptions) {
  const mock = opts?.mock ?? getDefaultMockFlag();
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  const mockCollections = makeMockCollections();
  const mockFavorites = makeMockFavorites();

  return {
    async getCollections(limit = 6): Promise<CollectionDto[]> {
      if (mock) {
        await sleep(350);
        return mockCollections.slice(0, Math.max(0, limit));
      }

      const url = `${baseUrl}/api/v1/collections?limit=${encodeURIComponent(String(limit))}`;
      const json = await fetchJson<CollectionsListResponseDto>({
        url,
        accessToken,
      });
      return Array.isArray(json.items) ? json.items : [];
    },

    async getRandomFavorites(limit = 6): Promise<FavoriteFlashcardDto[]> {
      if (mock) {
        await sleep(450);
        return mockFavorites.slice(0, Math.max(0, limit));
      }

      const url = `${baseUrl}/api/v1/flashcards/favorites/random?limit=${encodeURIComponent(String(limit))}`;
      const json = await fetchJson<FavoritesRandomResponseDto>({
        url,
        accessToken,
      });
      return Array.isArray(json.items) ? json.items : [];
    },

    async createCollection(
      command: CreateCollectionCommand
    ): Promise<CollectionDto> {
      const name = command?.name?.trim?.() ?? '';
      if (!name) throw new Error('Nazwa kolekcji nie może być pusta.');

      if (mock) {
        await sleep(500);
        const now = new Date().toISOString();
        const newItem: CollectionDto = {
          id: `c_${Date.now()}`,
          name,
          system_key: null,
          created_at: now,
          updated_at: now,
        };
        mockCollections.unshift(newItem);
        return newItem;
      }

      const url = `${baseUrl}/api/v1/collections`;
      const json = await fetchJson<CreateCollectionResponseDto>({
        url,
        method: 'POST',
        body: { name },
        accessToken,
      });
      return json;
    },

    HttpError,
  };
}
