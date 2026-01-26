import type {
  CreateTopicCommand,
  CreateTopicResponseDto,
  DeleteTopicResponseDto,
  TopicsListQuery,
  TopicsListResponseDto,
} from '@/types';
import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface CollectionTopicsViewServiceOptions {
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

export function createCollectionTopicsViewService(
  opts?: CollectionTopicsViewServiceOptions
) {
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  return {
    async getTopicsInCollection(
      collectionId: string,
      query: TopicsListQuery
    ): Promise<TopicsListResponseDto> {
      if (!collectionId) throw new Error('Brak collectionId.');

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

      return await fetchJson<CreateTopicResponseDto>({
        url: `${baseUrl}/api/v1/collections/${encodeURIComponent(collectionId)}/topics`,
        method: 'POST',
        body: { name, ...(command.description !== undefined ? { description: command.description } : {}) },
        accessToken,
      });
    },

    async deleteTopic(topicId: string): Promise<DeleteTopicResponseDto> {
      if (!topicId) throw new Error('Brak topicId.');

      return await fetchJson<DeleteTopicResponseDto>({
        url: `${baseUrl}/api/v1/topics/${encodeURIComponent(topicId)}`,
        method: 'DELETE',
        accessToken,
      });
    },

    HttpError,
  };
}

