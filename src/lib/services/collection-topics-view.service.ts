import type {
  CreateTopicCommand,
  CreateTopicResponseDto,
  DeleteTopicResponseDto,
  TopicDto,
  TopicsListQuery,
  TopicsListResponseDto,
} from '@/types';
import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface CollectionTopicsViewServiceOptions {
  /**
   * Gdy true – serwis używa mocków zamiast realnych endpointów.
   * Domyślnie włącza się, jeśli ustawiono PUBLIC_COLLECTION_TOPICS_API_MOCK=true.
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

export { HttpError };

function getDefaultMockFlag(): boolean {
  const v = import.meta.env.PUBLIC_COLLECTION_TOPICS_API_MOCK;
  if (typeof v !== 'string' || v.length === 0) return false;
  return v === 'true';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildTopicsListUrl(args: {
  baseUrl: string;
  collectionId: string;
  query: TopicsListQuery;
}): string {
  const safeCollectionId = encodeURIComponent(args.collectionId);
  const url = new URL(
    `${args.baseUrl}/api/v1/collections/${safeCollectionId}/topics`,
    'http://local'
  );
  const sp = url.searchParams;

  if (typeof args.query.q === 'string' && args.query.q.length > 0) {
    sp.set('q', args.query.q);
  }
  if (typeof args.query.limit === 'number') sp.set('limit', String(args.query.limit));
  if (typeof args.query.offset === 'number')
    sp.set('offset', String(args.query.offset));
  if (typeof args.query.sort === 'string') sp.set('sort', args.query.sort);
  if (typeof args.query.order === 'string') sp.set('order', args.query.order);

  return `${url.pathname}${url.search}`;
}

function makeMockTopics(now = new Date().toISOString()): TopicDto[] {
  return [
    {
      id: 't_random',
      name: 'Random',
      description: null,
      system_key: 'random_topic',
      created_at: now,
      updated_at: now,
    },
    {
      id: 't_1',
      name: 'Podstawy',
      description: null,
      system_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 't_2',
      name: 'Zaawansowane',
      description: null,
      system_key: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function createCollectionTopicsViewService(
  opts?: CollectionTopicsViewServiceOptions
) {
  const mock = opts?.mock ?? getDefaultMockFlag();
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  const mockTopics = makeMockTopics();

  return {
    async getTopicsInCollection(
      collectionId: string,
      query: TopicsListQuery
    ): Promise<TopicsListResponseDto> {
      if (!collectionId) throw new Error('Brak collectionId.');

      if (mock) {
        await sleep(250);
        const q = (query.q ?? '').trim();
        const filtered = q
          ? mockTopics.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
          : mockTopics.slice();

        const offset = Math.max(0, query.offset ?? 0);
        const limit = Math.max(1, query.limit ?? 50);
        const items = filtered.slice(offset, offset + limit);
        return { items, total: filtered.length };
      }

      const url = buildTopicsListUrl({ baseUrl, collectionId, query });
      return await fetchJson<TopicsListResponseDto>({ url, accessToken });
    },

    async createTopic(
      collectionId: string,
      command: CreateTopicCommand
    ): Promise<CreateTopicResponseDto> {
      if (!collectionId) throw new Error('Brak collectionId.');

      const name = command?.name?.trim?.() ?? '';
      if (!name) throw new Error('Nazwa tematu nie może być pusta.');
      if (name.length > 120) throw new Error('Nazwa tematu nie może przekraczać 120 znaków.');

      if (mock) {
        await sleep(350);
        if (
          mockTopics.some(
            (t) => t.system_key === null && t.name.toLowerCase() === name.toLowerCase()
          )
        ) {
          throw new HttpError(409, 'Temat o tej nazwie już istnieje w tej kolekcji.');
        }
        const now = new Date().toISOString();
        const created: TopicDto = {
          id: `t_${Date.now()}`,
          name,
          description: command.description ?? null,
          system_key: null,
          created_at: now,
          updated_at: now,
        };
        mockTopics.unshift(created);
        return created;
      }

      return await fetchJson<CreateTopicResponseDto>({
        url: `${baseUrl}/api/v1/collections/${encodeURIComponent(collectionId)}/topics`,
        method: 'POST',
        body: { name, ...(command.description !== undefined ? { description: command.description } : {}) },
        accessToken,
      });
    },

    async deleteTopic(topicId: string): Promise<DeleteTopicResponseDto> {
      if (!topicId) throw new Error('Brak topicId.');

      if (mock) {
        await sleep(300);
        const idx = mockTopics.findIndex((t) => t.id === topicId);
        if (idx === -1) throw new HttpError(404, 'Nie znaleziono tematu.');
        if (mockTopics[idx]?.system_key) {
          throw new HttpError(403, 'Nie można usunąć tematu systemowego.');
        }
        mockTopics.splice(idx, 1);
        return { ok: true };
      }

      return await fetchJson<DeleteTopicResponseDto>({
        url: `${baseUrl}/api/v1/topics/${encodeURIComponent(topicId)}`,
        method: 'DELETE',
        accessToken,
      });
    },

    HttpError,
  };
}

