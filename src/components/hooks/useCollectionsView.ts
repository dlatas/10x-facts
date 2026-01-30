import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CollectionDto,
  CollectionsListQuery,
  CollectionsListResponseDto,
} from '@/types';
import { redirectToLogin } from '@/lib/http/redirect';
import {
  createCollectionsViewService,
  HttpError,
} from '@/lib/services/collections-view.service';
import { toast } from 'sonner';

const COLLECTIONS_QUERY_KEY = ['collections'] as const;
const RANDOM_SYSTEM_KEY = 'random_collection';
const RANDOM_COLLECTION_LABEL = 'RANDOM';

export interface CollectionsListItemVm {
  id: string;
  name: string;
  systemKey: string | null;
  isSystem: boolean;
  topicsCount: number;
  createdAt: string;
  updatedAt: string;
}

function mapDtoToVm(dto: CollectionDto): CollectionsListItemVm {
  const systemKey = dto.system_key;
  return {
    id: dto.id,
    name: systemKey === RANDOM_SYSTEM_KEY ? RANDOM_COLLECTION_LABEL : dto.name,
    systemKey,
    isSystem: systemKey != null,
    topicsCount: typeof dto.topics_count === 'number' ? dto.topics_count : 0,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

function readQueryFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  return url.searchParams.get('q') ?? '';
}

function writeQueryToUrl(q: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const next = q;

  if (next) url.searchParams.set('q', next);
  else url.searchParams.delete('q');

  window.history.replaceState(
    {},
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
}

export function useCollectionsView(args?: {
  defaultLimit?: number;
  defaultOffset?: number;
}): {
  items: CollectionsListItemVm[];
  total: number;

  status: 'loading' | 'error' | 'ready';
  errorMessage: string | null;
  retry: () => void;

  queryDraft: string;
  setQueryDraft: (v: string) => void;
  commitQueryNow: () => void;
  committedQuery: string;

  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  createError: string | null;
  submitCreate: (name: string) => Promise<void>;
  isCreating: boolean;

  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deleteTarget: CollectionsListItemVm | null;
  requestDelete: (item: CollectionsListItemVm) => void;
  confirmDelete: () => Promise<void>;
  isDeleting: boolean;
} {
  const limit = args?.defaultLimit ?? 50;
  const offset = args?.defaultOffset ?? 0;

  const queryClient = useQueryClient();
  const service = useMemo(() => createCollectionsViewService(), []);

  const [queryDraft, setQueryDraft] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const debounceRef = useRef<number | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<CollectionsListItemVm | null>(null);

  useEffect(() => {
    const initial = readQueryFromUrl();
    setQueryDraft(initial);
    setCommittedQuery(initial);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const handle = window.setTimeout(() => {
      setCommittedQuery(queryDraft);
      writeQueryToUrl(queryDraft);
    }, 300);
    debounceRef.current = handle;
    return () => window.clearTimeout(handle);
  }, [queryDraft]);

  const commitQueryNow = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setCommittedQuery(queryDraft);
    writeQueryToUrl(queryDraft);
  }, [queryDraft]);

  const listQuery = useQuery({
    queryKey: [
      ...COLLECTIONS_QUERY_KEY,
      {
        q: committedQuery,
        limit,
        offset,
      } satisfies CollectionsListQuery,
    ],
    queryFn: async (): Promise<CollectionsListResponseDto> => {
      return await service.getCollections({
        q: committedQuery.trim() ? committedQuery : undefined,
        limit,
        offset,
        sort: 'updated_at',
        order: 'desc',
      });
    },
    retry: false,
  });

  const items = useMemo(() => {
    const dtoItems = listQuery.data?.items ?? [];
    return dtoItems.map(mapDtoToVm);
  }, [listQuery.data?.items]);

  const total = listQuery.data?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return await service.createCollection({ name });
    },
    onSuccess: async () => {
      setCreateError(null);
      setCreateDialogOpen(false);
      toast.success('Utworzono kolekcję.');
      await queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof HttpError) {
        if (e.status === 401) {
          redirectToLogin();
          return;
        }
        if (e.status === 409) {
          setCreateError('Kolekcja o tej nazwie już istnieje.');
          return;
        }
        setCreateError(e.message || 'Nie udało się utworzyć kolekcji.');
        return;
      }
      setCreateError(
        e instanceof Error ? e.message : 'Nie udało się utworzyć kolekcji.'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      return await service.deleteCollection(collectionId);
    },
    onMutate: async (collectionId: string) => {
      await queryClient.cancelQueries({ queryKey: COLLECTIONS_QUERY_KEY });

      const previous = queryClient.getQueriesData<CollectionsListResponseDto>({
        queryKey: COLLECTIONS_QUERY_KEY,
      });

      queryClient.setQueriesData<CollectionsListResponseDto>(
        { queryKey: COLLECTIONS_QUERY_KEY },
        (current) => {
          if (!current) return current;
          const nextItems = (current.items ?? []).filter(
            (c) => c.id !== collectionId
          );
          return {
            ...current,
            items: nextItems,
            total: Math.max(
              0,
              (current.total ?? 0) - (current.items.length - nextItems.length)
            ),
          };
        }
      );

      return { previous };
    },
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      toast.success('Usunięto kolekcję.');
      await queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
    onError: (e) => {
      if (e instanceof HttpError) {
        if (e.status === 401) {
          redirectToLogin();
          return;
        }
        if (e.status === 403) {
          toast.error(e.message || 'Nie można usunąć kolekcji.');
          void queryClient.invalidateQueries({
            queryKey: COLLECTIONS_QUERY_KEY,
          });
          return;
        }
        if (e.status === 404) {
          toast.error(e.message || 'Nie znaleziono kolekcji.');
          void queryClient.invalidateQueries({
            queryKey: COLLECTIONS_QUERY_KEY,
          });
          return;
        }
        toast.error(e.message || 'Nie udało się usunąć kolekcji.');
        return;
      }
      toast.error(
        e instanceof Error ? e.message : 'Nie udało się usunąć kolekcji.'
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
  });

  const status: 'loading' | 'error' | 'ready' = listQuery.isLoading
    ? 'loading'
    : listQuery.isError
      ? 'error'
      : 'ready';

  const errorMessage = listQuery.isError
    ? listQuery.error instanceof Error
      ? listQuery.error.message
      : 'Nie udało się załadować kolekcji.'
    : null;

  const retry = useCallback(() => {
    if (listQuery.isError) void listQuery.refetch();
  }, [listQuery]);

  const submitCreate = useCallback(
    async (name: string) => {
      setCreateError(null);
      await createMutation.mutateAsync(name);
    },
    [createMutation]
  );

  const requestDelete = useCallback((item: CollectionsListItemVm) => {
    if (item.isSystem) return;
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
  }, [deleteMutation, deleteTarget]);

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

    createDialogOpen,
    setCreateDialogOpen,
    createError,
    submitCreate,
    isCreating: createMutation.isPending,

    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTarget,
    requestDelete,
    confirmDelete,
    isDeleting: deleteMutation.isPending,
  };
}
