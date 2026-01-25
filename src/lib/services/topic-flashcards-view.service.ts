import type {
  CreateFlashcardCommand,
  CreateFlashcardResponseDto,
  DeleteFlashcardResponseDto,
  FlashcardsListQuery,
  FlashcardsListResponseDto,
  UpdateFlashcardCommand,
  UpdateFlashcardResponseDto,
} from '@/types';
import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface TopicFlashcardsViewServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

export { HttpError };

function buildFlashcardsListUrl(args: {
  baseUrl: string;
  topicId: string;
  query: FlashcardsListQuery;
}): string {
  const safeTopicId = encodeURIComponent(args.topicId);
  const url = new URL(
    `${args.baseUrl}/api/v1/topics/${safeTopicId}/flashcards`,
    'http://local'
  );
  const sp = url.searchParams;

  if (typeof args.query.q === 'string' && args.query.q.length > 0)
    sp.set('q', args.query.q);
  if (typeof args.query.is_favorite === 'boolean')
    sp.set('is_favorite', String(args.query.is_favorite));
  if (typeof args.query.source === 'string')
    sp.set('source', args.query.source);
  if (typeof args.query.limit === 'number')
    sp.set('limit', String(args.query.limit));
  if (typeof args.query.offset === 'number')
    sp.set('offset', String(args.query.offset));
  if (typeof args.query.sort === 'string') sp.set('sort', args.query.sort);
  if (typeof args.query.order === 'string') sp.set('order', args.query.order);

  return `${url.pathname}${url.search}`;
}

export function createTopicFlashcardsViewService(
  opts?: TopicFlashcardsViewServiceOptions
) {
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  return {
    async list(
      topicId: string,
      query: FlashcardsListQuery
    ): Promise<FlashcardsListResponseDto> {
      if (!topicId) throw new Error('Brak topicId.');
      const url = buildFlashcardsListUrl({ baseUrl, topicId, query });
      return await fetchJson<FlashcardsListResponseDto>({ url, accessToken });
    },

    async create(
      topicId: string,
      command: CreateFlashcardCommand
    ): Promise<CreateFlashcardResponseDto> {
      if (!topicId) throw new Error('Brak topicId.');
      return await fetchJson<CreateFlashcardResponseDto>({
        url: `${baseUrl}/api/v1/topics/${encodeURIComponent(topicId)}/flashcards`,
        method: 'POST',
        body: command,
        accessToken,
      });
    },

    async update(
      flashcardId: string,
      command: UpdateFlashcardCommand
    ): Promise<UpdateFlashcardResponseDto> {
      if (!flashcardId) throw new Error('Brak flashcardId.');
      return await fetchJson<UpdateFlashcardResponseDto>({
        url: `${baseUrl}/api/v1/flashcards/${encodeURIComponent(flashcardId)}`,
        method: 'PATCH',
        body: command,
        accessToken,
      });
    },

    async delete(flashcardId: string): Promise<DeleteFlashcardResponseDto> {
      if (!flashcardId) throw new Error('Brak flashcardId.');
      return await fetchJson<DeleteFlashcardResponseDto>({
        url: `${baseUrl}/api/v1/flashcards/${encodeURIComponent(flashcardId)}`,
        method: 'DELETE',
        accessToken,
      });
    },

    HttpError,
  };
}
