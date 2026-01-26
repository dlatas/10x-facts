import type {
  CollectionsListQuery,
  CollectionsListResponseDto,
  CreateCollectionCommand,
  CreateCollectionResponseDto,
  DeleteCollectionResponseDto,
} from '@/types';
import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface CollectionsViewServiceOptions {
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

export function createCollectionsViewService(
  opts?: CollectionsViewServiceOptions
) {
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  return {
    async getCollections(
      query: CollectionsListQuery
    ): Promise<CollectionsListResponseDto> {
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

      return await fetchJson<DeleteCollectionResponseDto>({
        url: `${baseUrl}/api/v1/collections/${encodeURIComponent(collectionId)}`,
        method: 'DELETE',
        accessToken,
      });
    },

    HttpError,
  };
}
