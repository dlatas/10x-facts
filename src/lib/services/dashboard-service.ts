import type {
  CollectionDto,
  CollectionsListResponseDto,
  CreateCollectionCommand,
  CreateCollectionResponseDto,
  FavoriteFlashcardDto,
  FavoritesRandomResponseDto,
} from '@/types';
import { fetchJson } from '@/lib/http/fetch-json';
import { HttpError } from '@/lib/http/http-error';

interface DashboardServiceOptions {
  /**
   * Bazowy URL API – domyślnie internal API w Astro.
   */
  baseUrl?: string;
  /**
   * Opcjonalny token Bearer. Middleware w projekcie mapuje go do request-scoped Supabase client.
   */
  accessToken?: string;
}

export function createDashboardService(opts?: DashboardServiceOptions) {
  const baseUrl = opts?.baseUrl ?? '';
  const accessToken = opts?.accessToken;

  return {
    async getCollections(limit = 6): Promise<CollectionDto[]> {
      const url = `${baseUrl}/api/v1/collections?limit=${encodeURIComponent(String(limit))}&sort=updated_at&order=desc`;
      const json = await fetchJson<CollectionsListResponseDto>({
        url,
        accessToken,
      });
      return Array.isArray(json.items) ? json.items : [];
    },

    async getRandomFavorites(limit = 6): Promise<FavoriteFlashcardDto[]> {
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

      const url = `${baseUrl}/api/v1/collections`;
      const json = await fetchJson<CreateCollectionResponseDto>({
        url,
        method: 'POST',
        body: { name },
        accessToken,
      });
      return json;
    },

    async setFlashcardFavorite(args: {
      flashcardId: string;
      isFavorite: boolean;
    }): Promise<void> {
      if (!args.flashcardId) throw new Error('Brak flashcardId.');

      await fetchJson({
        url: `${baseUrl}/api/v1/flashcards/${encodeURIComponent(args.flashcardId)}`,
        method: 'PATCH',
        body: { is_favorite: args.isFavorite },
        accessToken,
      });
    },

    HttpError,
  };
}
