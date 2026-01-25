import * as React from 'react';

import type {
  CreateTopicCommand,
  TopicDto,
  TopicsListQuery,
  TopicsListResponseDto,
} from '@/types';
import { redirectToLogin } from '@/lib/http/redirect';
import {
  HttpError,
  createCollectionTopicsViewService,
} from '@/lib/services/collection-topics-view.service';

export type CollectionTopicsStatus = 'loading' | 'error' | 'ready';

export interface UseCollectionTopicsDataResult {
  // data
  items: TopicDto[];
  total: number;

  // list state
  status: CollectionTopicsStatus;
  errorMessage: string | null;
  retry: () => void;

  // URL-driven search
  queryDraft: string;
  setQueryDraft: (q: string) => void;
  commitQueryNow: () => void;
  committedQuery: string;

  // navigation context
  collectionName: string | null;

  // create
  isCreating: boolean;
  createError: string | null;
  submitCreate: (name: string) => Promise<TopicDto | null>;

  // delete
  isDeleting: boolean;
  deleteError: string | null;
  submitDelete: (
    topic: Pick<TopicDto, 'id' | 'system_key'>
  ) => Promise<{ ok: boolean; errorMessage: string | null }>;
}

function redirectToCollections(reason?: string): void {
  if (typeof window === 'undefined') return;
  const url = reason
    ? `/collections?reason=${encodeURIComponent(reason)}`
    : '/collections';
  window.location.assign(url);
}

function readUrlState(): { q: string; collectionName: string | null } {
  if (typeof window === 'undefined') return { q: '', collectionName: null };
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q') ?? '';
  const collectionName = url.searchParams.get('collectionName');
  return {
    q,
    collectionName:
      collectionName && collectionName.trim() ? collectionName : null,
  };
}

