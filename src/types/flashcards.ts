import type { TablesInsert, TablesUpdate } from '@/db/database.types';
import type { ListResponse, OkResponse, SortOrder } from '@/types/common';
import type { Flashcard } from '@/types/entities';

export type FlashcardSource = Flashcard['source'] &
  ('manually_created' | 'auto_generated');

export type FlashcardDto = Pick<
  Flashcard,
  | 'id'
  | 'front'
  | 'back'
  | 'source'
  | 'is_favorite'
  | 'edited_by_user'
  | 'created_at'
  | 'updated_at'
>;

export interface FlashcardsListQuery {
  q?: string;
  is_favorite?: boolean;
  source?: FlashcardSource;
  limit?: number;
  offset?: number;
  sort?: keyof FlashcardDto;
  order?: SortOrder;
}

export type FlashcardsListResponseDto = ListResponse<FlashcardDto>;
export type CreateFlashcardCommand = Pick<
  TablesInsert<'flashcards'>,
  'front' | 'back'
>;
export type CreateFlashcardResponseDto = FlashcardDto;
export type UpdateFlashcardCommand = Pick<
  TablesUpdate<'flashcards'>,
  'front' | 'back' | 'is_favorite'
>;
export type UpdateFlashcardResponseDto = FlashcardDto;
export type DeleteFlashcardResponseDto = OkResponse;

export type FavoriteFlashcardDto = Pick<
  Flashcard,
  'id' | 'front' | 'back' | 'topic_id'
>;

export interface FavoritesRandomQuery {
  limit?: number;
}

export interface FavoritesRandomResponseDto {
  items: FavoriteFlashcardDto[];
}
