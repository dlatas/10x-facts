import type {
  CollectionsListQuery,
  CollectionsListResponseDto,
  CreateCollectionCommand,
  CreateCollectionResponseDto,
  DeleteCollectionResponseDto,
} from '@/types';

interface CollectionsViewServiceOptions {
  /**
   * Gdy true – serwis używa mocków zamiast realnych endpointów.
   * Domyślnie włącza się, jeśli ustawiono PUBLIC_COLLECTIONS_API_MOCK=true.
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

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getDefaultMockFlag(): boolean {
  // Domyślnie mock=FALSE, bo endpointy kolekcji są dostępne.
  const v = import.meta.env.PUBLIC_COLLECTIONS_API_MOCK;
  if (typeof v !== 'string' || v.length === 0) return false;
  return v === 'true';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildCollectionsListUrl(args: {
  baseUrl: string;
  query: CollectionsListQuery;
}): string {
  const url = new URL(`${args.baseUrl}/api/v1/collections`, 'http://local');
  const sp = url.searchParams;

  if (typeof args.query.q === 'string' && args.query.q.length > 0) {
    sp.set('q', args.query.q);
  }
  if (typeof args.query.limit === 'number')
    sp.set('limit', String(args.query.limit));
  if (typeof args.query.offset === 'number')
    sp.set('offset', String(args.query.offset));
  if (typeof args.query.sort === 'string') sp.set('sort', args.query.sort);
  if (typeof args.query.order === 'string') sp.set('order', args.query.order);

  // URL() potrzebuje originu; na koniec bierzemy path+query
  return `${url.pathname}${url.search}`;
}

async function fetchJson<T>(args: {
  url: string;
  method?: 'GET' | 'POST' | 'DELETE';
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

  if (res.ok) return (await res.json()) as T;

  let message = res.statusText || 'Nieznany błąd.';
  const contentType = res.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await res.json().catch(() => null);
    if (payload && typeof payload === 'object') {
      const errorMessage =
        (payload as { error?: { message?: string } }).error?.message ??
        (payload as { message?: string }).message;
      if (errorMessage && typeof errorMessage === 'string') {
        message = errorMessage;
      } else {
        message = JSON.stringify(payload);
      }
    }
  } else {
    const text = await res.text().catch(() => '');
    if (text) message = text;
  }

  if (res.status === 401)
    throw new HttpError(401, message || 'Brak autoryzacji (401).');
  throw new HttpError(res.status, message);
}

function makeMockCollections(now = new Date().toISOString()) {
  return [
    {
      id: 'c_random',
      name: 'Random',
      system_key: 'random_collection',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_1',
      name: 'React',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_2',
      name: 'TypeScript',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'c_3',
      name: 'Astro',
      system_key: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function createCollectionsViewService(
  opts?: CollectionsViewServiceOptions
) {
  const mock = opts?.mock ?? getDefaultMockFlag();
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  const mockCollections = makeMockCollections();

  return {
    async getCollections(
      query: CollectionsListQuery
    ): Promise<CollectionsListResponseDto> {
      if (mock) {
        await sleep(250);
        const q = (query.q ?? '').trim();

        const filtered = q
          ? mockCollections.filter((c) =>
              c.name.toLowerCase().includes(q.toLowerCase())
            )
          : mockCollections.slice();

        const offset = Math.max(0, query.offset ?? 0);
        const limit = Math.max(1, query.limit ?? 50);
        const items = filtered.slice(offset, offset + limit);
        return { items, total: filtered.length };
      }

      const url = buildCollectionsListUrl({ baseUrl, query });
      return await fetchJson<CollectionsListResponseDto>({
        url,
        accessToken,
      });
    },

    async createCollection(
      command: CreateCollectionCommand
    ): Promise<CreateCollectionResponseDto> {
      const name = command?.name?.trim?.() ?? '';
      if (!name) throw new Error('Nazwa kolekcji nie może być pusta.');

      if (mock) {
        await sleep(400);
        if (
          mockCollections.some(
            (c) =>
              c.system_key === null &&
              c.name.toLowerCase() === name.toLowerCase()
          )
        ) {
          throw new HttpError(409, 'Kolekcja o tej nazwie już istnieje.');
        }
        const now = new Date().toISOString();
        const created = {
          id: `c_${Date.now()}`,
          name,
          system_key: null,
          created_at: now,
          updated_at: now,
        };
        mockCollections.unshift(created);
        return created;
      }

      return await fetchJson<CreateCollectionResponseDto>({
        url: `${baseUrl}/api/v1/collections`,
        method: 'POST',
        body: { name },
        accessToken,
      });
    },

    async deleteCollection(
      collectionId: string
    ): Promise<DeleteCollectionResponseDto> {
      if (!collectionId) throw new Error('Brak collectionId.');

      if (mock) {
        await sleep(350);
        const idx = mockCollections.findIndex((c) => c.id === collectionId);
        if (idx === -1) throw new HttpError(404, 'Nie znaleziono kolekcji.');
        if (mockCollections[idx]?.system_key) {
          throw new HttpError(403, 'Nie można usunąć kolekcji systemowej.');
        }
        mockCollections.splice(idx, 1);
        return { ok: true };
      }

      return await fetchJson<DeleteCollectionResponseDto>({
        url: `${baseUrl}/api/v1/collections/${encodeURIComponent(collectionId)}`,
        method: 'DELETE',
        accessToken,
      });
    },

    HttpError,
  };
}