function writeQueryToUrl(q: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (q && q.trim()) url.searchParams.set('q', q);
  else url.searchParams.delete('q');
  window.history.replaceState(
    {},
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
}

export function useCollectionTopicsData(args: {
  collectionId: string;
  debounceMs?: number;
  defaultLimit?: number;
}): UseCollectionTopicsDataResult {
  const debounceMs = args.debounceMs ?? 350;
  const limit = args.defaultLimit ?? 50;

  const initialUrl = React.useMemo(() => readUrlState(), []);

  const service = React.useMemo(() => createCollectionTopicsViewService(), []);

  // URL-driven search: draft (input) + committed (query)
  const [queryDraft, setQueryDraft] = React.useState('');
  const [committedQuery, setCommittedQuery] = React.useState('');
  const debounceRef = React.useRef<number | null>(null);

  // data + list state
  const [items, setItems] = React.useState<TopicDto[]>([]);
  const [total, setTotal] = React.useState(0);
  const [status, setStatus] = React.useState<CollectionTopicsStatus>('loading');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // navigation context (read-once)
  const collectionName = initialUrl.collectionName;

  // create/delete state
  const [isCreating, setIsCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // init from URL
  React.useEffect(() => {
    const { q } = readUrlState();
    setQueryDraft(q);
    setCommittedQuery(q);
  }, []);

  // debounce URL sync + query commit
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const handle = window.setTimeout(() => {
      setCommittedQuery(queryDraft);
      writeQueryToUrl(queryDraft);
    }, debounceMs);
    debounceRef.current = handle;
    return () => window.clearTimeout(handle);
  }, [debounceMs, queryDraft]);

  const commitQueryNow = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setCommittedQuery(queryDraft);
    writeQueryToUrl(queryDraft);
  }, [queryDraft]);

  const refreshTopics = React.useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    const query: TopicsListQuery = {
      q: committedQuery.trim() ? committedQuery.trim() : undefined,
      limit,
      offset: 0,
      sort: 'updated_at',
      order: 'desc',
    };

    try {
      const json: TopicsListResponseDto = await service.getTopicsInCollection(
        args.collectionId,
        query
      );
      setItems(Array.isArray(json.items) ? json.items : []);
      setTotal(typeof json.total === 'number' ? json.total : 0);
      setStatus('ready');
    } catch (e) {
      const err = e as unknown;
      if (err instanceof HttpError) {
        if (err.status === 401) {
          redirectToLogin();
          return;
        }
        if (err.status === 404) {
          redirectToCollections('collection_not_found');
          return;
        }
      }
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Nie udało się załadować listy tematów.'
      );
    }
  }, [args.collectionId, committedQuery, limit, service]);

  const submitCreate = React.useCallback(
    async (name: string): Promise<TopicDto | null> => {
      const trimmed = name?.trim?.() ?? '';
      if (!trimmed) {
        setCreateError('Podaj nazwę tematu.');
        return null;
      }
      if (trimmed.length > 120) {
        setCreateError('Nazwa tematu nie może przekraczać 120 znaków.');
        return null;
      }

      setIsCreating(true);
      setCreateError(null);
      try {
        const created = await service.createTopic(args.collectionId, {
          name: trimmed,
        } satisfies CreateTopicCommand);
        await refreshTopics();
        return created;
      } catch (e) {
        const err = e as unknown;
        if (err instanceof HttpError) {
          if (err.status === 401) {
            redirectToLogin();
            return null;
          }
          if (err.status === 404) {
            redirectToCollections('collection_not_found');
            return null;
          }
          if (err.status === 409) {
            setCreateError('Temat o tej nazwie już istnieje w tej kolekcji.');
            return null;
          }
          setCreateError(err.message || 'Nie udało się utworzyć tematu.');
          return null;
        }
        setCreateError(
          err instanceof Error ? err.message : 'Nie udało się utworzyć tematu.'
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [args.collectionId, refreshTopics, service]
  );

  const submitDelete = React.useCallback(
    async (
      topic: Pick<TopicDto, 'id' | 'system_key'>
    ): Promise<{ ok: boolean; errorMessage: string | null }> => {
      if (!topic?.id) return { ok: false, errorMessage: 'Brak topicId.' };
      if (topic.system_key) {
        const msg = 'Nie można usunąć tematu systemowego.';
        setDeleteError(msg);
        return { ok: false, errorMessage: msg };
      }

      setIsDeleting(true);
      setDeleteError(null);
      try {
        await service.deleteTopic(topic.id);
        await refreshTopics();
        return { ok: true, errorMessage: null };
      } catch (e) {
        const err = e as unknown;
        if (err instanceof HttpError) {
          if (err.status === 401) {
            redirectToLogin();
            return { ok: false, errorMessage: null };
          }
          if (err.status === 403) {
            const msg = 'Nie można usunąć tematu systemowego.';
            setDeleteError(msg);
            return { ok: false, errorMessage: msg };
          }
          if (err.status === 404) {
            const msg = err.message || 'Nie znaleziono tematu.';
            setDeleteError(msg);
            return { ok: false, errorMessage: msg };
          }
          const msg = err.message || 'Nie udało się usunąć tematu.';
          setDeleteError(msg);
          return { ok: false, errorMessage: msg };
        }
        const msg =
          err instanceof Error ? err.message : 'Nie udało się usunąć tematu.';
        setDeleteError(msg);
        return { ok: false, errorMessage: msg };
      } finally {
        setIsDeleting(false);
      }
    },
    [refreshTopics, service]
  );

  React.useEffect(() => {
    void refreshTopics();
  }, [refreshTopics]);

  const retry = React.useCallback(() => {
    if (status === 'error') void refreshTopics();
  }, [refreshTopics, status]);

  return {
    items,
    total,

    status,
    errorMessage,
    retry,

    queryDraft,
    setQueryDraft,
    commitQueryNow,
    committedQuery,

    collectionName,

    isCreating,
    createError,
    submitCreate,

    isDeleting,
    deleteError,
    submitDelete,

    refreshTopics,
  };
}
