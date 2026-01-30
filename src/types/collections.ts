import type { TablesInsert } from '@/db/database.types';
import type { ListResponse, OkResponse, SortOrder } from '@/types/common';
import type { Collection } from '@/types/entities';

export type CollectionDto = Pick<
  Collection,
  'id' | 'name' | 'system_key' | 'created_at' | 'updated_at'
> & {
  topics_count?: number;
};

export interface CollectionsListQuery {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: keyof CollectionDto;
  order?: SortOrder;
}

export type CollectionsListResponseDto = ListResponse<CollectionDto>;
export type CreateCollectionCommand = Pick<TablesInsert<'collections'>, 'name'>;
export type CreateCollectionResponseDto = CollectionDto;
export type DeleteCollectionResponseDto = OkResponse;
