import * as React from 'react';

import type { CollectionDto, FavoriteFlashcardDto } from '@/types';
import { createDashboardService } from '@/lib/services/dashboard-service';

export interface DashboardDataState {
  collections: CollectionDto[];
  favorites: FavoriteFlashcardDto[];
  isLoading: boolean;
  isCreatingCollection: boolean;
  error: string | null;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.assign('/login');
}

export function useDashboardData(args?: {
  limitCollections?: number;
  limitFavorites?: number;
}) {
  const limitCollections = args?.limitCollections ?? 6;
  const limitFavorites = args?.limitFavorites ?? 6;

  const service = React.useMemo(() => createDashboardService(), []);

  const [state, setState] = React.useState<DashboardDataState>({
    collections: [],
    favorites: [],
    isLoading: true,
    isCreatingCollection: false,
    error: null,
  });

  const refreshCollections = React.useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    const collections = await service.getCollections(limitCollections);
    setState((s) => ({ ...s, collections }));
  }, [limitCollections, service]);

  const refreshFavorites = React.useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    const favorites = await service.getRandomFavorites(limitFavorites);
    setState((s) => ({ ...s, favorites }));
  }, [limitFavorites, service]);

  const refreshAll = React.useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const [collections, favorites] = await Promise.all([
        service.getCollections(limitCollections),
        service.getRandomFavorites(limitFavorites),
      ]);
      setState((s) => ({ ...s, collections, favorites, isLoading: false }));
    } catch (e) {
      const err = e as unknown;
      if (err && typeof err === 'object' && 'status' in err) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          redirectToLogin();
          return;
        }
      }
      setState((s) => ({
        ...s,
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : 'Nie udało się załadować danych.',
      }));
    }
  }, [limitCollections, limitFavorites, service]);

  const createCollection = React.useCallback(
    async (name: string) => {
      setState((s) => ({ ...s, isCreatingCollection: true, error: null }));
      try {
        await service.createCollection({ name });
        await refreshCollections();
      } catch (e) {
        const err = e as unknown;
        if (err && typeof err === 'object' && 'status' in err) {
          const status = (err as { status?: number }).status;
          if (status === 401) {
            redirectToLogin();
            return;
          }
        }
        setState((s) => ({
          ...s,
          error:
            err instanceof Error
              ? err.message
              : 'Nie udało się utworzyć kolekcji.',
        }));
      } finally {
        setState((s) => ({ ...s, isCreatingCollection: false }));
      }
    },
    [refreshCollections, service]
  );

  React.useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  return {
    ...state,
    refreshAll,
    refreshCollections,
    refreshFavorites,
    createCollection,
  };
}
